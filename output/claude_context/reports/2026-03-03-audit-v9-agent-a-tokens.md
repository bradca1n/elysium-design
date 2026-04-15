# V9 Audit Agent A: Token & Access Control Facets

**Date:** 2026-03-03
**Scope:** FundTokensFacet.sol, AccountFacet.sol, BlockFacet.sol, BaseFacet.sol
**Context files:** LibAppStorage.sol, Constants.sol, TokenIdUtils.sol

---

## Prior Finding Verification

### 1. ARCH-01 / V8-A1-C01 — ERC1155 callback bypasses proposal system

**Status: PARTIALLY FIXED**

**Evidence:**

The single-item callback `_checkOnERC1155Received` (FundTokensFacet.sol:470-500) correctly sets `s.inExternalCallback = true` before the external call and clears it after:

```solidity
// Line 481
s.inExternalCallback = true;
try IERC1155Receiver(to).onERC1155Received(operator, from, id, value, data) returns (bytes4 response) {
    s.inExternalCallback = false;
    // ...
} catch (bytes memory reason) {
    s.inExternalCallback = false;
    // ...
}
```

The `onlyInternalExecution` modifier (BaseFacet.sol:70-74) correctly checks both flags:

```solidity
modifier onlyInternalExecution() {
    if (!s.internalExecutionContext) revert NotInternalExecution();
    if (s.inExternalCallback) revert NotInternalExecution();
    _;
}
```

**However, `_checkOnERC1155BatchReceived` (FundTokensFacet.sol:502-529) does NOT set `s.inExternalCallback = true`.** This is a critical gap. A malicious contract receiving a batch transfer can call back into any `executeXxx` function during `onERC1155BatchReceived` while `internalExecutionContext` is still true (if the batch transfer was triggered during proposal execution).

**NEW FINDING: V9-A-C01** (see below)

---

### 2. V8-A1-C02 — TokenId mutated classId to dealingId on partial fill

**Status: FIXED**

**Evidence:** The `_calculateOrderPrices` function (OrderManagementFacet.sol:1167-1183) returns all calculated IDs via the return tuple (`classId`, `dealingId`) without mutating `order.tokenId`. The `_calculateOrderResults` function (line 445-446) stores results in the `result` memory struct:

```solidity
(result.classId, result.classPrice,, result.dealingPrice, result.validationPrice) =
    _calculateOrderPrices(order.tokenId, order.orderType, result.fundPrice);
```

The `order.tokenId` storage variable is read but never written during processing.

---

### 3. V8-A1-H03 — Any operator can cancel any proposal

**Status: FIXED**

**Evidence:** AccountFacet.sol:820-825 now restricts cancellation to the account owner OR the original proposer:

```solidity
// V8-A1-H03: Only the account owner OR the original proposer may cancel.
AccountInfo storage account = s.Account[0].accounts[proposal.accountAddress];
if (msg.sender != account.owner && msg.sender != proposal.proposer) {
    revert InsufficientPermission();
}
```

An arbitrary operator with OPERATOR permission can no longer cancel proposals they did not create.

---

### 4. V8-A1-M01 — createFund/createDealing/mintMgmtFees exposed public

**Status: FIXED (FALSE POSITIVE confirmed)**

**Evidence:**
- `createFund` (FundManagementFacet.sol:44) goes through `_validateAndPropose` with `ROLE_ADMIN` (line 56-62).
- `executeCreateFund` (line 71-80) has `onlyInternalExecution whenNotBlocked`.
- `createDealing` (FundManagementFacet.sol:344) has `onlyInternalExecution`.
- `mintAllPendingManagementFees(uint256, uint32)` (FeeManagementFacet.sol:160) has `onlyInternalExecution`.
- The overload `mintAllPendingManagementFees(address, uint256)` at line 76 goes through `_validateAndPropose` with `ROLE_MANAGER`.

All three have proper access control through either the proposal system or `onlyInternalExecution`.

---

### 5. V8-A1-M03 — Multisig threshold re-computed at confirmation (retroactive lowering attack)

**Status: STILL PRESENT**

**Evidence:** In `confirmTransaction` (AccountFacet.sol:787):

```solidity
uint8 requiredThreshold = _getRequiredThreshold(
    proposal.accountAddress, proposal.functionSelector, proposal.proposer
);
if (proposal.confirmations >= requiredThreshold) {
    // Execute
}
```

The threshold is re-computed from the CURRENT multisig config at confirmation time, not the config that was in place when the proposal was created. Attack scenario:

1. Account has operatorThreshold=3
2. Proposal created, gets 1 confirmation (auto from proposer)
3. Owner changes operatorThreshold to 1
4. The next time any operator confirms (or calls confirmTransaction for retry), the proposal executes with only 1 confirmation

The stored `proposal.requiredThreshold` (set at creation time) is never checked at confirmation — it is informational only.

**Severity reassessment:** MEDIUM. The owner must actively change the config, and the owner already has full control, so this is primarily a griefing/misconfiguration risk rather than a privilege escalation.

---

### 6. V8-A1-M04 — setMultisigConfig allows threshold > operator count

**Status: FIXED**

**Evidence:** AccountFacet.sol:537-546 validates threshold against actual operator count:

```solidity
// V8-A1-M04: Validate operatorThreshold <= number of registered operators
if (config.operatorsRequireApproval && config.operatorThreshold > 0) {
    uint256 operatorCount;
    address[] storage wallets = s.Account[0].accountToWallets[accountAddress];
    for (uint256 i = 0; i < wallets.length; i++) {
        if (s.Account[0].accountPermissions[accountAddress][wallets[i]] == Permission.OPERATOR) {
            operatorCount++;
        }
    }
    if (config.operatorThreshold > operatorCount) revert InvalidThreshold();
}
```

Note: This only validates at config-set time. If operators are later removed (via `removeOperator`), the threshold could become unreachable again. However, `removeOperator` does clear confirmations from pending proposals (line 431-450), which mitigates the immediate risk. The threshold itself is not re-validated after operator removal — this is a minor gap but LOW severity since the owner can always fix by calling `setMultisigConfig` again.

---

### 7. V8-P01 — No emergency pause mechanism

**Status: FIXED**

**Evidence:** BlockFacet.sol implements both protocol-level and fund-level blocking:

- `blockProtocol` / `unblockProtocol` go through `_validateAndPropose` with `ROLE_ADMIN` (lines 36-49)
- `executeSetProtocolBlock` has `onlyInternalExecution` but intentionally omits `whenNotBlocked` to prevent deadlock (line 87)
- `executeSetFundBlock` has `onlyInternalExecution` but intentionally omits `whenNotBlocked` (line 103)
- `whenNotBlocked` modifier (BaseFacet.sol:79-81) checks `s.FundAdmin[0].protocolBlocked`
- All `executeXxx` functions across all facets have `whenNotBlocked` (confirmed via grep — 40+ functions)

**Bypass paths identified:**

1. **Fund-level blocking is defined but never enforced.** `_requireFundNotBlocked` exists in BaseFacet.sol:110 but is NEVER called anywhere in the codebase. `executeSetFundBlock` sets `s.FundAdmin[0].fundBlocked[fundId]` and `isFundBlocked` reads it, but no `executeXxx` function checks it. **NEW FINDING: V9-A-H01** (see below)

2. **ERC1155 transfers bypass `whenNotBlocked`.** `safeTransferFrom` and `safeBatchTransferFrom` are public functions without `whenNotBlocked`. During a protocol block, tokens can still be freely transferred. This may be by design (protocol block is meant for admin operations, not token transfers).

3. **`proposeTransactionWithProposer` lacks `whenNotBlocked`.** (AccountFacet.sol:667) — This is `onlyInternalExecution` (so it can only be called via `_validateAndPropose`), and `_validateAndPropose` creates a proposal that will be executed by `_executeProposal`, which calls the execute function that HAS `whenNotBlocked`. So proposals CAN be created during a block, they just cannot be executed. This seems intentional and correct.

---

### 8. V8-T01 — Dual totalSupply

**Status: STILL PRESENT (BY DESIGN)**

**Evidence:** Two separate total supply tracking mechanisms exist:
- `FundTokensStorage.totalSupply[id]` and `totalSupplyAll` — updated in `_update` (FundTokensFacet.sol:339-366)
- `FundAdminStorage.baseInfo[id].totalSupply` — updated in `_executeOrderTransfer` (OrderManagementFacet.sol:1200-1205)

These track different things:
- FundTokens tracks actual on-chain token balances (ERC1155 standard)
- FundAdmin tracks the business-logic supply for NAV and fee calculations

This dual tracking is by design for the fund administration domain. The FundAdmin supply is updated only during order processing, while FundTokens supply is updated on every mint/burn. Both should agree for dealing/class tokens, but their update paths differ.

---

### 9. V8-T03 — FundTokens[0].owner = deployer, not Diamond

**Status: STILL PRESENT**

**Evidence:** InitDiamond.sol:30 sets `s.FundTokens[0].owner = msg.sender` (deployer). There is no function to change this value. The `onlyOwner` modifier (FundTokensFacet.sol:55-58) is used only for `setLockAuthorization` (line 283).

Impact: The deployer EOA permanently controls who can lock/unlock tokens. If the deployer key is compromised, the attacker can authorize arbitrary addresses to lock tokens, enabling denial of service by locking all user balances. If the deployer key is lost, no new lock authorizations can be granted.

This should either be changeable or set to the diamond address.

---

### 10. V8-CF02 — ARCH-01 + callback chain

**Status: PARTIALLY FIXED (same gap as V8-A1-C01)**

The single callback path is fixed. The batch callback path remains vulnerable. See V9-A-C01 below.

---

## New Findings

### V9-A-C01: Batch ERC1155 callback missing inExternalCallback guard

**Severity:** CRITICAL
**Category:** Reentrancy
**Location:** `src/facets/FundTokensFacet.sol` lines 502-529

**Description:**
The `_checkOnERC1155BatchReceived` function makes an external call to `IERC1155Receiver(to).onERC1155BatchReceived()` without setting `s.inExternalCallback = true` beforehand. The single-item counterpart `_checkOnERC1155Received` correctly sets this guard (line 481), but the batch version does not. If a batch transfer is triggered during proposal execution (when `s.internalExecutionContext = true`), the receiving contract can re-enter any `executeXxx` function via `onERC1155BatchReceived` since `onlyInternalExecution` will pass — `internalExecutionContext` is true and `inExternalCallback` is false.

**Impact:**
A malicious contract receiving batch ERC1155 tokens during proposal execution can call arbitrary `executeXxx` functions, bypassing the proposal/multisig system entirely. This is the same class of attack as ARCH-01 but through the batch transfer path.

**Recommendation:**
Add the same `inExternalCallback` guard to `_checkOnERC1155BatchReceived`:

```solidity
function _checkOnERC1155BatchReceived(...) internal {
    if (to.code.length > 0) {
        s.inExternalCallback = true;
        try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, values, data) returns (bytes4 response) {
            s.inExternalCallback = false;
            if (response != IERC1155Receiver.onERC1155BatchReceived.selector) {
                revert ERC1155InvalidReceiver(to);
            }
        } catch (bytes memory reason) {
            s.inExternalCallback = false;
            if (reason.length == 0) {
                revert ERC1155InvalidReceiver(to);
            } else {
                assembly ("memory-safe") {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
        }
    }
}
```

**Status:** OPEN

---

### V9-A-H01: Fund-level blocking defined but never enforced

**Severity:** HIGH
**Category:** Access Control / Emergency Mechanism
**Location:** `src/shared/BaseFacet.sol` line 110, `src/facets/BlockFacet.sol` lines 57-71, 100-108

**Description:**
The BlockFacet allows admins to block/unblock specific funds via `blockFund()` / `unblockFund()`, and the storage `s.FundAdmin[0].fundBlocked[fundId]` is correctly set. The helper `_requireFundNotBlocked(uint256 fundId)` is defined in BaseFacet.sol:110-112. However, `_requireFundNotBlocked` is **never called** anywhere in the codebase. No `executeXxx` function checks fund-level blocking. The `whenNotBlocked` modifier only checks `protocolBlocked` (protocol-level), not `fundBlocked`.

**Impact:**
The fund-level emergency pause feature is non-functional. If an admin blocks a specific fund, all operations on that fund continue unimpeded. The admin has a false sense of security that the fund is blocked. In an emergency (e.g., discovered vulnerability in a specific fund, or a rogue fund manager), the only option is to block the entire protocol, which is a much more disruptive action.

**Recommendation:**
Add `_requireFundNotBlocked(fundId)` calls to all fund-scoped `executeXxx` functions, or create a `whenFundNotBlocked(uint256 fundId)` modifier and apply it. Alternatively, if fund-level blocking is not intended to be functional yet, remove the `blockFund`/`unblockFund` functions and storage to avoid confusion.

**Status:** OPEN

---

### V9-A-M01: Threshold not re-validated after operator removal

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/AccountFacet.sol` lines 403-456

**Description:**
When an operator is removed via `removeOperator`, the function correctly clears the operator's confirmations from pending proposals (lines 431-450). However, it does not check whether the remaining operator count still meets the configured `operatorThreshold`. If the account has operatorThreshold=3 with 3 operators, and one is removed, the threshold becomes permanently unreachable for operator-initiated proposals until the owner either adds a new operator or reduces the threshold.

**Impact:**
Operator-initiated proposals could become permanently stuck if the operator count drops below the threshold. The owner can always fix this by calling `setMultisigConfig`, so this is not a critical issue, but it could cause confusion.

**Recommendation:**
After removing an operator, either (a) automatically reduce operatorThreshold if it exceeds the new operator count, or (b) emit a warning event if the threshold becomes unreachable.

**Status:** OPEN

---

### V9-A-M02: Account address deterministic but includes block.number

**Severity:** LOW
**Category:** Design
**Location:** `src/facets/AccountFacet.sol` lines 154-158

**Description:**
The account address is derived from `keccak256(abi.encodePacked(owner, name, block.number))`. The inclusion of `block.number` means:
1. The account address is not fully deterministic from user inputs alone — it depends on which block the transaction is included in.
2. On chains with MEV, a validator could theoretically manipulate `block.number` to cause a collision (though this is practically infeasible due to the keccak256 preimage resistance).
3. If the same user creates an account with the same name in a different block, they get a different address, which may be confusing.

**Impact:**
Minor UX issue. Front-end applications cannot predict the account address before the transaction is mined. This complicates pre-computation of addresses for batch operations.

**Status:** OPEN (informational, by design)

---

### V9-A-M03: ERC1155 transfers bypass protocol block

**Severity:** MEDIUM
**Category:** Emergency Mechanism
**Location:** `src/facets/FundTokensFacet.sol` lines 194, 231

**Description:**
The `safeTransferFrom` and `safeBatchTransferFrom` functions do not check `whenNotBlocked`. During a protocol-level emergency pause, fund tokens can still be freely transferred between addresses. While `executeTransferToken` (the proposal-based path) does check `whenNotBlocked` (line 962), the direct ERC1155 transfer functions do not.

**Impact:**
During an emergency protocol block, an attacker or malicious actor can still move tokens around. If the emergency is related to a token theft or unauthorized access, the attacker has time to transfer stolen tokens before the situation is resolved. The protocol block only prevents administrative actions (order processing, NAV updates, etc.), not token movements.

**Recommendation:**
Add `whenNotBlocked` check to `safeTransferFrom` and `safeBatchTransferFrom`, or document this as an intentional design choice. Consider that blocking transfers during an emergency pause is standard practice in most token systems.

**Status:** OPEN

---

## Summary

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| V9-A-C01 | CRITICAL | NEW | Batch ERC1155 callback missing inExternalCallback guard |
| V9-A-H01 | HIGH | NEW | Fund-level blocking defined but never enforced |
| V9-A-M03 | MEDIUM | NEW | ERC1155 transfers bypass protocol block |
| V8-A1-M03 | MEDIUM | STILL PRESENT | Threshold re-computed at confirmation (retroactive lowering) |
| V9-A-M01 | LOW | NEW | Threshold not re-validated after operator removal |
| V9-A-M02 | LOW | NEW | Account address deterministic but includes block.number |
| V8-T03 | LOW | STILL PRESENT | FundTokens[0].owner = deployer, not Diamond (no setter) |

### Prior Finding Summary

| Prior ID | Verdict |
|----------|---------|
| ARCH-01 / V8-A1-C01 | PARTIALLY FIXED — single callback fixed, batch callback gap (V9-A-C01) |
| V8-A1-C02 | FIXED — uses local return values, no storage mutation |
| V8-A1-H03 | FIXED — only owner or proposer can cancel |
| V8-A1-M01 | FIXED (confirmed FALSE POSITIVE) — all have proper access control |
| V8-A1-M03 | STILL PRESENT — threshold re-computed at confirmation time |
| V8-A1-M04 | FIXED — threshold validated against operator count |
| V8-P01 | FIXED — BlockFacet implemented with protocol-level blocking |
| V8-T01 | STILL PRESENT (BY DESIGN) — dual totalSupply for different purposes |
| V8-T03 | STILL PRESENT — owner = deployer, no setter function |
| V8-CF02 | PARTIALLY FIXED — same gap as ARCH-01 batch path |
