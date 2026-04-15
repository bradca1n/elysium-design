# Audit V7 - Agent 1: Account & Access Control

**Date:** 2026-02-12
**Auditor:** Agent 1 (Account & Access Control)
**Scope:** `AccountFacet.sol` (1,073 lines), `EligibilityFacet.sol` (401 lines), `BaseFacet.sol` (167 lines), `LibAppStorage.sol` (519 lines)

---

## Prior Finding Verification

### C-01: Multisig approval flags never enforced
**Status: FIXED** (verified)
**Evidence:** `_validateAndPropose` in `BaseFacet.sol:L109-L165` correctly routes through `proposeTransactionWithProposer` which calls `_proposeTransactionInternal`. The threshold is checked at `AccountFacet.sol:L687` via `_getRequiredThreshold`, which enforces `ownerRequiresApproval` and `operatorsRequireApproval` flags at lines 602 and 607. If approval is required and threshold is 0, it defaults to 1. The proposer auto-confirms (line 696), so a threshold of 1 with auto-confirm means immediate execution, which is correct.

### C-03: Eligibility not re-checked at execution time
**Status: FIXED** (verified)
**Evidence:** `OrderManagementFacet.sol:L309-L312` explicitly re-checks eligibility at processing time: `EligibilityFacet(address(this)).isEligible(order.investor, validationResult.classId)`. This is done for subscribe orders only, which is correct since redeem orders don't need eligibility checks.

### C-04: Eligibility missing in batch transfers
**Status: FIXED** (verified)
**Evidence:** `FundTokensFacet.sol:L434-L443` iterates all token IDs in `_safeBatchTransferFrom` and checks eligibility for each dealing/class token. Cash fund tokens are correctly exempted. `_safeTransferFrom` at lines 409-414 also checks eligibility for single transfers.

### V3-C01: `proposeTransactionWithProposer` no ACL
**Status: FIXED** (verified)
**Evidence:** `AccountFacet.sol:L653` has `onlyInternalExecution` modifier on `proposeTransactionWithProposer`. The modifier at `BaseFacet.sol:L66-L69` checks `s.internalExecutionContext`, which is only set to true by `_validateAndPropose` (BaseFacet.sol:L151) and `_executeProposal` (AccountFacet.sol:L1050). External callers cannot set this flag.

### H-01: Removed operator confirmations still count
**Status: FIXED** (verified)
**Evidence:** `AccountFacet.sol:L431-L449` in `removeOperator` iterates all pending proposals for the account, finds the removed operator's confirmations, clears the `proposalConfirmations` mapping, decrements `confirmations` count, and removes from `confirmers` array.

### H-02: Cancelled proposal confirmations not cleared
**Status: FIXED** (verified)
**Evidence:** `AccountFacet.sol:L816-L821` in `cancelProposal` iterates all confirmers, deletes their entries from `proposalConfirmations`, deletes the `confirmers` array, and sets `confirmations = 0`.

### H-08: `canExecuteFunction()` dead code
**Status: FIXED** (verified)
**Evidence:** `AccountFacet.sol:L486-L507` -- the function now has a clean flow: check basic permission, check function-specific permission if enabled, check maxAmount. No dead/unreachable branches remain, though the function has other issues noted in A1-11 from V6.

### H-11: Multisig threshold no bounds validation
**Status: FIXED** (verified)
**Evidence:** `AccountFacet.sol:L531-L532` validates `ownerRequiresApproval && ownerThreshold == 0` and `operatorsRequireApproval && operatorThreshold == 0`, reverting with `InvalidThreshold()`.

### C-12: Delegatecall boolean context -- reentrancy risk
**Status: FIXED** (verified, with caveats -- see A1-V7-01)
**Evidence:** `AccountFacet.sol:L1035-L1036` checks `reentrancyLock` before executing a proposal and sets it. Line 1057 clears it after. This prevents re-entrant proposal execution. However, the guard is only in `_executeProposal`, not at the Diamond proxy level or on direct external functions. See new finding A1-V7-01.

### PHASE5-01: No reentrancy guard at Diamond level
**Status: PARTIALLY FIXED**
**Evidence:** A `reentrancyLock` bool was added to `AppStorage` (LibAppStorage.sol:L484) and is checked in `_executeProposal` (AccountFacet.sol:L1035). However, the guard is NOT at the Diamond proxy level (Diamond.sol fallback has no reentrancy check). Direct external functions like `addOperator`, `removeOperator`, `setMultisigConfig`, `setFunctionPermission`, `cancelProposal`, `proposeTransaction`, and `confirmTransaction` do NOT check the reentrancy lock. The `_validateAndPropose` function in `BaseFacet.sol` also does not check `reentrancyLock`. See A1-V7-01.

---

## New Findings

### A1-V7-01: Reentrancy Guard Only Covers `_executeProposal`, Not All State-Modifying Entry Points

**Severity:** HIGH
**Category:** Reentrancy
**Location:** `AccountFacet.sol` lines 1033-1068, `BaseFacet.sol` lines 109-165, `Diamond.sol` fallback

**Description:**
The `reentrancyLock` is only checked and set within `_executeProposal` (AccountFacet.sol:L1035-L1057). During a proposal execution, the inner delegatecall (line 1053) may trigger ERC1155 `onERC1155Received` callbacks on recipient contracts. While re-entrant calls to `_executeProposal` are correctly blocked (the lock prevents nested execution), the following state-modifying external functions are NOT protected by the reentrancy guard:

- `addOperator()` (line 371)
- `removeOperator()` (line 402) -- modifies pending proposal confirmations
- `setMultisigConfig()` (line 527) -- can change thresholds affecting pending proposals
- `setFunctionPermission()` (line 555) -- can change per-function thresholds
- `cancelProposal()` (line 800) -- can cancel proposals
- `proposeTransaction()` (line 632) -- can create new proposals

A malicious ERC1155 recipient contract receiving tokens during proposal execution could re-enter any of these functions. The most dangerous scenario: during a subscribe order execution that mints tokens, the callback could call `setMultisigConfig` to lower the threshold, then `confirmTransaction` on a different pending proposal that would now meet the lowered threshold. While `confirmTransaction` calls `_executeProposal` which checks `reentrancyLock` (so the nested execution would be blocked), the config change itself persists after the outer transaction completes, affecting all subsequent proposals.

Additionally, `_validateAndPropose` in `BaseFacet.sol:L109-L165` does NOT check `reentrancyLock`. During reentrancy, a new proposal could be created via any facet's entry point that uses `_validateAndPropose`. If the threshold is not met (proposal requires additional confirmations), the proposal is stored without executing, which is a state mutation during reentrancy.

**Impact:** During proposal execution, a malicious ERC1155 callback could: (1) change multisig config to affect future proposal execution thresholds, (2) cancel pending proposals, (3) add/remove operators, (4) create new proposals. While nested execution is prevented, state changes to permissions and configuration persist. On a private blockchain with known validators and controlled contract recipients, the risk is lower but not zero.

**Recommendation:** Add the reentrancy check to all state-modifying external entry points. The simplest approach is to add a `nonReentrant` modifier to `BaseFacet`:

```solidity
modifier nonReentrant() {
    if (s.reentrancyLock) revert ReentrancyGuardViolation();
    _;
}
```

Apply it to: `addOperator`, `removeOperator`, `setMultisigConfig`, `setFunctionPermission`, `cancelProposal`, `proposeTransaction`, `confirmTransaction`, and all facet entry points that modify state. Alternatively, check `reentrancyLock` in the Diamond proxy's `fallback()` function before the delegatecall, but this would block all reentrant calls including view functions.

**Status:** OPEN

---

### A1-V7-02: `confirmTransaction` Recalculates Threshold from Current Config, Enabling Threshold Manipulation

**Severity:** HIGH
**Category:** Logic Error
**Location:** `AccountFacet.sol` lines 773-774, lines 687-697

**Description:**
When a proposal is created in `_proposeTransactionInternal`, the required threshold is calculated and stored in `proposal.requiredThreshold` at line 697. However, in `confirmTransaction` at line 773, the threshold is recalculated by calling `_getRequiredThreshold(proposal.accountAddress, proposal.functionSelector, proposal.proposer)` using the CURRENT multisig configuration, not the stored `proposal.requiredThreshold`.

This means that between proposal creation and confirmation, the account owner can call `setMultisigConfig` to lower the threshold, enabling a proposal to execute with fewer confirmations than originally required. Conversely, raising the threshold between creation and confirmation can permanently block proposals from executing (they can still be cancelled).

Scenario:
1. Owner creates a proposal with `operatorThreshold = 3` (stored as `requiredThreshold = 3`)
2. Owner calls `setMultisigConfig` to set `operatorThreshold = 1`
3. The proposal now only needs 1 confirmation (the proposer's auto-confirm), so any confirmer calling `confirmTransaction` triggers immediate execution

The stored `requiredThreshold` is only used for display in `_buildPendingProposal` (line 1001), not for the execution decision.

**Impact:** Account owners can retroactively lower thresholds to execute pending proposals with fewer confirmations than originally intended. While the owner already has full control, this violates the principle that multisig thresholds should be immutable per-proposal once created. In institutional settings, this undermines the audit trail -- a proposal that was created requiring 3 approvals could be executed with 1.

**Recommendation:** Use the stored `proposal.requiredThreshold` instead of recalculating in `confirmTransaction`:

```solidity
// Line 773-774 in confirmTransaction:
// BEFORE (vulnerable):
uint8 requiredThreshold = _getRequiredThreshold(proposal.accountAddress, proposal.functionSelector, proposal.proposer);
// AFTER (fixed):
uint8 requiredThreshold = proposal.requiredThreshold;
```

If dynamic threshold changes should apply to pending proposals (a deliberate design choice), document this explicitly and emit an event when pending proposal thresholds are affected by config changes.

**Status:** OPEN

---

### A1-V7-03: Deterministic Account Address Uses `block.number` -- Unpredictable and Non-Deterministic

**Severity:** HIGH
**Category:** Logic Error
**Location:** `AccountFacet.sol` lines 154-158

**Description:**
This is a reconfirmation of V6 finding A1-01, which remains unfixed. Account addresses are generated using:
```solidity
address accountAddress = address(uint160(uint256(keccak256(abi.encodePacked(
    owner, name, block.number
)))));
```

`block.number` makes the account address unpredictable before transaction inclusion. The caller cannot know the resulting account address until the transaction is mined. This prevents:
1. Pre-computing account addresses for batched setup workflows (create account + assign role + set eligibility in separate transactions that reference the account address)
2. Off-chain systems from reliably predicting account addresses for indexing

On a private blockchain with short block times, multiple `createAccount` calls for the same owner+name in the same block will deterministically produce the same address, causing the second call to revert with `AccountAlreadyExists`.

**Impact:** Account address unpredictability complicates multi-step setup workflows and off-chain integration. Same-block collisions cause denial-of-service.

**Recommendation:** Replace `block.number` with a monotonically increasing counter:
```solidity
address accountAddress = address(uint160(uint256(keccak256(abi.encodePacked(
    owner, name, s.Account[0].allAccounts.length
)))));
```

**Status:** OPEN (carried from V6 A1-01, still unfixed)

---

### A1-V7-04: Operator Can Cancel Owner-Initiated Proposals (DoS Vector)

**Severity:** HIGH
**Category:** Access Control
**Location:** `AccountFacet.sol` lines 800-826

**Description:**
This is a reconfirmation of V6 finding A1-03, which remains unfixed. The `cancelProposal` function allows ANY wallet with OPERATOR or OWNER permission on the proposal's account to cancel ANY pending proposal, regardless of who proposed it. A malicious operator can cancel all owner-initiated proposals, preventing the account from executing any multisig transactions.

The only defense is for the owner to remove the malicious operator, but the operator could re-cancel proposals before the owner can execute the removal (which itself may require multisig approval depending on config).

**Impact:** Denial of service on the account's proposal system by a single malicious operator.

**Recommendation:** Restrict `cancelProposal` to the original proposer and the account owner only:
```solidity
if (msg.sender != proposal.proposer && msg.sender != account.owner) {
    revert InsufficientPermission();
}
```

**Status:** OPEN (carried from V6 A1-03, still unfixed)

---

### A1-V7-05: `FunctionPermission.enabled = false` Allows Function Execution Without Override

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `AccountFacet.sol` lines 486-507, lines 588-596

**Description:**
The `FunctionPermission` struct has an `enabled` field (LibAppStorage.sol:L258). When `enabled = false`, the function-specific permission is ignored and the default account multisig config applies. There is no way for an account owner to explicitly DENY a specific function. Setting `enabled = true` with `threshold = 0` and `maxAmount = 0` means "use function-specific config with threshold 0 (immediate execution) and no amount limit" -- effectively making the function easier to execute, not harder.

The `canExecuteFunction` view function (line 501) checks `funcPerm.enabled` but only enforces `maxAmount`, never using the threshold. The actual execution path in `_getRequiredThreshold` (line 594) uses `funcPerm.threshold` only when both `enabled = true` and `threshold > 0`.

This means there is no mechanism to block a specific function while allowing others. An owner cannot say "operators may submit orders but NOT transfer tokens."

**Impact:** Missing deny-list functionality for per-function access control. The `FunctionPermission` system can only override thresholds upward (if `threshold > 0`) but not block functions entirely.

**Recommendation:** Add a `denied` field to `FunctionPermission`:
```solidity
struct FunctionPermission {
    uint8 threshold;
    uint256 maxAmount;
    bool enabled;
    bool denied;  // If true, function is blocked regardless of other settings
}
```
Check `denied` in `_getRequiredThreshold` and revert if true.

**Status:** OPEN

---

### A1-V7-06: No Account Freeze or Suspension Mechanism

**Severity:** MEDIUM
**Category:** Access Control
**Location:** `BaseFacet.sol` lines 109-165, `AccountFacet.sol` (entire file)

**Description:**
This is a reconfirmation of V6 finding A1-05 (combined with A1-04). There is no mechanism to:
1. Freeze/suspend a specific account to prevent all operations
2. Transfer account ownership to a new wallet
3. Deactivate/delete an account

If an account is flagged for suspicious activity, the only remedy is to revoke KYC/eligibility (preventing subscribe orders), but the account can still submit redeem orders, transfer existing tokens, and create proposals.

If an owner's private key is compromised, there is no on-chain recovery mechanism. The compromised owner has full control including the ability to add operators, change multisig config, and cancel proposals.

**Impact:** No compliance freeze capability. No key rotation or recovery. On a private blockchain, off-chain governance can mitigate this, but the contract itself provides no safety net.

**Recommendation:** Add a `frozen` flag to `AccountInfo` and check it in `_validateAndPropose`:
```solidity
if (s.Account[0].accounts[accountAddress].frozen) revert AccountFrozen();
```
Add `freezeAccount` and `unfreezeAccount` functions gated by ROLE_ADMIN.
Add `transferAccountOwnership` gated by ROLE_ADMIN or diamond owner for key rotation.

**Status:** OPEN (carried from V6 A1-04/A1-05, still unfixed)

---

### A1-V7-07: `setMultisigConfig` Does Not Validate Threshold Against Operator Count

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `AccountFacet.sol` lines 527-540

**Description:**
Reconfirmation of V6 finding A1-06, still unfixed. `setMultisigConfig` validates that threshold is non-zero when approval is required (H-11 fix) but does not check that the threshold is achievable given the current number of operators. An owner could set `operatorThreshold = 10` with only 2 operators, making operator-initiated proposals permanently unresolvable.

**Impact:** Unreachable thresholds permanently disable operator-initiated proposals. The owner can fix this by changing config, but if combined with key loss, the account becomes permanently stuck for operators.

**Recommendation:** Validate threshold against operator count:
```solidity
uint256 operatorCount = s.Account[0].accountToWallets[accountAddress].length;
if (config.operatorThreshold > operatorCount + 1) revert ThresholdTooHigh();
```

**Status:** OPEN (carried from V6 A1-06, still unfixed)

---

### A1-V7-08: Unbounded Growth of Pending Proposals Array

**Severity:** MEDIUM
**Category:** Denial of Service
**Location:** `AccountFacet.sol` lines 718, 1009-1018, 868-912

**Description:**
Reconfirmation of V6 finding A1-08, still unfixed. The `accountPendingProposals` array grows with each unresolved proposal. The `_removeProposalFromAccountPendingList` function performs O(n) linear scan. The `getPendingProposals` view function performs O(accounts * proposals) nested iteration. The `removeOperator` function also iterates all pending proposals at lines 431-449.

There is no maximum limit on pending proposals per account and no cleanup mechanism for stale proposals.

**Impact:** Gas costs for all proposal-related operations scale linearly with pending proposal count. In extreme cases, operations could hit gas limits. The `removeOperator` function is particularly vulnerable since it must iterate ALL pending proposals to clean up confirmations.

**Recommendation:** Add a maximum pending proposal limit per account (e.g., 50-100). Add a bulk cancel function for stale proposals.

**Status:** OPEN (carried from V6 A1-08, still unfixed)

---

### A1-V7-09: EligibilityFacet Tag Matching Uses OR Logic Without Documentation Clarity

**Severity:** LOW
**Category:** Logic Error
**Location:** `EligibilityFacet.sol` lines 129-143

**Description:**
The tag matching in `isAccountEligible` uses OR logic: if ANY of the class's `requiredTags` matches ANY of the investor's `tags`, the check passes. This is documented in the natspec as "OR logic: any tag matches" on line 128.

However, the nested loop structure (O(n*m) where n = required tags, m = investor tags) could be gas-expensive if either array is large. There is no bound on the size of either array. Additionally, the OR semantics may not always be what fund managers expect -- some compliance scenarios require AND logic (investor must have ALL required tags).

**Impact:** Gas inefficiency with large tag arrays. Semantic mismatch if AND logic is needed. No bound on array sizes.

**Recommendation:** Add a maximum tag count (e.g., 20). Consider offering both AND and OR modes via a boolean flag in ClassInfo.

**Status:** OPEN

---

### A1-V7-10: EligibilityFacet Uses External `this.` Calls for Same-Facet Functions

**Severity:** LOW
**Category:** Gas Optimization
**Location:** `EligibilityFacet.sol` lines 58-63, 170, 209, 280, 303

**Description:**
Reconfirmation of V6 finding A1-13, still present. The `EligibilityFacet` calls `this.isAccountEligible()` at line 63 and `this.validateClassEligibilityRequirements()` at lines 170 and 209, and `this.validateAccountAttributes()` at lines 280 and 303. These `this.` calls route through the Diamond proxy's fallback, adding unnecessary gas overhead when the called function is on the same facet.

For `isAccountEligible` at line 63, this call returns a tuple that is then returned by `isEligible`. The same result could be achieved by calling the internal implementation directly.

For `validateClassEligibilityRequirements` and `validateAccountAttributes`, these are validation functions that just check existence. They could be replaced with the internal `_requireClassExists` and `_requireAccountExists` helpers already available in `BaseFacet`.

**Impact:** Gas overhead from unnecessary proxy routing. Each `this.` call adds ~2,600 gas for the proxy fallback resolution.

**Recommendation:** Replace `this.validateClassEligibilityRequirements(classId)` with `_requireClassExists(classId)`. Replace `this.validateAccountAttributes(targetAccountAddress)` with `_requireAccountExists(targetAccountAddress)`. Replace `this.isAccountEligible(account, classId)` with an internal call.

**Status:** OPEN (carried from V6 A1-13, still unfixed)

---

### A1-V7-11: `removeOperator` Has O(n) Complexity for Confirmation Cleanup

**Severity:** LOW
**Category:** Gas Optimization
**Location:** `AccountFacet.sol` lines 431-449

**Description:**
The `removeOperator` function iterates ALL pending proposals for the account (line 432), and for each proposal, checks if the removed operator confirmed it. For each confirmed proposal, it also iterates the `confirmers` array (line 441) to remove the operator. This is O(pendingProposals * confirmersPerProposal) complexity.

With a large number of pending proposals, this function could become prohibitively expensive or hit the block gas limit.

**Impact:** Increasing gas costs as pending proposals accumulate. Could theoretically prevent operator removal if gas limit is exceeded.

**Recommendation:** Cap the number of pending proposals per account (see A1-V7-08). Alternatively, implement lazy cleanup where confirmation validity is checked at execution time rather than eagerly cleaned up on operator removal.

**Status:** OPEN

---

### A1-V7-12: `_createAccountInternal` Does Not Check If Owner Already Has an Account

**Severity:** LOW
**Category:** Logic Error
**Location:** `AccountFacet.sol` lines 144-198

**Description:**
The `_createAccountInternal` function checks if the generated `accountAddress` already exists (line 161) but does not check if the `owner` wallet already owns an account. A single wallet can own multiple accounts (each with a different name, producing different addresses due to the hash). This is supported by the `walletToAccounts` mapping which stores an array of account addresses per wallet (line 188).

While this may be intentional (allowing a single wallet to own multiple accounts for different purposes), it means there is no limit on the number of accounts a single wallet can create. Each account creation appends to `allAccounts` and `walletToAccounts` arrays.

**Impact:** Potential for unbounded account creation by a single wallet. Depending on access control (diamond owner or ADMIN role required), this may not be exploitable. However, the `allAccounts` array has no cap.

**Recommendation:** If single-wallet-multiple-accounts is intentional, document it. If not, add a check. Regardless, consider adding a maximum account count or a per-wallet account limit.

**Status:** OPEN

---

### A1-V7-13: Missing Event for Multisig Config Changes Affecting Pending Proposals

**Severity:** LOW
**Category:** Missing Events
**Location:** `AccountFacet.sol` lines 527-540

**Description:**
When `setMultisigConfig` is called, it emits `MultisigConfigUpdated` (line 539). However, this config change retroactively affects all pending proposals (see A1-V7-02 -- `confirmTransaction` recalculates threshold from current config). There is no event indicating which pending proposals are affected by the threshold change, making it difficult for off-chain systems to recalculate which proposals are now executable or permanently blocked.

**Impact:** Off-chain monitoring systems cannot easily detect when multisig config changes affect pending proposals.

**Recommendation:** Emit an additional event listing affected pending proposals, or emit a `ProposalThresholdChanged` event for each affected proposal.

**Status:** OPEN

---

### A1-V7-14: `isEligible` Function Makes Cross-Facet Call That Could Be Internal

**Severity:** INFORMATIONAL
**Category:** Gas Optimization
**Location:** `EligibilityFacet.sol` lines 51-64

**Description:**
The `isEligible` function creates an `AccountFacet` instance at line 58 using `AccountFacet(address(this))` and calls `isAccountAddress()`. Then at line 63, it calls `this.isAccountEligible()`. Both of these route through the Diamond proxy. The `isAccountEligible` function at line 73-80 creates another `AccountFacet` instance and calls `getAccount()`. This results in three proxy routing calls for a single eligibility check.

**Impact:** Gas overhead from multiple proxy-routed calls. In a hot path (called during order processing at OrderManagementFacet.sol:L311), this overhead multiplies across all orders.

**Recommendation:** Consolidate the storage access into a single internal function that reads directly from `s.Account[0].accounts[accountAddress]` instead of going through external interfaces.

**Status:** OPEN

---

### A1-V7-15: Proposal Nonce Not Validated Against Overflow

**Severity:** INFORMATIONAL
**Category:** Integer Overflow
**Location:** `AccountFacet.sol` lines 682-684

**Description:**
The account nonce (`account.nonce`) is `uint256` (LibAppStorage.sol:L284), making overflow practically impossible (would require 2^256 proposals). The nonce is used to generate unique proposal IDs. This is correctly sized and does not present a real risk.

**Impact:** None. `uint256` nonce cannot overflow in practice.

**Recommendation:** No action needed.

**Status:** OPEN (informational only)

---

# Summary Table

| ID | Severity | Title | Prior Finding |
|----|----------|-------|---------------|
| A1-V7-01 | HIGH | Reentrancy guard only covers `_executeProposal`, not all state-modifying entry points | PHASE5-01 (partially fixed) |
| A1-V7-02 | HIGH | `confirmTransaction` recalculates threshold from current config, enabling threshold manipulation | New |
| A1-V7-03 | HIGH | Deterministic account address uses `block.number` -- unpredictable and non-deterministic | V6 A1-01 (still unfixed) |
| A1-V7-04 | HIGH | Operator can cancel owner-initiated proposals (DoS vector) | V6 A1-03 (still unfixed) |
| A1-V7-05 | MEDIUM | `FunctionPermission.enabled = false` allows function execution without deny capability | New |
| A1-V7-06 | MEDIUM | No account freeze/suspension/owner-transfer mechanism | V6 A1-04/A1-05 (still unfixed) |
| A1-V7-07 | MEDIUM | `setMultisigConfig` does not validate threshold against operator count | V6 A1-06 (still unfixed) |
| A1-V7-08 | MEDIUM | Unbounded growth of pending proposals array | V6 A1-08 (still unfixed) |
| A1-V7-09 | LOW | EligibilityFacet tag matching O(n*m) with no bounds | New |
| A1-V7-10 | LOW | EligibilityFacet uses external `this.` calls for same-facet functions | V6 A1-13 (still unfixed) |
| A1-V7-11 | LOW | `removeOperator` has O(n) complexity for confirmation cleanup | New |
| A1-V7-12 | LOW | `_createAccountInternal` does not limit accounts per owner | New |
| A1-V7-13 | LOW | Missing event for multisig config changes affecting pending proposals | New |
| A1-V7-14 | INFORMATIONAL | `isEligible` makes multiple cross-facet calls that could be internal | New |
| A1-V7-15 | INFORMATIONAL | Proposal nonce uint256 overflow not a concern | New |

## Prior Finding Status

| Prior ID | Status | Evidence |
|----------|--------|----------|
| C-01 (Multisig approval flags) | FIXED | `_getRequiredThreshold` enforces approval flags |
| C-03 (Eligibility re-check) | FIXED | Re-check at OrderManagementFacet.sol:L311 |
| C-04 (Batch transfer eligibility) | FIXED | Check in `_safeBatchTransferFrom` L434-443 |
| V3-C01 (`proposeTransactionWithProposer` ACL) | FIXED | `onlyInternalExecution` modifier at L653 |
| H-01 (Removed operator confirmations) | FIXED | Cleanup loop in `removeOperator` L431-449 |
| H-02 (Cancelled proposal confirmations) | FIXED | Cleanup in `cancelProposal` L816-821 |
| H-08 (`canExecuteFunction` dead code) | FIXED | No dead branches remain |
| H-11 (Threshold bounds validation) | FIXED | `InvalidThreshold()` check at L531-532 |
| C-12 (Delegatecall reentrancy) | FIXED | `reentrancyLock` in `_executeProposal` L1035 |
| PHASE5-01 (No Diamond reentrancy guard) | PARTIALLY FIXED | Guard in `_executeProposal` only, not Diamond-level |

## Totals

- **CRITICAL:** 0
- **HIGH:** 4
- **MEDIUM:** 4
- **LOW:** 5
- **INFORMATIONAL:** 2
- **Total:** 15 findings (6 new, 7 carried from V6 unfixed, 2 partial restatements)
