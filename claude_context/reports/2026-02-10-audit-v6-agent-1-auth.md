# Audit V6 - Agent 1: Auth & Permissions

**Date:** 2026-02-10
**Auditor:** Agent 1 (Auth & Permissions)
**Scope:** `AccountFacet.sol` (1,073 lines), `EligibilityFacet.sol` (401 lines), `BaseFacet.sol` (167 lines)
**Supporting:** `LibAppStorage.sol`, `ISharedErrors.sol`, `IAccountFacet.sol`

---

## [HIGH] Deterministic Account Address Uses `block.number` Leading to Unpredictable Collisions

**ID:** A1-01
**Location:** `AccountFacet.sol:L154-L158`
**SWC:** SWC-120 (Weak Sources of Randomness from Chain Attributes)
**Description:**
Account addresses are generated using `keccak256(abi.encodePacked(owner, name, block.number))`. On a private blockchain where block times may be very short or where multiple transactions can be included in the same block, two calls with the same `owner` and `name` in the same block will produce the same `accountAddress`. While the `AccountAlreadyExists` check on line 161 prevents overwriting, it causes the second transaction to silently fail by reverting, which is a denial-of-service vector. More importantly, the use of `block.number` makes account addresses unpredictable to the caller before transaction inclusion, preventing pre-computation of account addresses for setup workflows.

**Impact:** If two admin accounts attempt to create accounts for the same owner with the same name in the same block, the second will revert. Account addresses cannot be reliably pre-computed off-chain, complicating multi-step setup flows (e.g., create account then assign manager role in a batch).

**Recommendation:** Use a monotonically increasing counter (e.g., `s.Account[0].allAccounts.length` or a dedicated nonce) instead of `block.number` to guarantee uniqueness and predictability. Alternatively, use `keccak256(abi.encodePacked(owner, name, s.Account[0].allAccounts.length))`.

---

## [HIGH] Nested `internalExecutionContext` Flag Cleared Prematurely in `_validateAndPropose`

**ID:** A1-02
**Location:** `BaseFacet.sol:L151-L153`, `AccountFacet.sol:L1050-L1057`
**SWC:** SWC-107 (Reentrancy)
**Description:**
The `_validateAndPropose` function in `BaseFacet.sol` sets `s.internalExecutionContext = true` at line 151, then delegatecalls to `proposeTransactionWithProposer`. If the proposal threshold is immediately met (threshold=0 or auto-confirmed), `_proposeTransactionInternal` calls `_executeProposal` (line 714), which itself sets `s.internalExecutionContext = true` at line 1050 and then clears it to `false` at line 1056. After the delegatecall returns to `_validateAndPropose`, line 153 sets `s.internalExecutionContext = false` again -- this is safe because both are in the same delegatecall context (shared storage). However, this pattern is fragile: the flag is a simple boolean, not a counter. If any future code path results in a nested `_validateAndPropose` call within an `execute*` function, the inner call's cleanup at line 153 would clear the flag while the outer execution still expects it to be true.

Currently, the `reentrancyLock` in `_executeProposal` prevents recursive proposal execution, so this is not exploitable today. But the design is structurally unsound.

**Impact:** Not currently exploitable due to reentrancy guard, but fragile. Future code additions that involve nested proposals could break the invariant silently.

**Recommendation:** Replace the boolean `internalExecutionContext` with a `uint256` counter that increments on entry and decrements on exit. The `onlyInternalExecution` modifier should check `counter > 0`.

---

## [HIGH] Operator Can Cancel Any Proposal on Their Account, Including Owner-Initiated Ones

**ID:** A1-03
**Location:** `AccountFacet.sol:L800-L826`
**Description:**
The `cancelProposal` function at line 800 allows any wallet with at least `Permission.NONE` (which actually checks for `!= NONE`, so `OPERATOR` or `OWNER`) on the proposal's account to cancel any proposal for that account. This means an operator can cancel proposals that were initiated by the account owner or by other operators. In a multisig context where multiple operators must coordinate, a single malicious or compromised operator can grief the system by cancelling all pending proposals.

There is no restriction that limits cancellation to the proposal's original proposer or to the account owner specifically.

**Impact:** A malicious operator can prevent all pending transactions from being executed by repeatedly cancelling them, creating a denial-of-service on the account's proposal system.

**Recommendation:** Restrict `cancelProposal` to only the proposal's original proposer or the account owner. Alternatively, require a threshold of cancellation confirmations similar to execution confirmations.

---

## [MEDIUM] No Account Deletion or Owner Transfer Mechanism

**ID:** A1-04
**Location:** `AccountFacet.sol` (entire file)
**Description:**
There is no function to transfer account ownership to a new wallet or to delete/deactivate an account. Once an account is created, the `owner` field is immutable. If an owner's private key is compromised or the owner needs to migrate to a new wallet, there is no recovery path. The `allAccounts` array is append-only with no removal mechanism.

On a private blockchain this may be partially mitigated by administrative controls, but within the smart contract system there is no remedy.

**Impact:** Lost or compromised owner keys permanently lock the account. No recovery mechanism exists within the contract.

**Recommendation:** Add an owner transfer function (gated by diamond owner or admin with multisig) and an account deactivation function that sets `exists = false` and cleans up the bidirectional registry.

---

## [MEDIUM] `ROLE_USER = bytes32(0)` Bypasses All Role Checks

**ID:** A1-05
**Location:** `BaseFacet.sol:L47, L134-L140`
**Description:**
`ROLE_USER` is defined as `bytes32(0)` at line 47. In `_validateAndPropose` at lines 134-140, the code checks `requiredRole != ROLE_USER` and if the role is `ROLE_USER`, no verification is needed. This means any account with at least `OPERATOR` permission can invoke any function that requires `ROLE_USER`. While this is by design (any authenticated user can submit orders, transfer tokens), it means there is no mechanism to revoke a specific account's ability to perform user-level actions without revoking their entire account permission.

If an account is flagged for suspicious activity, the only way to prevent them from submitting orders is to have the owner remove all operators and possibly the account itself (which is not possible, per A1-04).

**Impact:** No granular per-account action blocking for user-level operations. A flagged account can continue to submit orders and transfers.

**Recommendation:** Add a per-account "frozen" or "suspended" flag that is checked in `_validateAndPropose` before role verification. This allows admins to freeze specific accounts without removing their structural permissions.

---

## [MEDIUM] `setMultisigConfig` Does Not Validate Threshold Against Number of Operators

**ID:** A1-06
**Location:** `AccountFacet.sol:L527-L540`
**Description:**
The `setMultisigConfig` function validates that threshold is not zero when approval is required (line 531-532, H-11 fix), but it does not validate that the threshold does not exceed the number of operators on the account. An owner could set `operatorThreshold = 10` when there are only 2 operators, making it impossible for any operator-initiated proposal to ever meet the threshold.

While the owner's own threshold is their own concern (they can always change it back), setting an unreachable operator threshold effectively disables operator-initiated actions permanently until the config is changed.

**Impact:** If the owner sets a threshold higher than the operator count and then becomes unavailable, operator-initiated proposals are permanently stuck. Not critical since the owner can always change the config, but creates a footgun.

**Recommendation:** Validate that `config.operatorThreshold <= operatorCount + 1` (including the owner in the count). Alternatively, document this as a known limitation and add an event warning.

---

## [MEDIUM] Eligibility TOCTOU Between Submission and Multisig Execution

**ID:** A1-07
**Location:** `OrderManagementFacet.sol:L73-L81`, `EligibilityFacet.sol:L51-L64`
**Description:**
When a user submits an order via `submitOrder`, eligibility is checked at submission time via `OrderValidationFacet.validateOrderSubmission` (line 73). If the account has a multisig configuration requiring additional approvals, the order submission is only proposed, not executed. The `executeSubmitOrder` function re-validates at line 95, but the eligibility check happens only at submission validation, not explicitly within `executeSubmitOrder`.

However, the order processing path at `OrderManagementFacet.sol:L309-L312` does re-check eligibility (V4-C03/C04 defense). So the gap is specifically between order submission and order processing: an admin could revoke KYC/eligibility after the order is submitted but before processing, and the processing check at L311 handles this correctly.

The actual TOCTOU risk is narrower: between the validation at line 95 (executeSubmitOrder) and the actual processing at line 311, the order sits as PENDING. The processing re-check at L311 is the correct defense. This is well-handled.

**Impact:** Low in practice because order processing re-checks eligibility. The only window is between submission and processing, during which the order exists as a PENDING entry in the order book even if eligibility has been revoked. This is a design trade-off, not a vulnerability.

**Recommendation:** This is already mitigated by the re-check at processing time. Consider also checking eligibility at `confirmTransaction` time for orders, though this would add gas overhead.

---

## [MEDIUM] Unbounded Growth of `accountPendingProposals` Array

**ID:** A1-08
**Location:** `AccountFacet.sol:L718, L1009-L1018`
**Description:**
The `accountPendingProposals` array grows with each proposed transaction that requires additional confirmations (line 718). While proposals are removed when executed (line 777) or cancelled (line 823), if proposals accumulate without being executed or cancelled, the array grows unboundedly. The `_removeProposalFromAccountPendingList` function at lines 1009-1018 iterates linearly through the array to find and remove a proposal.

Additionally, `getPendingProposals` at line 868 performs nested iteration over all accounts for a wallet and all pending proposals for each account, which can become extremely gas-expensive.

**Impact:** Accumulated unresolved proposals create increasing gas costs for all proposal-related operations. In extreme cases, `confirmTransaction` and `cancelProposal` could hit gas limits.

**Recommendation:** Add a maximum pending proposal limit per account (e.g., 50). Add a cleanup function that allows the owner to bulk-cancel stale proposals. Consider using an indexed data structure for O(1) removal.

---

## [LOW] `removeOperator` Clears Confirmations but Removed Operator Can Re-Confirm via `confirmTransaction`

**ID:** A1-09
**Location:** `AccountFacet.sol:L402-L455`
**Description:**
When an operator is removed via `removeOperator`, lines 430-449 correctly clear the operator's confirmations from pending proposals (H-01 fix). However, the `confirmTransaction` function at line 760 checks permission via `s.Account[0].accountPermissions[proposal.accountAddress][msg.sender]`. Since `removeOperator` sets the permission to `NONE` at line 408, the removed operator cannot re-confirm. This is correctly handled.

However, there is a subtle issue: the `removeOperator` function does not check if the operator being removed is the proposer of any pending proposal. The proposal stores `proposal.proposer` which is used in `_getRequiredThreshold` to determine the threshold type (owner vs. operator). If the proposer is removed, the threshold calculation still uses the proposer's original role, which is correct behavior.

**Impact:** No exploitable vulnerability. The H-01 fix correctly handles confirmation cleanup. This is informational.

**Recommendation:** No action needed. The current implementation is sound.

---

## [LOW] Account Address Collision Risk with Hash Truncation

**ID:** A1-10
**Location:** `AccountFacet.sol:L154-L158`
**Description:**
The deterministic address generation truncates a `keccak256` hash to `uint160` (20 bytes). While `keccak256` produces 32 bytes, truncating to 20 bytes reduces the collision space from 2^256 to 2^160. The birthday paradox gives a 50% collision probability at approximately 2^80 accounts. With a check for `account.exists` at line 161, collisions cause reverts rather than overwrites, so this is a denial-of-service rather than a data corruption issue.

On a private blockchain with a bounded number of accounts (likely < 10,000), this is practically impossible.

**Impact:** Theoretical only. Not exploitable in practice.

**Recommendation:** No action needed for private blockchain deployment. Document the theoretical limitation.

---

## [LOW] `canExecuteFunction` Does Not Check `funcPerm.enabled` Correctly for Disabled Functions

**ID:** A1-11
**Location:** `AccountFacet.sol:L486-L507`
**Description:**
The `canExecuteFunction` view function checks `funcPerm.enabled` at line 501, and if enabled, checks `maxAmount`. However, if `funcPerm.enabled` is `true` but the intent is to disable the function entirely (there is no explicit "disabled" state -- `enabled` = `true` with `threshold = 0` and `maxAmount = 0` allows execution), the function returns `true` at line 506 as long as the wallet has any permission.

This is a view function only and is not used in the actual execution path (`_validateAndPropose` and `_getRequiredThreshold` handle the real access control). However, off-chain clients relying on `canExecuteFunction` may get incorrect results.

**Impact:** Low. View function may return misleading results. Does not affect on-chain security.

**Recommendation:** Add explicit handling for when `funcPerm.enabled` is true and `maxAmount` is 0 -- currently this means "unlimited amount" which may not be the intended semantic. Consider adding a separate `disabled` flag to `FunctionPermission`.

---

## [LOW] Missing Event for Account Creation via Diamond Owner Bootstrap

**ID:** A1-12
**Location:** `AccountFacet.sol:L104-L125`
**Description:**
When the diamond owner creates an account directly (line 112-115), the `AccountCreated` event is emitted by `_createAccountInternal` at line 197. This is correct. However, there is no `TransactionProposed` or `TransactionExecuted` event for the bootstrap path since it bypasses the proposal system. This is by design but means the audit trail is inconsistent between bootstrap and proposal-based account creation.

**Impact:** Informational. Audit trail consistency concern only.

**Recommendation:** Consider emitting a separate `AccountCreatedByOwner` event or documenting that bootstrap operations do not go through the proposal system.

---

## [LOW] EligibilityFacet Uses External `this.` Calls Creating Unnecessary Gas Overhead

**ID:** A1-13
**Location:** `EligibilityFacet.sol:L58-L63, L170, L209, L280, L303`
**Description:**
The `EligibilityFacet` makes several `this.` calls to its own functions (e.g., `this.isAccountEligible()` at line 63, `this.validateClassEligibilityRequirements()` at line 170). In a Diamond proxy, `this.` calls go through the Diamond's `fallback()` function and route back to the same facet, adding unnecessary gas overhead for the proxy routing. Internal function calls would be more efficient.

However, this pattern is common in Diamond architectures where the facet needs to call another facet's function and uses `this.` to route through the proxy. In `EligibilityFacet`, the calls at lines 170 and 209 are to the same facet's functions, so they could be internal calls.

**Impact:** Gas inefficiency. No security impact.

**Recommendation:** Replace `this.validateClassEligibilityRequirements(classId)` with direct internal calls where the called function is in the same facet.

---

## [LOW] No Validation That `setAccountManager` Target Account Has Appropriate Type

**ID:** A1-14
**Location:** `AccountFacet.sol:L964-L976`
**Description:**
The `_setAccountManagerInternal` function validates that the account exists and the fund exists, but does not validate the account type. Any account (pension, standard, etc.) can be set as a fund manager. While account types are currently informational, this creates a semantic inconsistency if certain account types are not meant to manage funds.

**Impact:** Low. Semantic inconsistency only.

**Recommendation:** Consider validating account type or documenting that any account type can be a manager.

---

## [INFORMATIONAL] `confirmations` Field Uses `uint8` Limiting to 255 Confirmers

**ID:** A1-15
**Location:** `LibAppStorage.sol:L266`
**Description:**
The `confirmations` field in `TransactionProposal` is `uint8`, limiting to 255 confirmations. The `requiredThreshold` is also `uint8`. On a private blockchain with institutional users, 255 is almost certainly sufficient, but this is a hard limit.

**Impact:** None in practice. 255 confirmations exceeds any realistic multisig configuration.

**Recommendation:** No action needed. Document the 255-confirmation limit.

---

## [INFORMATIONAL] Proposal ID Is Predictable

**ID:** A1-16
**Location:** `AccountFacet.sol:L682-L683`
**Description:**
Proposal IDs are generated as `keccak256(abi.encodePacked(accountAddress, nonce))` where `nonce` is a publicly readable counter. This makes proposal IDs predictable before creation. On a private blockchain with trusted validators, this is not exploitable. On a public chain, a front-runner could predict the proposal ID and prepare a confirmation transaction.

**Impact:** None on private blockchain. Theoretical front-running risk on public chains.

**Recommendation:** No action needed for private blockchain deployment.

---

## [INFORMATIONAL] `executeCreateAccount` First Parameter Is Unused

**ID:** A1-17
**Location:** `AccountFacet.sol:L131, L273, L952`
**Description:**
Multiple `execute*` functions have an unused first `address` parameter (the `accountAddress` passed by the proposal system). While this is required by the proposal execution ABI format (`executeFunction(address, bytes)`), the parameter is never used in the function body. For `executeCreateAccount`, the actual account address being created is encoded in `functionData`.

**Impact:** None. This is a design pattern required by the proposal system.

**Recommendation:** Add a comment explaining why the first parameter is unused (the account address is the admin's account, while the created account is in functionData).

---

# Summary Table

| ID | Severity | Title |
|----|----------|-------|
| A1-01 | HIGH | Deterministic account address uses `block.number` leading to unpredictable collisions |
| A1-02 | HIGH | Nested `internalExecutionContext` flag cleared prematurely (structurally fragile) |
| A1-03 | HIGH | Operator can cancel any proposal on their account, including owner-initiated ones |
| A1-04 | MEDIUM | No account deletion or owner transfer mechanism |
| A1-05 | MEDIUM | `ROLE_USER = bytes32(0)` bypasses all role checks with no per-account freeze |
| A1-06 | MEDIUM | `setMultisigConfig` does not validate threshold against number of operators |
| A1-07 | MEDIUM | Eligibility TOCTOU between submission and multisig execution (mitigated at processing) |
| A1-08 | MEDIUM | Unbounded growth of `accountPendingProposals` array |
| A1-09 | LOW | `removeOperator` confirmation cleanup is correct (H-01 fix verified) |
| A1-10 | LOW | Account address collision risk with hash truncation (theoretical) |
| A1-11 | LOW | `canExecuteFunction` view function may return misleading results |
| A1-12 | LOW | Missing distinct event for diamond owner bootstrap account creation |
| A1-13 | LOW | EligibilityFacet uses external `this.` calls creating unnecessary gas overhead |
| A1-14 | LOW | No validation that `setAccountManager` target account has appropriate type |
| A1-15 | INFORMATIONAL | `confirmations` field uses `uint8` limiting to 255 confirmers |
| A1-16 | INFORMATIONAL | Proposal ID is predictable (not exploitable on private chain) |
| A1-17 | INFORMATIONAL | `executeCreateAccount` first parameter is unused |

## Totals

- **CRITICAL:** 0
- **HIGH:** 3
- **MEDIUM:** 5
- **LOW:** 6
- **INFORMATIONAL:** 3
- **Total:** 17 findings
