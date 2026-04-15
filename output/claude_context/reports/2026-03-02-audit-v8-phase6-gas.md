# Audit V8 — Phase 6: Gas Optimization Analysis
<!-- 2026-03-02 -->

## Methodology

Analyzed struct layouts from `FundAdminStructs.sol`, cross-facet call patterns from Phase 2 call graph, loop patterns from Slither LOW-L01–L12 (12 findings), and storage topology from `LibAppStorage.sol`.

---

## GAS-01: `nextFundId` Type Mismatch — `uint256` vs Required `uint16`

**Location:** `LibAppStorage.sol:16` (`FundAdminStorage.nextFundId`)
**Severity:** LOW — Wasted storage slot, prevents packing
**Gas Impact:** ~2,100 gas per write (separate SSTORE vs packed slot)

**Description:**
```solidity
// Current (LibAppStorage.sol:16):
uint256 nextFundId;  // 32 bytes — WASTES 30 bytes vs uint16

// Token encoding cap (TokenIdUtils.sol):
// Fund IDs are 16-bit: max 65,535 funds per umbrella
```

`nextFundId` uses `uint256` but the token ID encoding (`[umbrella 16b][fund 16b][class 16b][dealing 16b]`) caps fund numbers at 16 bits. The uint256 field consumes a full 32-byte storage slot and cannot pack with adjacent fields.

**Recommendation:**
```solidity
// Change to:
uint16 nextFundId;  // Packs with nextUmbrellaId (uint16) in same slot
```

**Estimated savings:** 1 storage slot saved in FundAdminStorage layout; ~2,100 gas per `createFund` call.

---

## GAS-02: `uint160 mgmtFeeRate` Oversized Field

**Location:** `FundAdminStructs.sol:168` (`ClassInfo.mgmtFeeRate`)
**Severity:** LOW — Wasted 18 bytes of slot 1
**Gas Impact:** Larger struct footprint; every ClassInfo read loads an extra slot

**Description:**
```solidity
// Current (FundAdminStructs.sol:168):
uint160 mgmtFeeRate;  // 20 bytes — way larger than needed

// Comment says: "Realistic fee rates (0-10,000 bps = 0-100%) fit in uint16,
//  but uint160 allows future flexibility"
```

The comment acknowledges that `uint16` would suffice for realistic rates (0–10,000 BPS). `uint160` uses 20 bytes; `uint32` would use 4 bytes. The oversized field prevents ClassInfo slot 1 from fully packing:

**Current slot 1:** `status` (1) + `mgmtFeeRate` (20) + `lastMgmtFeeMintTs` (4) + `nextDealingId` (2) = 27 bytes. The remaining 5 bytes are unused.

**With uint32:** `status` (1) + `mgmtFeeRate` (4) + `lastMgmtFeeMintTs` (4) + `nextDealingId` (2) = 11 bytes. The remaining 21 bytes could pack `perfFeeSelector` (4 bytes) into the same slot.

**Recommendation:** Change to `uint32 mgmtFeeRate`. If future flexibility is needed, a `uint64` is more than sufficient and still saves 14 bytes over `uint160`. Note: V8N-08 found this also has a security angle (no max cap enforced at runtime).

**Estimated savings:** ~2,100 gas per `createClass` call; smaller struct footprint for all class reads.

---

## GAS-03: Unbounded Historical Price Arrays in FundInfo

**Location:** `FundAdminStructs.sol:150-152` (`FundInfo.fundPrices`, `fundPriceNavTimestamps`, `fundPriceBlockNumbers`)
**Severity:** MEDIUM — Monotonically growing storage cost
**Gas Impact:** 3 SSTORE writes (~20,000 gas) per NAV update for array push; growing read costs

**Description:**
Three dynamic arrays grow by 1 element per NAV update:
```solidity
uint128[] fundPrices;           // Grows: 1 per NAV update
uint32[] fundPriceNavTimestamps; // Grows: 1 per NAV update
uint32[] fundPriceBlockNumbers;  // Grows: 1 per NAV update
```

For a fund with daily NAV updates over 10 years: `10 × 365 = 3,650` entries × 3 arrays = 10,950 storage slots consumed. Each NAV update appends to all three, costing 3 SSTORE writes for new slots + 3 SSTORE writes to update array length = ~60,000 gas just for historical price storage.

These arrays serve off-chain `eth_call` historical queries. On-chain callers only need the LATEST price.

**Recommendation:**
1. Move historical price storage off-chain (emit a `NavUpdated(fundId, price, navTimestamp, blockNumber)` event instead)
2. Keep only the latest price in FundInfo: `uint128 latestFundPrice` (single value, no array growth)
3. Or use a circular buffer: `uint128[52] fundPrices` (last 52 weeks, fixed cost)

**Estimated savings:** 3 fewer SSTORE writes per NAV update = ~60,000 gas saved per NAV update at long-running funds.

---

## GAS-04: Cross-Facet Delegatecall Inside Loops — calculateClassPrice/calculateFundPrice

**Location:** `FeeManagementFacet.sol:163-166` (inside loop over classes), `ViewCallsFacet.sol` (loops), `NavManagementFacet.sol`
**Severity:** MEDIUM — Compounding overhead
**Gas Impact:** ~2,500–4,000 gas overhead per cross-facet call × loop iterations

**Description:**
`mintAllPendingManagementFees` (`FeeManagementFacet.sol:157-204`) contains a loop that calls `calculateClassPrice` cross-facet for every class:
```solidity
// FeeManagementFacet.sol - inside loop:
for (uint16 i = 2; i <= nextClassId; i++) {
    uint256 classPrice = INavManagement(address(this)).calculateClassPrice(classId, fundPrice);
    // ^ Each call: address(this).delegatecall to NavManagementFacet
    //   overhead: ~2,300-2,600 gas (CALL instruction + ABI encode/decode)
}
```

For a fund with 10 classes: 10 × 2,500 = 25,000 gas overhead just for the delegatecall indirection in one NAV update.

Similarly, ViewCallsFacet iterates all classes/dealings calling `calculateClassPrice` and `calculateDealingPrice` via cross-facet delegatecall. These are view-only calls (no state change) but still incur delegatecall overhead.

**Root cause:** Cross-facet calls use `address(this).delegatecall` which incurs ~700-2,300 gas overhead per call vs direct `LibNavCalculations.calculateClassPrice(...)` internal call.

**Recommendation:**
Extract price calculation logic from `NavManagementFacet` into a shared library `LibNavCalculations`:
```solidity
// New library (no storage, pure calculation):
library LibNavCalculations {
    function calculateClassPrice(
        FundAdminStorage storage s,
        uint256 classId,
        uint256 fundPrice
    ) internal view returns (uint256) { ... }
}
```
FeeManagementFacet and ViewCallsFacet can then call `LibNavCalculations.calculateClassPrice(s, ...)` directly, eliminating delegatecall overhead in loops.

**Estimated savings:** 2,500 gas × N_classes per NAV update. For 10 classes: 25,000 gas saved per NAV update.

---

## GAS-05: Dual TotalSupply Writes on Every Mint/Burn (E-BC25 gas impact)

**Location:** All mint/burn paths in `FundTokensFacet` + manual `baseInfo[id].totalSupply` updates in `OrderManagementFacet`, `FeeManagementFacet`
**Severity:** MEDIUM — Systematic double-write cost
**Gas Impact:** ~5,000 additional gas per mint/burn (2 SSTORE vs 1)

**Description:**
Every mint/burn operation writes to TWO separate totalSupply storage locations:
1. `FundTokensStorage.totalSupply[tokenId]` — updated in `FundTokensFacet._update()`
2. `FundAdminStorage.baseInfo[tokenId].totalSupply` — updated manually in OrderManagementFacet and FeeManagementFacet

```
Per subscribe order settled:
  - FundTokensFacet.mint() → SSTORE #1: FundTokens.totalSupply[dealingId] ← cold: 20,000 gas
  - OrderManagementFacet._processSubscriptions → SSTORE #2: baseInfo[dealingId].totalSupply ← cold: 20,000 gas
  (or warm: 2,900 + 2,900 = 5,800 gas for both)
```

This dual-write pattern is not just a security issue (E-BC25) — it's also a gas inefficiency. Every unit operation costs double the supply-tracking writes.

**Recommendation:** Consolidate to a single totalSupply tracker per token. This requires:
1. Choose authoritative source: `FundTokensStorage.totalSupply` (updated by ERC1155 layer)
2. Remove all manual `baseInfo[id].totalSupply` updates from OrderManagementFacet and FeeManagementFacet
3. Update all read sites to use `FundTokensFacet.totalSupply(tokenId)` via cross-facet call or direct library access

**Estimated savings:** 1 SSTORE saved per mint/burn (~2,900 gas warm, ~20,000 gas cold).

---

## GAS-06: `FundAdminStorage.admins` and `navUpdaters` Legacy Mappings

**Location:** `LibAppStorage.sol:27-28`
**Severity:** LOW — Dead storage (never read, still occupies layout slot)
**Gas Impact:** Negligible at runtime, but misleading code

**Description:**
```solidity
// LibAppStorage.sol:27-28:
mapping(address => bool) admins;       // LEGACY — note says "replaces individual admins"
mapping(address => bool) navUpdaters;  // LEGACY — note says "replaced by unified roles mapping"
```

These fields were superseded by the unified `roles` mapping but kept for storage layout compatibility. If they are never written, they waste no runtime gas. However, if any code still reads them (e.g., old migration path), it would get stale data.

**Recommendation:** Add a comment explicitly documenting these as deprecated/empty. Verify no code path reads these with `Grep`.

---

## GAS-07: Eligibility Cross-Facet Calls Inside Order Validation Loop

**Location:** `OrderManagementFacet.sol:313` (inside `_processOrdersImpl` loop), `OrderValidationFacet.sol:26` (26 cross-facet calls)
**Severity:** MEDIUM
**Gas Impact:** ~2,500 gas × N_orders per `processOrders` call

**Description:**
`_processOrdersImpl` calls `isEligible(order.investor, order.tokenId)` for each order during processing. `isEligible` is in `EligibilityFacet`, so this is a cross-facet delegatecall per order:

```solidity
// OrderManagementFacet.sol inside loop:
bool eligible = IEligibilityFacet(address(this)).isEligible(order.investor, classId);
// ^ delegatecall to EligibilityFacet for EVERY order
```

For 100 orders processed in one batch: 100 × 2,500 = 250,000 gas overhead just for eligibility delegatecalls.

**Recommendation:** Extract `_checkEligibility` into a shared internal library or access the eligibility storage directly within the loop (EligibilityFacet reads the same AppStorage). This avoids the delegatecall indirection.

---

## GAS-08: `BaseInfo.name` as `string` — Dynamic Storage Cost

**Location:** `FundAdminStructs.sol:126` (`BaseInfo.name`)
**Severity:** LOW — Avoidable storage cost for fund/class names
**Gas Impact:** ~20,000 gas per character beyond 31 bytes for every createFund/createClass

**Description:**
```solidity
struct BaseInfo {
    string name;       // Dynamic string — up to N slots
    uint128 totalSupply;
    uint32 createdAt;
    uint128 dilutionRatio;
}
```

The `string` type stores the length + data, requiring an extra storage slot for strings longer than 31 bytes. For names like "Global Equity Fund - Class A Institutional" (43 chars), this costs 2 SSTOREs for the string slot + 1 SSTORE for the data slot.

The layout also causes `totalSupply`, `createdAt`, and `dilutionRatio` to start on slot 1 (after the string slot), preventing packing with the string value.

**Recommendation:** Store names as `bytes32` (max 32 characters, sufficient for fund/class names):
```solidity
struct BaseInfo {
    bytes32 name;       // Fixed 32 bytes — single SSTORE, packs or stands alone
    uint128 totalSupply;
    uint32 createdAt;
    uint128 dilutionRatio;
}
```
Or store names off-chain and use `keccak256(name)` as a `bytes32` identifier.

---

## GAS-09: `feeHistory` and `redemptionFeeHistory` Unbounded Arrays

**Location:** `LibAppStorage.sol:46-50` (`FundAdminStorage.feeHistory`, `redemptionFeeHistory`)
**Severity:** LOW — Monotonically growing arrays
**Gas Impact:** 1 SSTORE per fee event × accumulates over fund lifetime

**Description:**
Both `feeHistory` and `redemptionFeeHistory` are unbounded arrays that grow with every fee mint event. The `getClassAuditTrail` function in `ClassAdjustmentFacet` merges these with `adjustmentHistory` — as noted in V8A4-L05, it allocates the full merged array in memory before pagination.

For a fund with 5 years of quarterly fees on 10 classes: 20 entries × 10 classes = 200 `FeeMint` structs stored on-chain.

**Recommendation:** Same as GAS-03 — emit events for fee history instead of storing on-chain. Keep only a configurable sliding window (e.g., last 12 months) on-chain for operational queries.

---

## GAS-10: `ProtocolSafetyConfig` Read on Every NAV Update Even When Disabled

**Location:** `NavManagementFacet.sol:50-77` (`_checkNavUpdate`)
**Severity:** LOW
**Gas Impact:** ~800 gas per NAV update (SLOAD of safety config mapping)

**Description:**
On every `executeUpdateNav`, the code reads `s.FundAdmin[0].protocolSafetyConfigs[fundId]` even when all config values are zero (the default). Since zero means "disabled," this SLOAD serves no purpose for the default case.

```solidity
// NavManagementFacet.sol:50-54:
ProtocolSafetyConfig storage config = s.FundAdmin[0].protocolSafetyConfigs[fundId];
if (config.maxNavChangeBps > 0) {  // Branch taken only when non-zero
```

**Recommendation:** Pack a `bool safetyConfigured` flag alongside the config or cache the config hash. Alternatively, the existing zero-check is already efficient — this is the lowest priority optimization.

---

## Gas Summary

| ID | Description | Gas per Call | Priority |
|----|-------------|-------------|----------|
| GAS-03 | Historical price array pushes | ~60,000/NAV update | HIGH |
| GAS-04 | Cross-facet delegatecall in class loops | ~2,500/class/call | HIGH |
| GAS-05 | Dual totalSupply writes | ~5,000/mint-burn | HIGH |
| GAS-07 | Eligibility cross-facet per order | ~2,500/order | MEDIUM |
| GAS-01 | `nextFundId: uint256` → `uint16` | ~2,100/fund create | LOW |
| GAS-02 | `mgmtFeeRate: uint160` → `uint32` | ~2,100/class create | LOW |
| GAS-08 | `BaseInfo.name: string` → `bytes32` | ~20,000/create | LOW |
| GAS-06 | Legacy mappings (admins, navUpdaters) | 0 (dead code) | INFO |
| GAS-09 | Unbounded feeHistory arrays | ~20,000/fee event | LOW |
| GAS-10 | ProtocolSafetyConfig cold SLOAD | ~800/NAV update | INFO |

### Highest-Impact Single Transaction: `executeUpdateNav` + `executeProcessOrders`

For a fund with 10 classes, 100 pending orders, executing one dealing:
- GAS-03: 3 array pushes = ~20,000 gas (warm, 3rd+ push)
- GAS-04: 10 cross-facet calculateClassPrice calls = ~25,000 gas
- GAS-05: 100 orders × 2 totalSupply writes = ~290,000 gas (100 × 2,900 warm)
- GAS-07: 100 eligibility checks = ~250,000 gas
- **Total avoidable gas: ~585,000 gas per large batch**

Private blockchain gas limits are generally higher than Ethereum mainnet, but optimizing these patterns reduces block computation time and improves throughput.

---

*Report generated: 2026-03-02*
