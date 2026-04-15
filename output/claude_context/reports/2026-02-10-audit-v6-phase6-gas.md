# Security Audit V6 - Phase 6: Gas Optimization Report

**Date:** 2026-02-10
**Auditor:** Claude Opus 4.6 (Security Auditor)
**Scope:** 8 facets + shared base + libs (~5,500 LOC)
**Context:** Private blockchain (gas costs are lower priority than on mainnet, but efficiency still matters for throughput, block gas limits, and future migration)

---

## Executive Summary

This report identifies **20 gas optimization findings** across 8 categories. The findings are ranked by **impact score** (estimated gas savings per call multiplied by call frequency). The most impactful findings center on the pervasive use of `address(this)` external self-calls (Diamond proxy overhead) and redundant storage reads in hot loops.

**Estimated total savings:** 50,000-200,000+ gas per `processOrders` batch call (the most expensive operation), with additional savings across all facet operations.

**Important note:** This codebase runs on a private blockchain. Many of these patterns exist to work around EIP-170 contract size limits and Diamond proxy architecture constraints. Some findings may not be worth fixing if they would increase code complexity. Each finding includes a complexity/risk assessment.

---

## Findings

### G-01: Excessive External Self-Calls via `Facet(address(this))` Pattern [CRITICAL]

**Location:** All facets, most prominently:
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:73,95,126,150,247,257,273,298-299,306-307,311,372-373,421,426,489,508-509,726-729,831-832,983,988,990`
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:64,116,139-140,162,186,202,384,397,406,416,431,448,452`
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/NavManagementFacet.sol:127,151,174,236,328-329,497`
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ViewCallsFacet.sol:171,228-231,358,617,632,634,762,957,968,979,1165,1196,1295`

**Description:**
The Diamond proxy pattern requires cross-facet calls to go through `address(this)`, which triggers the full EVM external call path: CALL opcode (100 gas base + 2600 for cold address), ABI encoding/decoding, Diamond `fallback()` function selector lookup, and `delegatecall` to the target facet. A single `NavManagementFacet(address(this)).calculateFundPrice(fundId)` costs approximately **2,800-5,000 gas** compared to ~200 gas for an equivalent internal function call.

In `_processOrdersImpl`, a single order execution triggers approximately **12-18 external self-calls**:
- Line 247: `dealingProcessState(fundId)` (1 call)
- Line 257: `calculateFundPrice(fundId)` (1 call)
- Line 273: `validateOrderForProcessing(...)` per order (1 call, which internally makes ~6 more)
- Line 299: `createDealing(...)` per subscribe (1 call)
- Line 306-307: `unlockTokens(...)` (1 call)
- Line 311: `isEligible(...)` per subscribe (1 call)
- Lines 372-378: `mint(...)` (1 call)

For a batch of 20 orders, this is **240-360 external self-calls**, costing **672,000-1,800,000 gas** in overhead alone.

**Estimated Savings:** 3,000-5,000 gas per self-call avoided. For a 20-order batch: **60,000-180,000 gas**.

**Recommendation:** Cache results of repeated cross-facet calls. For example, `calculateFundPrice(fundId)` is called once at line 257 and stored in `processData.fundPrice`, but then called again inside `validateOrderForProcessing` at line 398, and again inside `_calculateOrderPrices` at line 1153. The fund price should be passed as a parameter rather than recalculated via external call.

For token operations (`mint`, `burn`, `lockTokens`, `unlockTokens`), consider creating internal helper functions that access `FundTokensStorage` directly from `AppStorage`, bypassing the Diamond dispatch entirely. This is architecturally valid since all facets share the same storage via `delegatecall`.

**Complexity/Risk:** Medium. Requires careful refactoring to avoid breaking the Diamond facet isolation pattern. Internal storage access is safe but reduces modularity.

---

### G-02: Redundant Validation in Propose + Execute Path [HIGH]

**Location:**
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:73,95` (submitOrder validates twice)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:126,150` (cancelOrder validates twice)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:116,139` (batchMintPerformanceFees validates twice)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:95,137` (postClassAdjustment validates twice)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/NavManagementFacet.sol:104,127` (updateNav validates twice)

**Description:**
Every operation follows a propose-then-execute pattern. The validation function is called once during `submitOrder()` (the propose step) and again during `executeSubmitOrder()` (the execute step). When the multisig threshold is 1 (single signer), both happen in the same transaction, meaning the exact same validation logic runs twice with identical inputs. This is the most common case for single-manager funds.

For `submitOrder`, `OrderValidationFacet(address(this)).validateOrderSubmission(...)` is a cross-facet external call that performs eligibility checks, lifecycle validation, token type checks, balance checks, and class rule validation -- all duplicated.

**Estimated Savings:** 10,000-30,000 gas per operation (depends on validation complexity). For `submitOrder` with eligibility checks: ~20,000 gas.

**Recommendation:** For the threshold-1 fast path, skip the validation in the `execute*` function if the operation was validated and executed in the same transaction (same `block.number`). Alternatively, store a validation hash during the propose step and check it during execution instead of re-running all checks.

```solidity
// Example: skip re-validation when executing in same tx
function executeSubmitOrder(...) external onlyInternalExecution returns (bool) {
    // Validation already ran in submitOrder() during same tx
    // Only re-validate for deferred multisig execution
    if (block.number != proposalBlock) {
        OrderValidationFacet(address(this)).validateOrderSubmission(...);
    }
    ...
}
```

**Complexity/Risk:** Low for the block number check approach. Security note: re-validation on deferred execution is important for TOCTOU defense (state may change between propose and execute in multisig scenarios).

---

### G-03: Repeated `calculateFundPrice` / `calculateClassPrice` / `calculateDealingPrice` Calls in Loops [HIGH]

**Location:**
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:398,443-444,489,831-832,990`
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:64,162,186,384,406`
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ViewCallsFacet.sol:228-231`

**Description:**
Price calculations involve multiple storage reads (`nav`, `totalSupply`, `dilutionRatio`) and cross-facet calls. In `processOrders`, `calculateFundPrice` is called at line 257 to populate `processData.fundPrice`, but then `validateOrderForProcessing` (line 273) calls it again internally at line 398. For each order in the batch, the fund price is recalculated despite being constant throughout the batch.

Similarly, in `mintAllPendingManagementFees` (FeeManagementFacet line 158-205), `calculateFundPrice` is called once at line 162, but then `calculateClassPrice` is called per class at line 186 via an external self-call, each of which re-reads the fund dilution ratio from storage.

In `ViewCallsFacet._calculateOrderAmount` (line 228-231), three price calculations are performed per order just to determine the amount -- and these are done within a loop over all orders.

**Estimated Savings:** 2,000-5,000 gas per avoided recalculation. For 20 orders in a batch: **40,000-100,000 gas**.

**Recommendation:** Pass pre-calculated prices as parameters instead of recalculating. The `processData.fundPrice` is already stored -- ensure it is threaded through to all internal calls that need it. For `mintAllPendingManagementFees`, cache the fund dilution ratio and pass it directly to the class price calculation.

**Complexity/Risk:** Low. Pure parameter threading with no behavioral change.

---

### G-04: Storage Re-reads of `s.FundAdmin[0]` Base Path in Hot Loops [HIGH]

**Location:**
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:270-351` (processOrders loop)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:165-197` (management fee loop)
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:387-435` (performance fee loop)

**Description:**
Solidity accesses deeply nested mappings by computing a new storage slot hash for each access. `s.FundAdmin[0].orderBook[fundId].orders[orderId]` requires multiple `keccak256` computations and `SLOAD` operations. Within the `processOrders` loop (lines 270-351), the pattern `s.FundAdmin[0].orderBook[fundId].orders[ordersToProcess[i].orderIndex]` appears at lines 271-272 and again at line 289. Each access re-computes the storage slot.

In `mintAllPendingManagementFees` (lines 165-197), each loop iteration accesses `s.FundAdmin[0].classes[classId]` and `s.FundAdmin[0].baseInfo[classId]` multiple times. The `classId` changes each iteration (different class), so the first access is always a cold SLOAD (2100 gas), but subsequent accesses to the same slot within the same iteration are warm (100 gas). The issue is that intermediate external calls (like `calculateClassPrice` at line 186) may cause the optimizer to lose track of warm slots.

**Estimated Savings:** 500-2,000 gas per loop iteration. For a fund with 5 classes and 20 orders: **10,000-40,000 gas**.

**Recommendation:** Cache storage pointers at the top of each loop iteration. Use `storage` references to avoid re-hashing:

```solidity
// Before (re-hashes per access):
s.FundAdmin[0].classes[classId].lastMgmtFeeMintTs;
s.FundAdmin[0].classes[classId].mgmtFeeRate;

// After (single hash, pointer reuse):
FundAdminStructs.ClassInfo storage class = s.FundAdmin[0].classes[classId];
class.lastMgmtFeeMintTs;
class.mgmtFeeRate;
```

Some of this is already done (e.g., line 887 in OrderManagementFacet), but not consistently in all loops.

**Complexity/Risk:** Very low. Purely mechanical refactoring.

---

### G-05: `_hasUmbrellaBalance` Iterates All Holdings via External Call [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:724-735`

**Description:**
`_hasUmbrellaBalance` calls `FundTokensFacet(address(this)).getUserHoldings(account)` which:
1. Makes an external self-call (2,600+ gas)
2. Retrieves ALL holdings for the user from the hierarchical system
3. Filters out zero-balance tokens (iterating the full list twice)
4. Returns an allocated memory array
5. Then `_hasUmbrellaBalance` iterates that array, calling `balanceOf` via another external self-call per holding

For a user with 50 holdings across 3 umbrellas, this means 50+ external self-calls to `balanceOf` plus the initial `getUserHoldings` call. Each `balanceOf` is another external Diamond dispatch.

This function is called from `_handleMinimumSubscriptionOnRedeem` (line 789) during order processing, meaning it runs for every redeem order in a batch.

**Estimated Savings:** 5,000-50,000 gas per redeem order (depends on number of user holdings).

**Recommendation:** Use the hierarchical holdings system's `getUmbrellaHoldings` instead of `getUserHoldings` to narrow the search. Better yet, access storage directly:

```solidity
function _hasUmbrellaBalance(address account, uint16 umbrellaId) internal view returns (bool) {
    HierarchicalIndexedHoldings storage holdings = s.FundTokens[0].userHoldings[account];
    uint32[] storage indices = holdings.umbrellaIndices[umbrellaId];
    for (uint256 i = 0; i < indices.length; ++i) {
        uint64 packed = holdings.allDealings[indices[i]];
        uint256 tokenId = uint256(packed); // decode
        if (s.FundTokens[0].balances[tokenId][account] > 0) return true;
    }
    return false;
}
```

This eliminates all external self-calls and memory allocation.

**Complexity/Risk:** Low. Direct storage access is valid within the Diamond since all facets share `AppStorage`.

---

### G-06: `_getClassBalanceValue` Makes External Calls Per Dealing Token [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:975-994`

**Description:**
`_getClassBalanceValue` calls `FundTokensFacet(address(this)).getClassHoldings(account, classNum)` (1 external call) and then iterates the result, calling `FundTokensFacet(address(this)).balanceOf(account, dealingId)` and `NavManagementFacet(address(this)).calculateDealingPrice(dealingId, classPrice)` per dealing with a balance. This is 2 external self-calls per dealing token.

This function is called from `_validateOrderRules` (line 957) which runs during both order submission and order processing. For a class with 10 dealing vintages held by the investor, this is 21 external self-calls.

**Estimated Savings:** 3,000-30,000 gas per call (depends on dealing count per class).

**Recommendation:** Access storage directly instead of going through external self-calls:

```solidity
uint256 balance = s.FundTokens[0].balances[dealingId][account];
uint128 dilutionRatio = s.FundAdmin[0].baseInfo[dealingId].dilutionRatio;
uint256 dealingPrice = dilutionRatio == 0 ? classPrice : Math.mulDiv(classPrice, PRECISION, dilutionRatio);
```

**Complexity/Risk:** Low. The `calculateDealingPrice` logic is simple (single `mulDiv`) and safe to inline.

---

### G-07: `_handleClassMinimumOnRedeem` Recalculates Prices Already Available [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:821-838`

**Description:**
During order processing, `_handleClassMinimumOnRedeem` calls `NavManagementFacet(address(this)).calculateFundPrice(fundId)` and `NavManagementFacet(address(this)).calculateClassPrice(classId, fundPrice)` at lines 831-832. These prices are already computed and available in `validationResult.fundPrice` and `validationResult.classPrice` from the earlier validation phase. The redundant recalculation adds ~5,000-8,000 gas per redeem order.

**Estimated Savings:** 5,000-8,000 gas per redeem order.

**Recommendation:** Pass `fundPrice` and `classPrice` as parameters to `_handleClassMinimumOnRedeem` from the caller which already has them in `validationResult`.

**Complexity/Risk:** Very low. Trivial parameter addition.

---

### G-08: Double Iteration in `_filterZeroBalanceTokens` [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundTokensFacet.sol:900-943`

**Description:**
`_filterZeroBalanceTokens` iterates the entire `allTokens` array twice: once to count non-zero items (lines 910-921), and once to build the result array (lines 930-942). Each iteration calls `balanceOf` or `totalSupply` which are storage reads. For `n` tokens, this is `2n` storage reads instead of `n`.

This function is called by `getUserHoldings`, `getUmbrellaHoldings`, `getFundHoldings`, and `getClassHoldings` -- all frequently used in portfolio building and order validation.

**Estimated Savings:** 100-200 gas per token (warm SLOAD). For a user with 50 holdings: **5,000-10,000 gas**.

**Recommendation:** Use a single pass with an oversized array and assembly resize (which is already used elsewhere in the codebase):

```solidity
function _filterZeroBalanceTokens(address account, uint256[] memory allTokens) 
    internal view returns (uint256[] memory tokenIds) 
{
    tokenIds = new uint256[](allTokens.length);
    uint256 count = 0;
    for (uint256 i = 0; i < allTokens.length; ++i) {
        if (s.FundTokens[0].balances[allTokens[i]][account] > 0) {
            tokenIds[count++] = allTokens[i];
        }
    }
    assembly { mstore(tokenIds, count) }
}
```

**Complexity/Risk:** Very low. Pattern is already used in ViewCallsFacet.

---

### G-09: Unnecessary Token ID Pack/Unpack Cycles in Holdings System [LOW]

**Location:**
- `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundTokensFacet.sol:561-581,652-692,787-799,871-892`

**Description:**
The hierarchical holdings system stores tokens as `uint64` packed values. When querying, each packed value is unpacked via `_unpackHierarchicalDealing` (4 bit-shift operations, line 576-581) and then reassembled via `TokenIdUtils.createTokenId` (3 shifts + 3 ORs, line 797/890). Since the packed `uint64` is just `uint64(tokenId)` (see `encodeTokenId` at line 267-268), the unpack-then-repack cycle is equivalent to `uint256(packed)`.

In `getUserHoldingsFromHierarchicalSystem` (line 886-891), each iteration does:
1. Read `uint64 packedDealing`
2. Unpack into 4 `uint16` values (4 shifts + 4 masks)
3. Repack into `uint256` via `createTokenId` (3 shifts + 3 ORs)

This is 14 operations that could be replaced by a single `uint256(packed)`.

**Estimated Savings:** ~50 gas per token in the array. For a user with 50 holdings: **2,500 gas**.

**Recommendation:**
```solidity
// Replace:
(uint16 u, uint16 f, uint16 c, uint16 d) = _unpackHierarchicalDealing(packedDealing);
tokenIds[i] = TokenIdUtils.createTokenId(u, f, c, d);

// With:
tokenIds[i] = uint256(packedDealing);
```

This works because `encodeTokenId` is `uint64(tokenId)` and `decodeTokenId` is `uint256(packed)`, confirming the round-trip identity.

**Complexity/Risk:** Very low. Must verify that token IDs never use bits above 63, which is guaranteed by the 16-bit field design.

---

### G-10: `_processAllPendingAdjustments` Uses O(n*m) Class Lookup [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/NavManagementFacet.sol:278-296`

**Description:**
The aggregation loop at lines 278-296 searches for existing class entries using a linear scan:
```solidity
for (uint256 j = 0; j < uniqueClasses; j++) {
    if (classIds[j] == pa.classId) { classIdx = j; break; }
}
```
For `n` pending adjustments across `m` unique classes, this is O(n*m) comparisons. Given that `MAX_PENDING_ADJUSTMENTS` bounds `n`, and typical funds have 3-10 classes, this is acceptable but suboptimal.

**Estimated Savings:** ~100-500 gas for typical loads (5-10 adjustments). Negligible for small queue sizes.

**Recommendation:** Since `classId` values are uint256, a memory-based mapping is not possible. The current approach is acceptable given the bounded queue size. No change recommended unless `MAX_PENDING_ADJUSTMENTS` is increased significantly.

**Complexity/Risk:** N/A.

---

### G-11: `ViewCallsFacet.getHoldings` Double-Filters Zero Balances [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ViewCallsFacet.sol:616-666`

**Description:**
`getHoldings` calls `FundTokensFacet(address(this)).getUserHoldings(account)` at line 617, which already filters out zero-balance tokens internally (via `_filterZeroBalanceTokens`). Then `getHoldings` re-checks `balanceOf` or `totalSupply` at lines 630-639 for every token. This is a redundant second round of balance checks.

**Estimated Savings:** 100-200 gas per token (warm SLOAD). For 50 holdings: **5,000-10,000 gas**.

**Recommendation:** Trust the result from `getUserHoldings` which already filters zero balances. Remove the re-check in `getHoldings`, or document why it exists (if there is a TOCTOU concern between the external call and the subsequent filtering -- though both run in the same transaction).

**Complexity/Risk:** Very low. The data is guaranteed fresh since it comes from the same view call context.

---

### G-12: `_collectUserTransferIndices` K-Way Merge Allocates Maximum Arrays [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ViewCallsFacet.sol:756-836`

**Description:**
The k-way merge in `_collectUserTransferIndices` allocates a `uint32[]` of `maxSize` (sum of all per-token transfer arrays). For an active user with 100 tokens and 50 transfers each, this allocates a 5,000-element array in memory (160 KB). The k-way merge also calls `_findMinCandidateIndex` per output element, each of which scans all token arrays (O(k) per element, O(n*k) total).

Since this is a view function, the gas cost is borne by the caller (typically an RPC node), but it can cause out-of-gas on large datasets.

**Estimated Savings:** Not directly applicable (view function). But reduces RPC node resource consumption.

**Recommendation:** Consider a pagination approach for large transfer histories. The current implementation is acceptable for the typical case (users with < 20 token types).

**Complexity/Risk:** Low. View-only, no state changes.

---

### G-13: `_processPerformanceFeeBatch` Calls `totalSupply` Twice Per Dealing [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:397,416`

**Description:**
In `_processPerformanceFeeBatch`, `FundTokensFacet(address(this)).totalSupply(dealingId)` is called at line 397 (for dilution ratio calculation) and again at line 416 (for max fee validation). Each is an external self-call costing ~3,000-5,000 gas. The total supply does not change between these two calls (no minting happens in between).

**Estimated Savings:** 3,000-5,000 gas per dealing in the batch. For 10 dealings: **30,000-50,000 gas**.

**Recommendation:** Cache the result of the first `totalSupply` call:
```solidity
uint256 ts = FundTokensFacet(address(this)).totalSupply(dealingId);
// Use ts for both dilution calculation (line 398) and max fee validation (line 417)
```

Or better, access storage directly: `s.FundTokens[0].totalSupply[dealingId]`.

**Complexity/Risk:** Very low. Pure caching.

---

### G-14: `BaseFacet._validateAndPropose` Uses `delegatecall` for Same-Diamond Proposal [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/shared/BaseFacet.sol:109-165`

**Description:**
Every state-changing operation goes through `_validateAndPropose`, which:
1. Performs 2 external self-calls for account validation (lines 119, 124)
2. Constructs an `abi.encodeWithSelector` payload in memory (line 143-149)
3. Executes a `delegatecall` to `address(this)` (line 152)
4. Decodes the return data (line 164)

The `delegatecall` at line 152 is used to route to `AccountFacet.proposeTransactionWithProposer` through the Diamond dispatch. This adds ~5,000-8,000 gas overhead per operation.

The two external self-calls (`isAccountAddress` and `hasPermission`) at lines 119 and 124 could be direct storage reads.

**Estimated Savings:** 5,000-10,000 gas per state-changing operation. For order processing with 20 orders: **100,000-200,000 gas** (since each order triggers token operations that also use `_validateAndPropose` internally).

**Recommendation:** Replace the external self-calls with direct storage access for account validation:
```solidity
// Replace:
if (!accountFacet.isAccountAddress(accountAddress))
// With:
if (!s.Account[0].accounts[accountAddress].exists)

// Replace:
if (!accountFacet.hasPermission(accountAddress, msg.sender, Permission.OPERATOR))
// With:
Permission perm = s.Account[0].accountPermissions[accountAddress][msg.sender];
if (perm < Permission.OPERATOR)
```

The `delegatecall` for proposal creation is harder to eliminate since it routes to AccountFacet logic, but the account checks can be inlined.

**Complexity/Risk:** Low for account checks. The `delegatecall` is structurally required for the proposal system.

---

### G-15: `_trackTransferHistoryAndUpdateHoldings` Performs Redundant Token Type Checks [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundTokensFacet.sol:584-641`

**Description:**
In `_trackTransferHistoryAndUpdateHoldings`, each iteration extracts 4 components from `tokenId` using `TokenIdUtils.getUmbrellaId/getFundId/getClassId/getDealingId` (4 shift+mask operations each, lines 605-608). Then `_updateHierarchicalHoldingsForTransfer` at line 620 calls `TokenIdUtils.isDealingToken(tokenId)` which does 2 more shift+mask operations. Then `_addToAddressZeroHoldings` or `_removeFromAddressZeroHoldings` truncates to `uint64(tokenId)`.

The component extraction at lines 605-608 is only needed for the `FundTokensTransfer` struct. The type check could use the already-extracted components.

**Estimated Savings:** ~100-200 gas per transfer. Modest for single transfers; adds up for batch transfers.

**Recommendation:** Extract components once and reuse:
```solidity
uint16 umbrellaId = TokenIdUtils.getUmbrellaId(tokenId);
uint16 fundId = TokenIdUtils.getFundId(tokenId);
uint16 classId = TokenIdUtils.getClassId(tokenId);
uint16 dealingId = TokenIdUtils.getDealingId(tokenId);
bool isDealing = fundId != 0 && dealingId != 0; // inline isDealingToken
```

**Complexity/Risk:** Very low. Mechanical refactoring.

---

### G-16: `ViewCallsFacet._getClassHoldingsFromHierarchicalSystem` Uses Nested Umbrella/Fund Loops [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundTokensFacet.sol:839-863`

**Description:**
`_getClassHoldingsFromHierarchicalSystem` searches for class holdings by iterating all umbrellas and all funds within each umbrella (double loop at lines 845-850 and 853-862). For a system with 5 umbrellas averaging 3 funds each, this is 15 iterations of storage reads (`nextFundNumPerUmbrella` and `classIndices` lengths).

This function is called from `getClassHoldings` which is used by `_getClassBalanceValue` in `OrderManagementFacet` during order validation and processing.

**Estimated Savings:** 1,000-5,000 gas depending on umbrella/fund count.

**Recommendation:** The function signature takes only `classId` (uint16) which is ambiguous across umbrellas. If the caller knows the umbrella and fund context (which it usually does during order processing), a more specific lookup with an `(umbrellaId, fundId, classId)` variant would be O(1) instead of O(U*F).

**Complexity/Risk:** Low. Requires adding an overloaded function.

---

### G-17: Memory Allocation in `processOrders` Validation Phase [MEDIUM]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:255-283`

**Description:**
In `_processOrdersImpl`, `OrderProcessData` (line 255-265) allocates `dealingsPerClass` as `new uint256[](nextClassId + 1)`. Then `validationResults` at line 268 allocates another array of `ordersToProcess.length` elements. The `OrderValidationResult` struct is large (>10 uint256 fields), so `ordersToProcess.length` copies of it consume significant memory.

For 20 orders with `nextClassId = 10`, this is:
- `dealingsPerClass`: 11 * 32 = 352 bytes
- `validationResults`: 20 * ~384 = 7,680 bytes (each `OrderValidationResult` has ~12 uint256 fields)
- Total: ~8 KB of memory allocation

Memory expansion costs scale quadratically: `3 * numWords + numWords^2 / 512`.

**Estimated Savings:** 2,000-5,000 gas for memory expansion costs.

**Recommendation:** Process orders in a single pass (validate + execute) instead of two passes (validate all, then execute all). This eliminates the need to store all validation results simultaneously. The current two-pass approach was likely designed for atomicity, but since both passes are within the same transaction, a single-pass approach achieves the same atomicity.

**Complexity/Risk:** Medium. The two-pass design exists for a reason (pre-validation before state changes). A single-pass approach would intermix reads and writes, making rollback harder. This finding is informational unless memory becomes a bottleneck.

---

### G-18: `FeeManagementFacet.mintAllPendingManagementFees` Loop Starts at Class 2 [INFORMATIONAL]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FeeManagementFacet.sol:165`

**Description:**
The loop `for (uint16 i = 2; i <= nextClassId; i++)` starts at 2, correctly skipping the fee class (class 1). However, `nextClassId` is the *next* ID to assign, not the highest existing ID. This means the loop iterates over class IDs that may not exist yet. Each non-existent class will have `totalSupply == 0`, causing an early return at line 353, but the `TokenIdUtils.createClassTokenId` call and storage read at line 167 still execute.

For a fund with 3 classes (IDs 2, 3, 4) and `nextClassId = 5`, the loop correctly iterates 3 times. No wasted iterations. This is correctly bounded.

**Estimated Savings:** None in practice. The current code is correct.

**Recommendation:** No change needed. This is informational only.

---

### G-19: `_mergeAuditEntries` Allocates Full Array Then Paginates [LOW]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:362-373,378-410`

**Description:**
`getClassAuditTrail` first creates the full merged array (`_mergeAuditEntries` at line 362) containing ALL fee + adjustment records, then applies pagination at lines 364-373. For a class with 1,000 fee mints and 100 adjustments requesting page 1 (offset=0, limit=10), this allocates a 1,100-element array only to return 10 elements.

**Estimated Savings:** Significant for large histories (1,000+ entries). The memory cost scales with total entries, not requested page size. For 1,000 entries: ~100,000 gas wasted on memory allocation.

**Recommendation:** Apply pagination during the merge rather than after:
- Calculate which range of the merged output falls within [offset, offset+limit)
- Use binary search or pointer advancement to skip to the correct starting position
- Only materialize the requested page

**Complexity/Risk:** Medium. The merge logic needs to handle offset tracking during the two-pointer merge, but this is a standard pattern.

---

### G-20: `FXManagementFacet.getFXRate` Division Could Use `mulDiv` for Precision [INFORMATIONAL]

**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FXManagementFacet.sol:120`

**Description:**
The cross-rate calculation at line 120 uses plain division:
```solidity
return (quoteVsUSD * Constants.PRECISION) / baseVsUSD;
```
This could overflow for very large rate values (though `MAX_FX_RATE_MULTIPLIER` bounds this). Using `Math.mulDiv` would prevent any theoretical overflow and maintain consistency with the rest of the codebase which uses `Math.mulDiv` for all precision math.

**Estimated Savings:** None (may even cost slightly more gas due to `mulDiv` overhead). This is a consistency/safety finding.

**Recommendation:** Replace with `Math.mulDiv(quoteVsUSD, Constants.PRECISION, baseVsUSD)` for consistency with the rest of the codebase.

**Complexity/Risk:** Very low.

---

## Impact Summary (Ranked by Gas Saved x Frequency)

| Rank | ID | Category | Est. Savings/Call | Frequency | Impact Score |
|------|------|-------------------------------|-------------------|-----------|-------------|
| 1 | G-01 | Diamond proxy self-calls | 60,000-180,000 | Every batch | CRITICAL |
| 2 | G-14 | Proposal system overhead | 5,000-10,000 | Every state change | HIGH |
| 3 | G-03 | Repeated price calculations | 40,000-100,000 | Every batch | HIGH |
| 4 | G-02 | Redundant validation | 10,000-30,000 | Every operation | HIGH |
| 5 | G-04 | Storage re-reads in loops | 10,000-40,000 | Every batch | HIGH |
| 6 | G-13 | Double totalSupply call | 30,000-50,000 | Fee batch | MEDIUM |
| 7 | G-05 | Holdings iteration | 5,000-50,000 | Every redeem | MEDIUM |
| 8 | G-06 | Class balance ext. calls | 3,000-30,000 | Order validation | MEDIUM |
| 9 | G-07 | Redundant price recalc | 5,000-8,000 | Every redeem | MEDIUM |
| 10 | G-08 | Double filter iteration | 5,000-10,000 | Holdings queries | MEDIUM |
| 11 | G-17 | Memory allocation in batch | 2,000-5,000 | Every batch | MEDIUM |
| 12 | G-19 | Full audit trail alloc | ~100,000 | Audit queries | LOW |
| 13 | G-11 | Double zero-balance filter | 5,000-10,000 | View queries | LOW |
| 14 | G-09 | Pack/unpack overhead | 2,500 | Holdings queries | LOW |
| 15 | G-15 | Redundant type checks | 100-200 | Every transfer | LOW |
| 16 | G-16 | Nested umbrella loops | 1,000-5,000 | Class queries | LOW |
| 17 | G-10 | O(n*m) class lookup | 100-500 | NAV updates | LOW |
| 18 | G-12 | K-way merge allocation | N/A (view) | Transfer queries | LOW |
| 19 | G-18 | Loop bounds (correct) | 0 | N/A | INFO |
| 20 | G-20 | FX rate precision | 0 | FX queries | INFO |

---

## Recommendations Priority

### Immediate (High ROI, Low Risk)
1. **G-03:** Pass pre-calculated prices as parameters instead of recalculating
2. **G-04:** Cache storage references in loops
3. **G-07:** Thread existing prices to `_handleClassMinimumOnRedeem`
4. **G-09:** Replace pack/unpack with `uint256(packed)`
5. **G-13:** Cache `totalSupply` result in performance fee batch

### Short-Term (Medium ROI, Low-Medium Risk)
6. **G-05:** Replace `_hasUmbrellaBalance` with direct storage access
7. **G-06:** Inline `_getClassBalanceValue` with direct storage reads
8. **G-08:** Single-pass filter for zero-balance tokens
9. **G-11:** Remove redundant zero-balance re-check in `getHoldings`
10. **G-14:** Inline account existence/permission checks in `_validateAndPropose`

### Long-Term (High ROI, Higher Risk)
11. **G-01:** Create internal token operation helpers that bypass Diamond dispatch
12. **G-02:** Implement single-tx fast path for threshold-1 operations

---

*Report generated by Claude Opus 4.6 Security Auditor - Phase 6 Gas Optimization*
