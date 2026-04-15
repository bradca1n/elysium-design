<!-- ~2400 tokens -->
# Blockchain Error Catalog

Smart contract pitfalls specific to the Elysium Solidity codebase (Diamond Proxy, Foundry, Gemforge).

## E-BC01: Using `via_ir` to Fix Stack-Too-Deep
- **Pattern:** Enabling `via_ir = true` in `foundry.toml` to work around "stack too deep" compiler errors.
- **Fix:** NEVER enable `via_ir`. Use scoping blocks `{ }` to limit variable lifetime, reduce local variables, or pack values into structs.

## E-BC02: Using String Errors Instead of Custom Errors
- **Pattern:** Writing `require(condition, "Some message")` or `revert("Some message")` with string literals.
- **Fix:** Always use custom errors defined in `src/interfaces/ISharedErrors.sol` or the relevant facet interface. Example: `if (!condition) revert InsufficientBalance();`.

## E-BC03: Hardcoded Magic Numbers
- **Pattern:** Using literal numbers like `1e18`, `10000`, `31536000` directly in facet or library code.
- **Fix:** All constants must be defined in `src/libs/Constants.sol` and referenced by name (e.g., `Constants.PRECISION`, `Constants.BPS_DENOMINATOR`).

## E-BC04: Dealing ID Off-By-One
- **Pattern:** Using `< nextDealingId` when iterating dealings, or treating `nextDealingId` as the ID of the next dealing to be created.
- **Semantics:** `ClassInfo.nextDealingId` starts at 0. `createDealing()` pre-increments then uses the value:
  ```solidity
  classes[classId].nextDealingId++;           // 0 → 1
  dealingId = toDealingTokenId(classId, nextDealingId);  // uses 1
  ```
  So `nextDealingId` equals the **last created dealing ID**, not the next one.
- **Fix:** When iterating existing dealings: `for (d = 1; d <= nextDealingId; d++)`. Never use `< nextDealingId`.

## E-BC05: Wrong Order Timing in Tests
- **Pattern:** Warping to the dealing timestamp BEFORE submitting orders, or submitting orders AFTER the dealing window has passed.
- **Fix:** The correct pattern is: `setDealingSchedule` -> `submitOrder` -> `vm.warp(timestamp + 1)` -> `updateNav` -> `processOrders`. Orders must be submitted BEFORE warping.

## E-BC06: Forgetting `gemforge build` After Changing Facet Signatures
- **Pattern:** Adding, removing, or modifying a facet function signature and then running tests without regenerating `IDiamondProxy.sol`. Tests fail with missing function errors.
- **Fix:** Run `yarn dlx gemforge build` after any facet function signature change. This regenerates `src/generated/IDiamondProxy.sol`.

## E-BC07: Confusing Fund vs Class Dilution Direction
- **Pattern:** Assuming both fund and class dilution move in the same direction when costs are applied.
- **Fix:** Fund dilution goes DOWN for costs (compensating all classes). Class dilution goes UP for costs (charging the specific class). They move in opposite directions.

## E-BC08: Wrong `classes()` Destructuring
- **Pattern:** Destructuring fewer or more than 7 return values from `diamond.classes(classId)`, or getting the order wrong.
- **Fix:** Always check the current `ClassInfo` struct definition in `LibAppStorage.sol` and destructure all values in order. ClassInfo layout changes over time — always verify against the struct before writing test helpers.

## E-BC09: Cash Token Per-Umbrella Not Per-Fund Confusion
- **Pattern:** Creating or looking up cash tokens scoped to a fund ID instead of an umbrella ID.
- **Fix:** Cash tokens are per-umbrella per-currency, NOT per-fund. Use `TokenIdUtils.createCashFundTokenId(umbrellaId, currencyISO)`.

## E-BC10: Role-Scoped Access Confusion
- **Pattern:** Checking `ROLE_MANAGER` in the global roles mapping, or checking `ROLE_ADMIN` per-fund.
- **Fix:** `ROLE_MANAGER` is scoped per-fund (checked via `funds[fundId].manager == accountAddress`). All other roles (`ROLE_ADMIN`, `ROLE_NAV_UPDATER`, `ROLE_FX_UPDATER`, `ROLE_SETTLEMENT`) are global.

## E-BC11: EIP-170 Contract Size Limit
- **Pattern:** Adding more view functions or logic to a facet until it exceeds 24KB, causing deployment failure.
- **Fix:** If a facet approaches the 24KB limit, split view functions into a separate facet. See the `OrderManagementFacet` / `OrderValidationFacet` split as the established pattern.

## E-BC12: Storage Layout Modification
- **Pattern:** Reordering, removing, or inserting fields in the middle of storage structs in `LibAppStorage.sol`.
- **Fix:** Storage structs are append-only. Never reorder or remove fields. Only add new fields at the end of the struct.

## E-BC13: Always Run `forge test` During Audits
- **Pattern:** Auditor reviews code manually but never runs existing tests to check coverage gaps and baseline passing status.
- **Fix:** Run `forge test -vv --gas-report` as Phase 1 of any audit. Untested functions need higher scrutiny. Failing tests indicate known issues.

## E-BC14: Cross-Facet Interactions Are Highest-Risk
- **Pattern:** Per-facet review finds individual issues but misses vulnerabilities that only appear when combining operations across facets (e.g., RBAC bypass via AccountFacet + FundManagementFacet, dual totalSupply via FundTokensFacet + OrderManagementFacet + FeeManagementFacet).
- **Fix:** After per-facet review, use `sequential-thinking` MCP to reason about multi-step attack chains that span facet boundaries. Map the call graph first.

## E-BC15: Forced/Admin Operations Often Bypass Safety Checks
- **Pattern:** "Force" operations (forced redemption, bulk cancel, admin override) skip safety checks that normal operations enforce (lock periods, class status, eligibility, dealing lock). These bypasses compound across the codebase.
- **Fix:** For every force/admin path, verify it checks the SAME invariants as the normal path, or explicitly documents which checks are intentionally skipped and why.

## E-BC16: Public Functions Without Access Control in Diamond Facets
- **Pattern:** Marking a function `public` or `external` in a Diamond facet without an access control modifier. Since ALL public/external functions on a facet are exposed through the Diamond proxy, any address can call them. Functions intended for internal use only (called by other facets via delegatecall) are still externally callable.
- **Examples:** `proposeTransactionWithProposer` (AccountFacet), `mintAllPendingManagementFees(uint256,uint32)` (FeeManagementFacet), `createFund` (FundManagementFacet), `createDealing` (FundManagementFacet).
- **Fix:** Every state-modifying function on a facet MUST have either `onlyInternalExecution`, `onlyOwnerDiamond`, or go through `_validateAndPropose`. If a function is meant for internal-only delegatecall, mark it `internal` or add the modifier.

## E-BC17: FX Rate Deviation Check Comparing Wrong Quantities
- **Pattern:** Validating a cross-rate (e.g., EUR→GBP) by comparing it against a single-currency-vs-USD rate (e.g., EUR/USD). These are fundamentally different quantities with different scales.
- **Fix:** Compute the reference cross-rate from two USD-based rates: `crossRate = quoteVsUSD * PRECISION / baseVsUSD`, then compare the deviation of the provided rate against this computed reference.

## E-BC18: Safety Config "Disabled at Zero" Anti-Pattern
- **Pattern:** Safety validation checks like `if (config.maxNavChangeBps > 0) { validate... }` that skip validation entirely when the config value is 0. This means setting any safety parameter to 0 silently disables the safety check without any warning or additional authorization.
- **Fix:** Either require non-zero safety parameters, emit a distinct warning event when a safety check is disabled, or require a higher authorization level (e.g., diamond owner vs. admin) to disable safety checks.

## E-BC19: Dual State Tracking Across Facets
- **Pattern:** Maintaining the same logical value (e.g., totalSupply) in two separate storage locations, updated by different code paths. Diamond facets that write to shared storage can easily diverge.
- **Example:** `FundTokensStorage.totalSupply[id]` vs `FundAdminStorage.baseInfo[id].totalSupply` — one updated by ERC1155 mint/burn, the other by order processing/fee minting.
- **Fix:** Consolidate to a single source of truth. If two facets need the same data, one should read from the other's storage rather than maintaining a copy.

## E-BC20: ERC1155 Callback Reentrancy in Diamond Proxy
- **Pattern:** Diamond facet functions that mint/transfer ERC1155 tokens trigger `onERC1155Received` callbacks on recipient contracts. During the callback, the Diamond's storage state is mid-update (e.g., `internalExecutionContext == true`, `cashPendingSwap` not yet decremented). A malicious recipient can re-enter any facet function.
- **Example:** `SettlementFacet._settleSubscribe` mints cash tokens before decrementing `cashPendingSwap`. Callback re-enters settlement → double-mint.
- **Fix:** Apply checks-effects-interactions: update ALL storage state BEFORE making external calls (mint/transfer). Add a Diamond-level reentrancy guard (storage slot checked in proxy fallback).

## E-BC21: Checks-Effects-Interactions Violation in Settlement
- **Pattern:** Settlement operations perform token operations (unlock → burn → mint → lock) in sequence, where the mint triggers an external callback. State like `cashPendingSwap` is decremented AFTER the sequence, not before.
- **Fix:** Decrement `cashPendingSwap` FIRST, then perform token operations. If the transaction reverts, the decrement rolls back safely.

## E-BC22: TokenId Storage Mutation on Partial Fill
- **Pattern:** Subscribe orders have their `tokenId` field permanently mutated from classId to dealingId during first processing (`order.tokenId = dealingId`). On subsequent partial fills, `_calculateOrderPrices` treats the dealingId as a classId, reading the wrong dilutionRatio for price calculation.
- **Fix:** Store the original classId separately and always use it for price calculation. The dealingId should be a derived field, not a mutation of tokenId.

## E-BC23: Cross-Rate vs Single-Rate FX Validation
- **Pattern:** Validating an FX cross-rate (e.g., EUR→GBP) by comparing it against a single-currency USD rate (e.g., EUR→USD). These are fundamentally different quantities. The deviation check is mathematically meaningless.
- **Example:** `validateFxRateDeviation(sourceCurrency, crossRate)` compares `crossRate` against `fxRegistry[sourceCurrency].rateVsUSD`.
- **Fix:** Compute the expected cross-rate from both currencies' USD rates, then validate deviation against that: `expectedCrossRate = rateA / rateB; validateDeviation(actualRate, expectedCrossRate)`.

## E-BC24: No Diamond-Level Reentrancy Guard
- **Pattern:** Diamond Proxy implementations without a storage-based reentrancy guard. The `internalExecutionContext` boolean only guards `execute*` functions, not all state-modifying entry points. Functions like `createFund`, `createDealing`, `mintAllPendingManagementFees` have no reentrancy protection.
- **Fix:** Add OpenZeppelin's `ReentrancyGuard` adapted for Diamond storage. Check in the proxy fallback BEFORE `delegatecall`.

## E-BC25: Dual totalSupply Divergence
- **Pattern:** Maintaining two independent totalSupply trackers (`FundTokensStorage.totalSupply` and `FundAdminStorage.baseInfo.totalSupply`) that must stay in sync but diverge during fee minting, performance fee processing, and settlement. Fee minting to the fee class updates FundTokens but not always baseInfo.
- **Fix:** Either unify to a single source of truth, add a hook inside `FundTokensFacet._update()` that auto-syncs baseInfo for fund/class/dealing token IDs, or at minimum add a post-NAV assertion that both values match.

## E-BC26: FX Safety Config Default-Zero Bypass
- **Pattern:** Safety configuration structs that default to zero (e.g., `maxFxRateDeviation=0`, `maxFxRateAge=0`) and where zero means "disabled". A deployment that forgets to set safety config has no FX validation at all. Combined with `actualFxRate=0` resolving to PRECISION (1:1), the entire FX safety framework can be bypassed.
- **Fix:** Either set non-zero defaults in InitDiamond, or treat zero config values as "use protocol-wide maximums" rather than "disabled".

## E-BC27: Unvalidated Schedule Timestamps
- **Pattern:** `setDealingSchedule` accepts arbitrary `uint32[]` timestamps stored directly to storage with no validation (past, unsorted, zero, duplicates, unbounded length). Past timestamps trigger immediate state transitions that can lock the dealing state machine permanently.
- **Fix:** Validate: all timestamps > block.timestamp, monotonically sorted (descending per pop convention), non-zero, reasonable array length cap.

## E-BC28: Uncapped Caller-Supplied Fee BPS
- **Pattern:** Performance fee BPS passed by admin in `OrderToProcess` struct is only checked against `BPS_DENOMINATOR` (10000), allowing 100% fee extraction. The protocol's `MAX_ADJUSTED_FEE_RATE_BPS` constant exists but is never enforced at runtime.
- **Fix:** Enforce the protocol cap at order processing time: `if (perfFeeBps > MAX_ADJUSTED_FEE_RATE_BPS) revert FeeTooHigh();`

## E-BC29: NAV Update Stale Data Cascade
- **Pattern:** `_updateNavInternal` processes adjustments and mints fees BEFORE storing the new NAV. All intermediate calculations (fee amounts, dilution ratios, class prices) use the old NAV, creating systematic pricing errors that compound across classes and NAV cycles.
- **Fix:** Store the new NAV first, then process adjustments and fees using the updated values.

## E-BC30: ERC1155 Callback Bypasses execute* Access Control (ARCH-01)
- **Pattern:** Any `execute*` function guarded by `onlyInternalExecution` is callable from within an ERC1155 `onERC1155Received` callback because `s.internalExecutionContext == true` during ALL `execute*` call frames. A smart contract investor receiving minted tokens can call `executeAddOperator`, `executeSetMultisigConfig`, `executeCreateFund`, etc. from the callback — bypassing the proposal/multisig system entirely. The `reentrancyLock` only guards `_executeProposal`, NOT direct `execute*` entry points.
- **Fix:** Add `if (s.reentrancyLock) revert ReentrancyDetected();` check inside `onlyInternalExecution`. Or implement a Diamond-level reentrancy guard in the proxy fallback function that sets a lock flag before any delegatecall.
- **Affected paths:** Any ERC1155 mint to a contract recipient — order processing, fee minting, onramp, settlement.
- **Severity history:** CRITICAL. Present in V3→V4→V5→V6→V7→V8 (unfixed across 6 audits).

## E-BC31: Risk Adjustor Fail-Open Design
- **Pattern:** `staticcall` to the risk adjustor silently returns zero/original gain if the call fails (adjustor removed from Diamond, adjustor reverts, adjustor returns malformed data). Zero risk factor means the dealing proceeds as if no risk adjustment is needed — silently bypassing an intended safety check.
- **Locations:** (1) `NavManagementFacet` — fail-open returns zero; (2) `PerfFeeStandardFacet._applyRiskAdjustor` (line 140-156) — fail-open returns original `gain` unchanged. **Both instances share the same root pattern and both are OPEN.**
- **Fix:** Change to fail-closed: if `staticcall` fails (success == false) AND `riskAdjustorSelector != bytes4(0)`, revert with a clear error. Provide an admin override (`ROLE_ADMIN` can force-continue with explicit zero) for cases where the adjustor is intentionally removed.
- **Related:** V8-CF01 — adjustor fail-open combines with dealing state deadlock; V8-PFS-01 — second instance; V8-CF03 — amplifies dual totalSupply feedback loop.

## E-BC32: No Emergency Pause Mechanism
- **Pattern:** No facet in the Diamond implements a `Pausable` pattern. In the event of an active exploit (ARCH-01, FX manipulation, dual-supply divergence), the only on-chain recourse is a Diamond cut upgrade, which itself requires multisig quorum. If the multisig is compromised (see ARCH-01), there is no emergency stop.
- **Fix:** Add `Pausable` storage to `LibAppStorage` (single `bool paused` flag). Add `whenNotPaused` modifier to all state-modifying external functions. Expose `pause()`/`unpause()` behind `onlyDiamondOwner`. Consider a fast-path pause (1-of-N threshold, any operator) vs full-pause (owner only).

## E-BC33: abi.decode Panic on Unvalidated Byte Parameters
- **Pattern:** Facets store raw `bytes` parameters (e.g., `perfFeeParams`) in storage without validating the length matches the expected `abi.decode` schema. When the stored bytes are empty or too short, `abi.decode` panics with a low-level revert (not a custom error). This panic propagates up through the call chain, reverting entire multi-step operations (e.g., NAV update loop).
- **Location (V8 instance):** `PerfFeeStandardFacet.sol:48` — `abi.decode(params, (uint16, uint256, uint16, uint16))` panics if `params.length < 128`. Triggered when a class has `perfFeeSelector` pointing to `calcStandardPerfFee` but empty `perfFeeParams`.
- **Impact:** One misconfigured entity can permanently deadlock ALL entities in the same processing loop (not just the malformed one). In V8, a single share class with empty params blocks all NAV updates for the entire fund (V8-CF05).
- **Fix:** (1) Validate `params.length` before `abi.decode` with a clear custom error; (2) Validate parameter length at the point of configuration (class creation or `executeSetPerfFeeCalculator`); (3) Add try/catch around `abi.decode` calls that process stored configuration bytes from external callers.

## E-BC34: Batch ERC1155 Callback Missing Guard (V9-A-C01) — FIXED 2026-03-03
- **Pattern:** `_checkOnERC1155BatchReceived` omits the `inExternalCallback` guard that `_checkOnERC1155Received` correctly implements.
- **Fix:** Added `s.inExternalCallback = true/false` wrapping to `_checkOnERC1155BatchReceived`. Always keep both callback functions in sync.

## E-BC35: Dead Code Guard Functions (V9-CF-01) — FIXED 2026-03-03
- **Pattern:** Implementing a helper function (e.g., `_requireFundNotBlocked`) but never calling it from code paths that need it.
- **Fix:** Added `_requireFundNotBlocked(fundId)` to 30+ execute* functions across 9 facets. After creating any guard helper, grep for usage across ALL execute* functions.

## E-BC36: Incomplete Emergency Pause (V9-CF-02) — FIXED 2026-03-03
- **Pattern:** Adding `whenNotBlocked` to execute* functions but not to underlying token operations.
- **Fix:** Added `whenNotBlocked` to `safeTransferFrom` and `safeBatchTransferFrom`.

## E-BC37: Safety Config All-or-Nothing Update (V9-CF-03)
- **Pattern:** A configuration setter that requires ALL parameters to be passed, even when only one needs changing. Accidentally setting any safety parameter to 0 silently disables that check (amplifies E-BC18).
- **Fix:** Provide per-field update functions, or require the caller to explicitly pass a "disable" flag (not 0) to turn off a safety check.
