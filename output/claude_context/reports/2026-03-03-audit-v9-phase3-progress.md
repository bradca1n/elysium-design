# V9 Phase 3 Progress — Agents A-C Complete (2026-03-03)

## Agent A: Token & Access Control — COMPLETE

### Prior Findings
| Finding | Status |
|---------|--------|
| ARCH-01 / V8-A1-C01 | PARTIALLY FIXED (batch callback gap) |
| V8-A1-C02 | FIXED |
| V8-A1-H03 | FIXED |
| V8-A1-M01 | FIXED (FALSE POSITIVE confirmed) |
| V8-A1-M03 | STILL PRESENT |
| V8-A1-M04 | FIXED |
| V8-P01 | FIXED (BlockFacet) |
| V8-T01 | BY DESIGN |
| V8-T03 | STILL PRESENT |
| V8-CF02 | PARTIALLY FIXED (batch gap) |

### New Findings
- **V9-A-C01 (CRITICAL)**: Batch ERC1155 callback lacks inExternalCallback guard — FundTokensFacet.sol:502-529
- **V9-A-H01 (HIGH)**: Fund-level blocking non-functional — _requireFundNotBlocked never called
- **V9-A-M03 (MEDIUM)**: Token transfers not blocked during protocol pause
- **V9-A-M01 (LOW)**: Operator removal doesn't re-validate threshold
- **V9-A-M02 (LOW)**: Account address uses block.number
- **V8-T03 (LOW)**: FundTokens owner permanently set to deployer EOA

## Agent B: Order & NAV Processing — COMPLETE

### Prior Findings
| Finding | Status |
|---------|--------|
| V8-A1-C02 | FIXED |
| V8-A1-H01 | FIXED |
| V8-A1-H02 | FIXED (both SET and APPLY time) |
| V8N-01 | BY DESIGN |
| V8N-02 | FIXED |
| V8N-03 | ADDRESSED |
| V8N-12 | FIXED |

### New Findings
- **V9B-05 (MEDIUM)**: Swap linking currency mismatch — fund-currency value used for cross-currency dependent order
- **V9B-01 (LOW)**: Ignored getFXRate return (E-BC17 residual)
- **V9B-02 (LOW)**: Redeem minimum holding subtraction underflow
- **V9B-04 (LOW)**: No max length on dealing schedule timestamps
- **V9B-03 (INFO)**: ProtocolSafetyConfig event omits 3 params
- **V9B-06 (INFO)**: Slither reentrancy false positives

## Agent C: Fees & Performance — COMPLETE

### Prior Findings
| Finding | Status |
|---------|--------|
| V8-PFS-01 | FIXED |
| V8-PFS-02 | FIXED |
| V8-PFS-03 | FIXED |
| V8-PFS-06 | FIXED |
| V8-PFS-07 | FIXED |
| V8-PFS-08 | FIXED |
| V8-FMV-05 | FIXED |
| V8-FMV-02 | FIXED |
| V8-CF03 | INFORMATIONAL (mitigated) |
| V8-CF05 | FIXED |
| V8-PFS-04 | FIXED |
| V8-PFS-05 | BY DESIGN |

### New Findings
- **V9-FMF-05 (MEDIUM)**: Stale classPrice in _processPerformanceFeeBatch after dilution updates
- **V9-FMF-01 (LOW)**: Reentrancy in mintAllPendingManagementFees (mitigated by ARCH-01)
- **V9-FMF-02 (LOW)**: Reentrancy in _processPerformanceFeeBatch (mitigated by ARCH-01)
- **V9-FMF-04 (LOW)**: maxPerfFeeRateBps only enforced for standard calculator selector
- **V9-FMF-06 (LOW)**: No class existence check in crystalliseSingleDealing
- **V9-FMF-07 (LOW)**: No class existence check in executeSetCrystallisationPeriod
- **V9-PFS-01 (INFO)**: Naming inconsistency MAX_PRICE_STALENESS
- **V9-FMF-08 (INFO)**: Fee class totalSupply additive-only

## Running Totals (Agents A-C)
- CRITICAL: 1 (V9-A-C01)
- HIGH: 1 (V9-A-H01)
- MEDIUM: 3 (V9-A-M03, V9B-05, V9-FMF-05)
- LOW: 9
- INFO: 4
- Prior FIXED: 18
- Prior BY DESIGN: 2
- Prior STILL PRESENT: 2 (V8-A1-M03, V8-T03)
