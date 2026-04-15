# Tool & Capability Gap Tracker

<!-- ~100 tokens -->
<!-- Updated 2026-02-08: Initial creation -->

## How to Use

During work, if you needed a tool/capability that wasn't available, append here:

```
## YYYY-MM-DD — [Role] — [Gap Description]
- **Needed:** What capability was missing
- **Workaround:** How you handled it
- **Suggested:** MCP server, plugin, or skill that could help
- **Priority:** HIGH / MEDIUM / LOW
```

## Gaps

## 2026-02-09 — Auditor — Slither v0.11.5 Crashes on Scoped Variables
- **Needed:** Static analysis via Slither for all contracts
- **Issue:** Slither's IR generator fails on `FeeManagementFacet.calculatePerformanceFee` (src/facets/FeeManagementFacet.sol:203-280) because block-scoped variable shadowing (`{ }` blocks with same variable names in different scopes) causes an SSA generation crash. Both CLI and MCP server affected.
- **Workaround:** Manual code review by auditor agents instead of automated static analysis. Slither detectors for reentrancy, uninitialized state, etc. unavailable.
- **Suggested:** (1) Upgrade Slither when fix available, (2) rename scoped variables to unique names, (3) try `--exclude` flag to skip problematic detector/function
- **Priority:** HIGH — Slither is Phase 1 of audit workflow and catches patterns manual review misses
- **V3 Update (2026-02-09):** Confirmed still blocked. Root cause now identified as Solidity 0.8.30 feature incompatibility (not just scoped variables). `AssertionError` in `slither/slithir/operations/member.py` during SlithIR generation. 70+ built-in detectors unavailable for V3 audit. All 99 findings from manual review only.

## 2026-02-09 — Auditor — Echidna/Manticore Not Configured
- **Needed:** Property-based fuzzing (Echidna) and formal verification (Manticore) for invariant testing
- **Issue:** No Echidna config or property contracts exist in the codebase. The Trail of Bits 5-step workflow (Step 4) requires these tools for security property testing.
- **Workaround:** Foundry invariant tests (Handler pattern) partially cover this, but cannot match Echidna's property-based exploration or Manticore's symbolic execution
- **Suggested:** (1) Install Echidna, (2) Create property contracts for 6 identified security properties (supply consistency, ACL completeness, eligibility enforcement, dilution bounds, lifecycle state machine, fund isolation), (3) Configure CI to run Echidna as part of test suite
- **Priority:** HIGH — Key security properties (dual totalSupply consistency, access control completeness) have NO automated testing
- **V9 Update (2026-03-03):** Echidna property contract designed (8 security properties, see `reports/2026-03-03-audit-v9-phase5-tob.md`). SP-8 (block enforcement) VIOLATED. Setup blocked by Diamond deployment complexity — needs EchidnaSetup.sol harness.

## 2026-03-03 — Auditor — Slither Now Working (Resolved)
- **Update:** Slither MCP server now works correctly on the Elysium codebase. V9 audit Phase 1 ran Slither successfully: 49 findings (4 High FP, 45 Medium). The previous crashes from Solidity 0.8.30 incompatibility appear resolved.
- **Priority:** RESOLVED

## 2026-03-03 — Auditor — No Gas Report Captured in V9
- **Needed:** `forge test --gas-report` output for gas optimization analysis
- **Issue:** Phase 1 ran `forge test -vv` without `--gas-report` flag; Phase 6 (Gas Optimization) skipped
- **Workaround:** Gas analysis not performed in V9; deferred to next audit cycle
- **Suggested:** Add `--gas-report` to Phase 1 task in audit plan template
- **Priority:** LOW — gas optimization is less critical than security findings
