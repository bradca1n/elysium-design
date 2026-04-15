# Role: Audit Fixer

<!-- ~3500 tokens -->
<!-- Created 2026-02-12: Ported from .claude/skills/audit-fixer/SKILL.md to claude_context/roles/ format -->

## When to Activate
Audit finding remediation — analyzing findings for validity, designing holistic fix plans, and implementing with testing. Supports fast mode (modifier/guard additions) and thorough mode (architectural changes).

Fix audit findings with architectural awareness. Two modes: FAST (simple guards/modifiers) and THOROUGH (architectural changes).

## Useful Tools
- **Slither** for static analysis and verification
- **Foundry** (forge/cast/anvil) for build/test
- **sequential-thinking** for cross-facet reasoning (THOROUGH mode)
- **OpenZeppelin** for reference patterns (THOROUGH mode)

Use `ToolSearch` with the tool name (e.g. `ToolSearch("slither")`) to load these on demand.

## Context Files to Read (in order)
1. `claude_context/errors/blockchain.md` — Known contract pitfalls
2. `claude_context/errors/GENERAL.md` — Cross-cutting pitfalls
3. `claude_context/audits/AUDIT_STATUS.md` — Current finding status and cross-refs
4. `claude_context/technical/SMART_CONTRACTS.md` — Architecture reference
5. `contracts/CLAUDE.md` — Test helpers and build commands
6. Latest audit report (for findings being fixed)

## Mode Selection (FIRST decision — determines which steps are required)

After reading the findings to fix, classify each fix:

| Fix Type | Examples | Mode |
|----------|----------|------|
| Add modifier (`onlyInternalExecution`, `nonReentrant`) | V4-C01, V4-C02, V3-C02 | FAST |
| Add bounds check (`if (x > MAX) revert`) | V4-C07, V5-C03 | FAST |
| Reorder statements (CEI fix) | V5-C01 | FAST |
| Add storage field + guard logic | PHASE5-01 reentrancy lock | FAST |
| Rewrite validation logic | V5-C02 FX cross-rate | THOROUGH |
| Extract facet / refactor architecture | T-20 EIP-170 split | THOROUGH |
| New feature (pause, NAV correction) | PC-1, PC-2 | THOROUGH |

**If ALL fixes are FAST:** Skip Steps 4, Phase 1 gas baseline, Phase 3 maturity reassessment.
**If ANY fix is THOROUGH:** Run full workflow.
**Both modes REQUIRE:** per-cluster testing, AUDIT_STATUS updates, final full test run.

---

## MANDATORY Pre-Work Setup

### Step 1: Brainstorm remediation approach
You MUST call `Skill(skill="brainstorming")` as a tool call (not text — see E-G13). Focus on:
- Which findings are valid vs false positives?
- Which findings share root causes? (group into clusters)
- Which clusters are independent? (can parallelize)
- What is the priority order?

### Step 2: Load tools via ToolSearch (REQUIRED)
```
ToolSearch("slither")              — Static analysis for verification
ToolSearch("foundry")              — Build/test
ToolSearch("sequential-thinking")  — Cross-facet reasoning (THOROUGH mode)
ToolSearch("openzeppelin")         — Reference patterns (THOROUGH mode)
```
FAST mode: slither + foundry required. sequential-thinking + openzeppelin optional.
THOROUGH mode: ALL four required.

### ⛔ GATE: After Step 2 (BLOCKING — cannot load context without tools)
List the tools you loaded via ToolSearch:
1. slither: ___
2. foundry: ___

If you cannot fill in both blanks, call `ToolSearch("slither")` and `ToolSearch("foundry")` NOW.
THOROUGH mode: also list sequential-thinking: ___ and openzeppelin: ___.
**WHY:** V1 and V2 remediation both scored 0% on ToolSearch. The word "REQUIRED" in Step 2 failed twice — this gate exists because text alone doesn't work (see E-G19).

### Step 3: Load audit context (ALL REQUIRED — read in order)
1. `claude_context/audits/AUDIT_STATUS.md` — Current finding status and cross-refs
2. `claude_context/technical/SMART_CONTRACTS.md` — Architecture reference
3. `contracts/CLAUDE.md` — Test helpers and build commands
4. Latest audit report (for findings being fixed)

### Step 4: Trail of Bits assessment (THOROUGH mode only — skip for FAST)
Call these as tool calls (not text — see E-G13):
- `Skill(skill="building-secure-contracts:guidelines-advisor")` — Architecture review
- `Skill(skill="building-secure-contracts:secure-workflow-guide")` — Security baseline
- `Skill(skill="building-secure-contracts:token-integration-analyzer")` — If any findings involve token operations
**WHY:** Fixing architectural issues without understanding the current design leads to patches that introduce new problems.

### Step 5: Create remediation plan
You MUST call `Skill(skill="writing-plans")` as a tool call.
Plan MUST include:
- **Independent clusters** — grouped by shared files, NOT by severity
- **Parallelism annotation** — which clusters can run simultaneously
- **Per-cluster: files, changes, test strategy**
- **TDD classification per fix** (see TDD Rules below)

---

## TDD Rules (differentiated by fix type)

Not all fixes benefit equally from TDD. Classify each:

| Fix Type | TDD Approach | Why |
|----------|-------------|-----|
| Arithmetic validation (bounds, overflow) | **Full TDD:** Write `test_audit_ID_*` proving the vulnerability first | Boundary conditions are subtle; test proves the exact attack |
| ACL modifier addition | **Regression test:** Write test calling function directly, expect revert | Simple but catches accidental removal |
| CEI reordering | **Skip TDD:** Document attack vector in code comment | Reentrancy test requires mock attacker contract — disproportionate effort |
| Logic rewrite (FX validation) | **Full TDD:** Write test with known-bad input, verify revert | Logic errors are the reason the finding exists |

**Rule:** Never skip testing entirely. At minimum, run `forge test` after each cluster.

---

## Execution

### Phase 1: Record baseline

**FAST mode:**
```bash
forge test -vv 2>&1 | tail -5    # Record pass/fail count
```

**THOROUGH mode:**
```bash
forge test -vv --gas-report       # Full baseline
mcp__slither__run_detectors       # Slither baseline
```
Write baseline to `claude_context/reports/YYYY-MM-DD-audit-fix-baseline.md`

### ⛔ GATE: Before Phase 2 (BLOCKING)
1. **Baseline recorded?** At minimum: test pass count noted in conversation or on disk
2. **Plan file exists?** `Read("docs/plans/YYYY-MM-DD-*.md")` — re-read it NOW (see E-G14)
3. **Clusters and parallelism identified?** Know which clusters are independent

---

### Phase 2: Implement fixes (per-cluster, with optional parallelism)

#### Serial execution (default — simpler)
For each cluster in priority order:
1. Read the plan section for this cluster
2. Implement all fixes in the cluster
3. Run `forge test` for affected test files (not full suite — speed)
4. If tests fail: fix immediately before next cluster
5. Update `claude_context/audits/AUDIT_STATUS.md` for completed findings
6. Write progress to disk if session is long (see E-G15)

#### Parallel execution (when user requests speed or clusters are independent)
Requirements for parallel clusters:
- **No shared file modifications** between clusters
- Each cluster gets its own subagent
- Subagent prompt MUST include: (a) exact file paths, (b) exact code changes from plan, (c) instruction to run `forge test` on affected files, (d) max 2000 char return summary
- Use `run_in_background: true`
- Collect results one at a time via `TaskOutput`
- After all return: run full `forge test` to catch cross-cluster interactions

**WHY parallel works here:** Unlike audits (which need shared context), fix implementations are isolated code edits. Each cluster touches different files. The risk is merge conflicts, not context overflow.

### ⛔ GATE: After parallel round (BLOCKING — applies to all clusters in the round)
After all parallel subagents return and full `forge test` passes:
1. **All cluster tests pass?** Full `forge test` output shows 0 failures — paste the summary line
2. **AUDIT_STATUS.md updated for ALL clusters in this round?** Check each finding has FIXED status
3. **Committed all clusters in this round?** One commit per cluster, or one commit per round minimum. Run `git add` + `git commit` NOW.
4. **Re-read plan:** `Read("docs/plans/YYYY-MM-DD-*.md")` — check next round requirements (see E-G14)
5. **If past 80% context:** Write progress to disk, then `/compact`

### ⛔ GATE: After each cluster (BLOCKING — do not start next cluster without clearing)
1. **Tests pass for this cluster?** Run `forge test --match-path` for affected test files — paste the summary line
2. **AUDIT_STATUS.md updated?** Mark findings as FIXED with one-line resolution
3. **Committed this cluster?** Run `git add` + `git commit -m "fix(audit): [cluster-name] - [summary]"` NOW. Do not defer commits to end-of-session.
   **WHY:** V1 and V2 both had 0 commits during the entire session. This gate replaces Rule 6 which was never followed (see E-G19).
4. **Re-read plan:** `Read("docs/plans/YYYY-MM-DD-*.md")` — check next cluster requirements (see E-G14)
5. **If past 80% context:** Write all progress to disk NOW, then `/compact`

---

### Phase 3: Final verification

1. Rebuild diamond: `yarn dlx gemforge build` (includes `forge build`)
2. Run full test suite: `forge test -vv` — ALL tests must pass
3. If tests fail: fix test expectations for new security checks (e.g., add `vm.expectRevert`, `bound()` fuzz inputs, `try/catch` in invariant handlers)
4. **(THOROUGH mode only):** Run `mcp__slither__run_detectors` — compare with baseline
5. **(THOROUGH mode only):** Re-invoke `Skill(skill="building-secure-contracts:secure-workflow-guide")` for before/after comparison

### ⛔ GATE: Before claiming done (BLOCKING — see E-G17)
1. **`forge test` output shows 0 failures?** Not "probably passes" — actually ran it and saw 0
2. **`AUDIT_STATUS.md` has FIXED status for every addressed finding?**
3. **No uncommitted work?** Either commit or confirm user will commit

---

### Phase 4: Report (THOROUGH mode only — skip for FAST)

Write `claude_context/reports/YYYY-MM-DD-audit-fix-report.md`:
- Findings addressed (ID, severity, one-line fix)
- Architecture changes (if any)
- Gas impact (before/after from gas reports)
- Remaining open findings

Update `claude_context/INDEX.md` with new report.

---

## ⛔ POST-COMPACTION GATE (read this if session was compacted)

If you are reading this after a `/compact` or session continuation:
1. **Re-read this file NOW:** `Read("claude_context/roles/audit-fixer.md")`
2. **Re-read the plan:** `Read("docs/plans/YYYY-MM-DD-*.md")`
3. **Check task list:** `TaskList` — which tasks are completed vs in-progress?
4. **Check AUDIT_STATUS.md:** Which findings are marked FIXED already?
5. **Run `forge test`:** Verify current state before continuing
**WHY:** The critical findings remediation session lost skill awareness after compaction, dropping from structured execution to ad-hoc batch editing. This gate exists because of that incident.

---

## ⛔ FINAL GATE: Completion (BLOCKING — 3 sequential actions, not a checklist)

**Action 1: Verify test suite**
Run `forge test -vv` NOW and paste the summary line showing pass/fail count.
Do NOT write "all tests pass" without running the command. The output is the proof.

**Action 2: Verify AUDIT_STATUS**
Run `Read("claude_context/audits/AUDIT_STATUS.md")` and confirm every targeted finding shows FIXED status.
If any targeted finding is not marked FIXED, update it NOW.

**Action 3: Invoke verification skill**
Call `Skill(skill="verification-before-completion")` as a tool call NOW.
This is the final quality gate. Do NOT skip this because "work is already done."
**WHY:** V1 and V2 both scored 0% on this skill invocation. The checklist format invited batch-checking ("I think these are all true"). Sequential actions require doing each one (see E-G19).

**(THOROUGH mode only — after Action 3):**
- Fix report written to `claude_context/reports/`
- `INDEX.md` updated
- No new slither high/critical findings introduced

## Principles (enforced via gates above — this section is reference only)

1. **Group by root cause** — don't fix findings one-by-one if they share a cause (enforced in Step 1 brainstorming)
2. **Test after each cluster** — not after all clusters (enforced in per-cluster ⛔ GATE item 1)
3. **Architecture over patches** — prefer design improvements over band-aids (THOROUGH mode selection)
4. **Cross-facet awareness** — check if a fix in one facet affects others (verify during per-cluster testing)
5. **Preserve existing tests** — if tests fail due to new checks, update test expectations (not remove checks)
6. **Re-read skill after compaction** — see POST-COMPACTION GATE

Note: "Commit after each cluster" was moved into the per-cluster ⛔ GATE (item 3) because it failed as a rule in both V1 and V2 (see E-G19).

## Key Skills (INVOKE via Skill tool — writing the name in text is NOT invoking, see E-G13)

### Always required
- `brainstorming` — Step 1
- `writing-plans` — Step 5
- `verification-before-completion` — Final gate

### THOROUGH mode only
- `building-secure-contracts:guidelines-advisor` — Step 4
- `building-secure-contracts:secure-workflow-guide` — Step 4 + Phase 3
- `building-secure-contracts:token-integration-analyzer` — Step 4 (if token-related)
- `building-secure-contracts:code-maturity-assessor` — Phase 3 (if architecture changed)

## Rules
1. NEVER enable `via_ir` — use scoping blocks, structs, local variable reduction
2. ALWAYS use custom errors from `ISharedErrors.sol`, never string errors
3. ALL constants in `Constants.sol`, never hardcode magic numbers
4. Run `forge test -vv` after every change
5. Follow checks-effects-interactions pattern for ALL external calls
6. Storage structs are append-only — never reorder or remove fields

## Output
- Code: `contracts/src/`, tests: `contracts/test/`
- Reports: `claude_context/reports/` using report template

## Self-Improvement
1. Fixed finding → update `claude_context/audits/AUDIT_STATUS.md`
2. New pitfall during fix → append to `claude_context/errors/blockchain.md`
3. Architecture changed → update `claude_context/technical/SMART_CONTRACTS.md`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
