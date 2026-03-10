# Audit V8 Agent 1: AccountFacet + OrderManagementFacet

**Date:** 2026-03-02
**Scope:** AccountFacet.sol, OrderManagementFacet.sol, BaseFacet.sol, LibAppStorage.sol
**Auditor:** Claude Opus 4.6 (Agent 1 — Auth & Orders)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2     |
| High     | 3     |
| Medium   | 4     |
| Low      | 3     |
| **Total** | **12** |

---

## Findings

### V8-A1-C01: ERC1155 Callback Bypasses Proposal System via internalExecutionContext

**Severity:** CRITICAL
**Location:** `AccountFacet.sol:1034-1072` (`_executeProposal`), `BaseFacet.sol:66-69` (`onlyInternalExecution`)
**Description:**
During `_executeProposal`, `internalExecutionContext` is set to `true` (line 1051) and `reentrancyLock` is set to `true` (line 1037). When the delegatecall triggers an ERC1155 token mint/transfer (e.g., `executeSubmitOrder` calls `FundTokensFacet.mint`), the recipient contract receives an `onERC1155Received` callback. During this callback:

1. `s.internalExecutionContext == true` (set by `_executeProposal`)
2. The recipient can directly call ANY `execute*` function on the diamond (e.g., `executeCreateAccount`, `executeProcessOrders`, `executeSetAccountManager`)
3. These functions only check `onlyInternalExecution` (line 66-69 of BaseFacet), which passes because `internalExecutionContext == true`
4. `reentrancyLock` is NOT checked by any `execute*` function — it is ONLY checked inside `_executeProposal` itself

This allows a malicious ERC1155 recipient to execute arbitrary admin operations (create accounts, set managers, process orders) without going through the proposal/multisig system.

**Impact:** Complete bypass of the multisig governance system. An attacker who receives tokens (e.g., via a subscribe order) can perform any admin operation during the callback, including granting themselves ADMIN role, creating rogue accounts, or manipulating order processing.

**Recommendation:** Add `reentrancyLock` check to the `onlyInternalExecution` modifier:
```solidity
modifier onlyInternalExecution() {
    if (!s.internalExecutionContext) revert NotInternalExecution();
    if (s.reentrancyLock) revert ReentrancyGuardViolation();
    _;
}
```
Or better: implement a diamond-wide reentrancy guard checked in the proxy fallback before `delegatecall`.

**Reference:** E-BC20, E-BC24, SWC-107

**Status:** OPEN

---

### V8-A1-C02: TokenId Mutation on Partial Fill Causes Wrong Price Calculation (E-BC22)

**Severity:** CRITICAL
**Location:** `OrderManagementFacet.sol:304` (mutation), `OrderManagementFacet.sol:1170-1173` (`_calculateOrderPrices` subscribe branch)
**Description:**
In `_processOrdersImpl`, for SUBSCRIBE orders, `order.tokenId` is permanently mutated from classId to dealingId at line 304:
```solidity
order.tokenId = dealingId;
```
This is a persistent storage write. When the same order is partially filled and processed again in a future dealing round:

1. Step 1 validation calls `_calculateOrderPrices(order.tokenId, SUBSCRIBE, fundPrice)` (line 444)
2. `order.tokenId` is now a dealingId (e.g., `0x0001_0001_0001_0001`)
3. The SUBSCRIBE branch (line 1170-1173) treats `tokenId` as `classId`: `classId = tokenId`
4. `calculateClassPrice(classId, fundPrice)` reads `s.FundAdmin[0].baseInfo[classId].dilutionRatio` — but classId is actually a dealingId with a different dilutionRatio
5. The resulting classPrice and validationPrice are WRONG, causing incorrect order amounts

**Impact:** Incorrect pricing on all partially-filled subscribe orders processed across multiple dealing rounds. Investors may receive too many or too few tokens. The error is systematic and compounding.

**Recommendation:** Store the original classId as a separate field on the Order struct (e.g., `order.originalClassId`) and always use it for price calculations. The dealingId should be stored in a separate field (e.g., `order.assignedDealingId`), not overwrite tokenId.

**Reference:** E-BC22

**Status:** STILL PRESENT — The tokenId mutation still occurs at line 304, and `_calculateOrderPrices` subscribe branch at line 1170-1173 still treats the input as classId.

---

### V8-A1-H01: Dealing Schedule Timestamps Not Validated (E-BC27)

**Severity:** HIGH
**Location:** `FundManagementFacet.sol:867-877` (`executeSetDealingSchedule`)
**Description:**
`executeSetDealingSchedule` stores the provided timestamps array directly to storage with zero validation:
```solidity
s.FundAdmin[0].funds[fundId].nextDealingTimestamps = timestamps;
```
No checks for:
- Zero timestamps
- Past timestamps (can trigger immediate state transitions)
- Sorted order (descending per pop convention)
- Duplicate timestamps
- Unbounded array length (DoS via gas exhaustion)

**Impact:** A fund manager can set past timestamps, causing the dealing state machine to enter PROCESSING immediately. Unsorted timestamps break the pop-based processing logic. Unbounded length can cause gas DoS on any function that iterates the array.

**Recommendation:** Validate all timestamps are > block.timestamp, monotonically sorted, non-zero, with a reasonable length cap (e.g., 52 for weekly dealings).

**Reference:** E-BC27

**Status:** STILL PRESENT — No validation logic has been added to `executeSetDealingSchedule`.

---

### V8-A1-H02: Performance Fee BPS Not Capped Against MAX_ADJUSTED_FEE_RATE_BPS (E-BC28 Partial)

**Severity:** HIGH
**Location:** `FeeManagementFacet.sol:637` (storage write), `OrderManagementFacet.sol:528-531` (usage), `Constants.sol:86` (cap definition)
**Description:**
The `MAX_ADJUSTED_FEE_RATE_BPS` constant (2000 = 20%) is defined in Constants.sol but never enforced anywhere. The performance fee flow is:

1. `FeeManagementFacet.calculateRedemptionFees` computes fee BPS via a calculator and stores it: `record.feeBps = feeResults[0]` (line 637)
2. `OrderManagementFacet._getStoredPerfFeeBps` reads it: `return storedFee.feeBps` (line 1151)
3. `_calculateOrderResults` applies it uncapped: `result.perfFeeValue = Math.mulDiv(result.value, perfFeeBps, BPS_DENOMINATOR)` (line 529)

While the `perfFeeBps` is no longer caller-supplied (it comes from on-chain calculation, fixing the original E-BC28 attack vector), the calculator itself has no cap. A misconfigured or buggy performance fee calculator could return BPS > 2000 or even approaching 10000 (100%), which would be stored and applied without any bound check.

**Impact:** Excessive performance fees (up to 100%) could be extracted from investors if the fee calculator produces an unexpectedly high value. The protocol's intended 20% cap is not enforced.

**Recommendation:** Add a cap check when storing the fee:
```solidity
if (feeResults[0] > Constants.MAX_ADJUSTED_FEE_RATE_BPS) revert FeeTooHigh();
record.feeBps = feeResults[0];
```
Or at consumption time in `_calculateOrderResults`.

**Reference:** E-BC28 (partially fixed — no longer caller-supplied, but still uncapped)

**Status:** PARTIALLY FIXED — perfFeeBps moved from OrderToProcess to on-chain storage (eliminating direct admin manipulation), but MAX_ADJUSTED_FEE_RATE_BPS is still never enforced at runtime.

---

### V8-A1-H03: Cancel Proposal Access Too Broad — Any Operator Can Cancel Any Proposal

**Severity:** HIGH
**Location:** `AccountFacet.sol:801-827` (`cancelProposal`)
**Description:**
The `cancelProposal` function allows any wallet with OPERATOR or OWNER permission on an account to cancel any pending proposal for that account — including proposals they did not create. This means:

1. Operator A proposes a high-value transaction (e.g., order submission)
2. Operator B (a different operator on the same account) can cancel it
3. The original proposer has no way to prevent this

While this may be intentional design (any operator can cancel), it creates a griefing vector where a malicious or compromised operator can prevent all proposals from executing by repeatedly cancelling them.

**Impact:** Denial of service on the multisig system. A single compromised operator can block all account operations by cancelling every proposal before enough confirmations are gathered.

**Recommendation:** Either restrict cancellation to the original proposer and the account owner, or add a `cancelThreshold` separate from `operatorThreshold` in the MultisigConfig.

**Reference:** SWC-105

**Status:** OPEN

---

### V8-A1-M01: Account Address Determinism Includes Block Number — Non-Deterministic Across Chains

**Severity:** MEDIUM
**Location:** `AccountFacet.sol:154-158` (`_createAccountInternal`)
**Description:**
Account address generation uses `block.number` as entropy:
```solidity
address accountAddress = address(uint160(uint256(keccak256(abi.encodePacked(
    owner, name, block.number
)))));
```
This makes account addresses:
1. Non-deterministic across chains (different block numbers)
2. Dependent on transaction inclusion timing
3. Front-runnable: a front-runner who observes the mempool can predict the account address and pre-compute actions

While collision resistance is adequate (keccak256 + 160-bit truncation), the block.number dependency means the same `(owner, name)` pair produces different addresses on different chains or in different blocks.

**Impact:** Cross-chain address consistency is impossible. Account addresses cannot be pre-computed off-chain before the transaction is mined. For a private blockchain, the mempool risk is lower but still exists for validator operators.

**Recommendation:** Remove `block.number` from the hash and use a monotonic nonce instead:
```solidity
uint256 accountNonce = s.Account[0].allAccounts.length;
address accountAddress = address(uint160(uint256(keccak256(abi.encodePacked(owner, name, accountNonce)))));
```

**Status:** OPEN

---

### V8-A1-M02: Removed Operator's Confirmations Don't Prevent Re-adding and Re-confirming

**Severity:** MEDIUM
**Location:** `AccountFacet.sol:431-450` (`removeOperator` — H-01 fix)
**Description:**
The H-01 fix correctly clears confirmations when an operator is removed (lines 431-450). However, if the same wallet is later re-added as an operator via `addOperator`, they can confirm proposals that they previously confirmed and had cleared. The proposal's `confirmers` array was cleaned, and `proposalConfirmations[pid][operator]` was set to false — so nothing prevents re-confirmation.

This creates a potential bypass: an owner removes an operator (clearing their confirmation, decrementing count), then re-adds them. The re-added operator confirms again, effectively counting as 2 confirmations from the same logical entity (once before removal, once after re-add).

**Impact:** A colluding owner could artificially inflate confirmation counts by cycling operators (add → confirm → remove → add → confirm). With threshold=2, a single operator + owner could satisfy threshold=3 through this cycling.

**Recommendation:** Track confirmations by a unique identifier that survives add/remove cycles, or prevent re-confirmation of the same proposal after re-adding.

**Status:** OPEN

---

### V8-A1-M03: Threshold Change During Pending Proposals Affects Existing Proposals

**Severity:** MEDIUM
**Location:** `AccountFacet.sol:528-541` (`setMultisigConfig`), `AccountFacet.sol:774` (`confirmTransaction`)
**Description:**
`setMultisigConfig` immediately changes the threshold for all operations. In `confirmTransaction` at line 774, the threshold is re-calculated at confirmation time:
```solidity
uint8 requiredThreshold = _getRequiredThreshold(proposal.accountAddress, proposal.functionSelector, proposal.proposer);
```
This means a proposal created with threshold=3 can be executed with only 1 confirmation if the owner changes the threshold to 1 while the proposal is pending. Conversely, a nearly-approved proposal (2/3 confirmations) can be made unexecutable by raising the threshold to 5.

**Impact:** The owner can retroactively change execution requirements for pending proposals. This could be used to:
- Lower threshold to rush through a proposal without required confirmations
- Raise threshold to permanently block proposals they regret creating

**Recommendation:** Store the required threshold at proposal creation time in the `TransactionProposal` struct (already stored as `requiredThreshold` at line 698). Use this stored value instead of re-computing at confirmation time:
```solidity
if (proposal.confirmations >= proposal.requiredThreshold) { // Use stored threshold
```
The code already stores `requiredThreshold` but then ignores it in `confirmTransaction`.

**Status:** OPEN

---

### V8-A1-M04: Missing Events for Critical State Changes in Order Processing

**Severity:** MEDIUM
**Location:** `OrderManagementFacet.sol:304` (tokenId mutation), `OrderManagementFacet.sol:367` (NAV update)
**Description:**
Several significant state changes in `_processOrdersImpl` do not emit events:
1. `order.tokenId = dealingId` (line 304) — permanent order mutation, no event
2. NAV update at line 367: `s.FundAdmin[0].funds[processData.fundId].nav = ...` — no `NavUpdated` event emitted during order processing
3. Performance fee mint to manager at line 374-381 — relies on ERC1155 Transfer event but has no specific `PerformanceFeeMinted` event

**Impact:** Off-chain monitoring systems cannot track tokenId mutations or NAV changes that happen during order processing. Audit trail is incomplete.

**Recommendation:** Emit explicit events for each state change:
- `OrderTokenIdAssigned(fundId, orderId, oldTokenId, newTokenId)`
- `NavUpdatedDuringProcessing(fundId, oldNav, newNav)`
- `PerformanceFeeMinted(fundId, manager, amount)`

**Status:** OPEN

---

### V8-A1-L01: Proposal Nonce Uses Simple Increment — No Salt/Chain ID

**Severity:** LOW
**Location:** `AccountFacet.sol:683-685`
**Description:**
Proposal IDs are generated as `keccak256(abi.encodePacked(accountAddress, nonce))` with a simple incrementing nonce. This is sufficient for on-chain uniqueness within a single chain, but proposal IDs are predictable and identical across chains if the same account state exists.

**Impact:** Low — on a private blockchain with a single deployment, this is adequate. Would become an issue for multi-chain deployments.

**Recommendation:** Include `block.chainid` in the hash for future-proofing:
```solidity
bytes32 proposalId = keccak256(abi.encodePacked(accountAddress, nonce, block.chainid));
```

**Status:** OPEN

---

### V8-A1-L02: Unbounded Loop in removeOperator Pending Proposal Cleanup

**Severity:** LOW
**Location:** `AccountFacet.sol:432-450`
**Description:**
The H-01 fix iterates over ALL pending proposals for the account (`accountPendingProposals`) and for each proposal iterates over all confirmers. For accounts with many pending proposals (e.g., 100+), this could exceed block gas limits.

The nested loop complexity is O(pending_proposals * max_confirmers_per_proposal).

**Impact:** If an account accumulates many pending proposals, `removeOperator` could become too expensive to execute, effectively preventing operator removal.

**Recommendation:** Consider a maximum pending proposal limit or lazy cleanup pattern.

**Status:** OPEN

---

### V8-A1-L03: walletToAccounts Registry Not Cleaned on Account Deletion

**Severity:** LOW
**Location:** `AccountFacet.sol:188` (push), no corresponding cleanup function
**Description:**
The `walletToAccounts` mapping is append-only. There is no function to delete an account or clean up the wallet-to-account registry. While the current system doesn't support account deletion, the `walletToAccounts[owner]` array grows unboundedly for users who create multiple accounts.

Additionally, when an operator is removed via `removeOperator`, the `walletToAccounts[operator]` array is cleaned, but there is no equivalent path for owner wallet changes.

**Impact:** Minor storage bloat. Could affect gas costs for `getAccounts` and `getPendingProposals` which iterate over `walletToAccounts`.

**Recommendation:** Either add account deletion/archival functionality or note this as a known limitation. Consider a maximum accounts-per-wallet limit.

**Status:** OPEN

---

## Catalog Pattern Verification

| Pattern | Status | Evidence |
|---------|--------|----------|
| **E-BC22** (TokenId mutation on partial fill) | **STILL PRESENT** | `order.tokenId = dealingId` at OrderManagementFacet.sol:304. `_calculateOrderPrices` subscribe branch treats input as classId at line 1170-1173. No separate classId storage. |
| **E-BC27** (Unvalidated schedule timestamps) | **STILL PRESENT** | `executeSetDealingSchedule` at FundManagementFacet.sol:867-877 stores timestamps with zero validation. |
| **E-BC28** (Uncapped caller-supplied fee BPS) | **PARTIALLY FIXED** | perfFeeBps now read from on-chain storage via `_getStoredPerfFeeBps` (eliminates direct caller manipulation). However, `MAX_ADJUSTED_FEE_RATE_BPS` is still never enforced — the stored value from the calculator has no upper bound check. |
| **E-BC16** (Public functions without access control) | **FIXED** | `proposeTransactionWithProposer` at AccountFacet.sol:654 has `onlyInternalExecution` modifier. All `execute*` functions in both AccountFacet and OrderManagementFacet have `onlyInternalExecution`. |
| **E-BC20** (ERC1155 callback reentrancy) | **STILL PRESENT** | While `reentrancyLock` prevents recursive `_executeProposal` calls, it does NOT prevent direct calls to `execute*` functions during callbacks (see V8-A1-C01). The `execute*` functions only check `onlyInternalExecution`, not `reentrancyLock`. |
| **E-BC24** (No diamond-level reentrancy guard) | **STILL PRESENT** | No diamond-level guard exists. `reentrancyLock` only protects `_executeProposal`. |

---

## Specific Check Results

### AccountFacet Checks

1. **Proposal replay:** NOT VULNERABLE — nonce-based ID generation with pre-increment (`account.nonce++` at line 685) prevents replay. Each proposal gets a unique ID.

2. **Proposal cancellation by non-creator:** FINDING V8-A1-H03 — any operator or owner can cancel any pending proposal, not just the creator.

3. **Threshold bypass mid-proposal:** FINDING V8-A1-M03 — threshold is re-computed at confirmation time, not stored. Owner can change threshold to bypass multisig.

4. **Account takeover (owner removal by operator):** NOT VULNERABLE — `removeOperator` requires `onlyAccountOwner` modifier. Operators cannot remove the owner or other operators. Only the owner can manage operators.

5. **Wallet-account multi-association:** NOT EXPLOITABLE — a wallet can be associated with multiple accounts via `walletToAccounts`. This is by design (one wallet can be operator on multiple accounts). No direct exploit vector identified.

6. **`proposeTransactionWithProposer` access control (E-BC16):** FIXED — has `onlyInternalExecution` modifier at line 654.

7. **`_executeProposal` reentrancy:** FINDING V8-A1-C01 — reentrancyLock blocks recursive _executeProposal but NOT direct execute* calls during ERC1155 callbacks.

### OrderManagementFacet Checks

1. **E-BC22 (tokenId mutation):** STILL PRESENT — see V8-A1-C02.

2. **E-BC27 (schedule timestamps):** STILL PRESENT — see V8-A1-H01.

3. **E-BC28 (perfFeeBps cap):** PARTIALLY FIXED — see V8-A1-H02. No longer caller-supplied, but no cap enforcement.

4. **E-BC05 (order timing):** ENFORCED — `_validateOrderPreconditions` checks `block.timestamp < order.dueDate` at line 431. Order submission creates dueDate from notice period. `dealingProcessState` check ensures PROCESSING state before processing.

5. **Partial fill logic:** FUNCTIONAL but see V8-A1-C02 for pricing error on partial fills. `filledAmount` tracking via `processingHistory` is correct. Dust tolerance via `ROUND_TOLERANCE` at line 569.

6. **Cancel order after processing:** SAFE — `executeCancelOrder` validates via `OrderValidationFacet.validateOrderCancellation` which checks status is PENDING. Filled/partially-filled orders with non-PENDING status cannot be cancelled.

7. **Swap order manipulation:** NO DIRECT VULNERABILITY — swap order IDs are computed from `orderBook[fundId].tail` at submission time (lines 1310-1311). The dependent order linking uses these pre-computed IDs. However, the `tail` value is predictable, so an attacker who front-runs could claim the expected order ID. On a private blockchain, this risk is limited.

8. **`executeCancelOrder` access control (E-BC16):** FIXED — has `onlyInternalExecution` modifier at line 146.

---

*Report generated 2026-03-02 by Claude Opus 4.6 (Audit V8, Agent 1)*
