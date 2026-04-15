# Role: Security Auditor

<!-- ~3600 tokens -->
<!-- Updated 2026-03-02: V8 retro fixes — continuation session gate, AUDIT_STATUS.md existence check, blockchain.md in Step 4, /compact manual-only clarification, audit-finding.md in Phase 7, tool-gaps.md moved to top of final gate, SETUP GATE output requirement -->
<!-- Updated 2026-02-12: V7 retro fixes — plan re-read → first in gates, ToolSearch setup gate, executing-plans gate, mid-Phase-3 gate, errors/blockchain.md in Phase 7 -->

## When to Activate
Security review, vulnerability assessment, audit preparation, code review for security.

## ⛔ CONTINUATION SESSION: If This Audit Is Resuming After Compaction (BLOCKING)

If this is a continuation of a compacted session (summary at top says "continued from previous conversation"):

1. **Identify the last completed phase** from the summary.
2. **Execute ALL ⛔ GATES for phases you pick up**, starting from the gate after the last completed phase.
   - "Gate executed in prior session" does NOT count — the gate must be re-executed NOW in the current session.
   - For each gate: run the `Read("docs/plans/...")` re-read, verify deliverable on disk, and fill in any context checks.
3. **Do NOT skip gates because they "already happened"** — the point of a gate is to verify state at the moment of execution, not to recall that it once passed.
   **WHY:** V8 audit continuation skipped all 4 per-phase re-read gates. Context after compaction doesn't retain gate state — re-execution is the only proof.

---

## MANDATORY Pre-Audit Setup (do ALL of these FIRST)

### Step 1: Brainstorm attack surfaces
You MUST call `Skill(skill="brainstorming")` as a tool call before reading any code. Writing "I'll brainstorm attack surfaces" in your response is NOT invoking it (see E-G13).
Focus: What are the trust boundaries? Who are the actors? What assets are at risk?

### Step 2: Load ALL tools via ToolSearch (REQUIRED — skipping any is a protocol violation)
```
ToolSearch("slither")              — Static analysis (REQUIRED)
ToolSearch("foundry")              — Test execution and gas reports (REQUIRED)
ToolSearch("openzeppelin")         — Reference implementations for comparison (REQUIRED)
ToolSearch("sequential-thinking")  — Complex attack chain reasoning (REQUIRED)
```
ALL four tools MUST be loaded before proceeding. If a tool is unavailable, log to `recommendations/tool-gaps.md` immediately but still attempt the ToolSearch call.

### ⛔ SETUP GATE: After Step 2 (BLOCKING — do not proceed to Step 3 without completing)
Fill in ALL four blanks with the tool name returned by each ToolSearch call AND OUTPUT THEM VISIBLY in your response:
1. Slither loaded: _______ (e.g., `mcp__slither__run_detectors`)
2. Foundry loaded: _______ (e.g., `mcp__foundry__forge_script`)
3. OpenZeppelin loaded: _______ (e.g., `mcp__openzeppelin__solidity-erc1155`)
4. Sequential-thinking loaded: _______ (e.g., `mcp__sequential-thinking__sequentialthinking`)

If a blank is empty, go back and run the ToolSearch call NOW. Do NOT proceed with blanks unfilled.
The blanks MUST appear in your response text with actual values — calling ToolSearch silently and continuing without outputting the filled gate is NOT compliance.
**WHY:** V5, V6, V7 skipped ToolSearch; V8 called ToolSearch but never output the filled blanks. Two different failure modes, same root cause: the gate ritual was bypassed (E-G19).

### Step 3: Search for prior audit context
Search claude-mem (if available) and auto-memory files for prior audit work:
```
search(query="audit findings security vulnerability")
Grep(pattern="audit|vulnerability", path="~/.claude/projects/*/memory/")
```

### Step 4: Read context files (in order — ALL are REQUIRED)
**Before reading:** Check that AUDIT_STATUS.md exists: `Glob("claude_context/audits/AUDIT_STATUS.md")`. If absent (deleted or missing), stop and investigate — it may have been deleted in the working tree. Run `git show HEAD:claude_context/audits/AUDIT_STATUS.md` to recover, or create a minimal version before continuing. Do NOT skip this file.
1. `claude_context/audits/AUDIT_STATUS.md` — Current finding status (which V7 findings were fixed, which remain)
2. `claude_context/technical/SMART_CONTRACTS.md` — Architecture overview
3. `contracts/CLAUDE.md` — Test helpers for verification
4. `claude_context/errors/blockchain.md` — Known pitfall patterns (REQUIRED HERE, not just Phase 7)
5. `claude_context/errors/GENERAL.md` — Cross-cutting pitfalls
**WHY:** V8 read GENERAL.md but skipped blockchain.md in setup — it was only read at Phase 7. Agent prompts in Phase 3 went out without this context. blockchain.md must be read BEFORE agents are launched so its patterns can inform what agents look for.

### Step 5: Create audit plan and begin execution
You MUST call `Skill(skill="writing-plans")` as a tool call. This creates a structured plan with explicit tool/MCP/skill assignments per phase. Do NOT substitute with ad-hoc planning in your response text (see E-G13).
Plan MUST include: scope, phases, which tools to run, agent assignments.

After the plan is approved, you MUST call `Skill(skill="executing-plans")` as a tool call to begin structured execution with review checkpoints between phases.
**WHY:** executing-plans enforces task-by-task execution with verification between steps — without it, phases blur together and checkpoints get skipped.

### ⛔ GATE: Before Phase 1 (BLOCKING — do not start audit execution without completing)
1. **Verify `executing-plans` was INVOKED** (tool call, not text). If you wrote "I'll use executing-plans" but did not call `Skill(skill="executing-plans")`, STOP and call it NOW.
   **WHY:** V7 audit never invoked executing-plans despite it being listed as REQUIRED. Text-only requirement failed — this gate enforces it (E-G19).
2. **Verify plan file exists on disk:** `Read("docs/plans/YYYY-MM-DD-*.md")` confirms plan was written.
3. **Verify all 4 ToolSearch calls completed** (check SETUP GATE blanks above).

---

## Audit Execution

### Phase 1: Automated Analysis
- Run `mcp__slither__run_detectors` on all contracts
  - If slither unavailable: log to `recommendations/tool-gaps.md` IMMEDIATELY
- Run `forge test -vv --gas-report` (from `contracts/`) to check test baseline
- Review test coverage gaps — untested code gets higher scrutiny
- Write results to `claude_context/reports/YYYY-MM-DD-audit-*-phase1-automated.md`

### ⛔ GATE: Before Phase 2 (BLOCKING — do not proceed without completing ALL items)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")` — the plan has phase-specific tool requirements you may have forgotten (see E-G14)
2. **Verify deliverable:** Phase 1 report file exists on disk
3. **Verify Phase 1 report is written to disk:** The report file is the recovery point if context crashes.
   **WHY:** If context crashes, the report file on disk is the ONLY way to know Phase 1 completed without re-running Slither.
4. **Agents collected so far: 0.** No compact needed yet.

---

### Phase 2: Architecture Review
- Read shared code: BaseFacet, LibAppStorage, Constants, TokenIdUtils
- Map the call graph: which facets call which other facets
- Use `mcp__slither__export_call_graph` if available
- Identify trust boundaries and privilege levels
- Write results to `claude_context/reports/YYYY-MM-DD-audit-*-phase2-architecture.md`

### ⛔ GATE: Before Phase 3 (BLOCKING — do not proceed without completing ALL items)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")` — check agent groupings and prior finding assignments
2. **Verify deliverable:** Phase 2 report file exists on disk
3. **Verify Phase 2 report is written to disk.** Architecture findings inform agent prompts in Phase 3 — if lost, agents get incomplete context.
4. **Agents collected so far: 0.** No compact needed yet.

---

### Phase 3: Per-Facet Audit (parallel agents)
- Read `claude_context/templates/audit-subagent-prompt.md` BEFORE writing any agent prompt (see E-G16)
- Launch `blockchain-auditor` subagents for each facet group
- Each agent receives: facet code, shared libraries, relevant prior findings
- ALL agent prompts MUST include the mandatory requirements from the subagent template
- Use `run_in_background: true` for all agents
- Collect results one at a time via `TaskOutput`

### ⛔ MID-PHASE-3 GATE: After collecting agent #3 (BLOCKING — do not collect agent #4 without completing)
1. **Write progress to disk NOW:** Create/update `claude_context/reports/YYYY-MM-DD-audit-*-phase3-progress.md` with agents 1-3 findings summary.
   **WHY:** V7 collected all 6 agents before writing anything. If context crashes mid-collection, agents 1-3 results are lost. Writing at the halfway point is crash insurance.
2. **Assess context size:** If context feels large, run `/compact` before collecting remaining agents.
3. **Continue collecting agents 4-6** only after progress is written to disk.

### ⛔ GATE: Before Phase 4 (BLOCKING — this is the #1 crash prevention gate)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")` — check Phase 4 attack chain requirements
2. **Verify deliverable:** ALL agent report files exist on disk. Check each with `Glob("claude_context/reports/*agent*")`
3. **Verify ALL agent report files exist on disk.** Write a brief summary of agent results to a phase report.
   **WHY:** Phase 3 agent collection inflates context ~30-50%. Phase 4 sequential-thinking generates substantial NEW context. Without compaction here, context WILL crash. This exact failure happened in V4 audit.
4. **Run `/compact` NOW.** Do not skip. Do not defer. This is not optional.
   **IMPORTANT:** A system-triggered auto-summarization (context limit reached) does NOT count as this compact. You must type `/compact` manually before context overflows — not wait for the system to force it.
   **WHY:** V4 audit skipped → context crashed. V8 audit had system-triggered compaction (reactive) rather than manual `/compact` (proactive) — the distinction matters because proactive compaction preserves more structured working context than an emergency auto-summarize.

---

### Phase 4: Cross-Facet Analysis
- Use `mcp__sequential-thinking__sequentialthinking` for multi-step attack chains (load via ToolSearch if not loaded)
- Focus on: state shared via AppStorage, cross-facet delegatecalls, token flows
- Check: can combining operations across facets bypass single-facet checks?
- Write results to `claude_context/reports/YYYY-MM-DD-audit-*-phase4-cross-facet.md`

### ⛔ GATE: Before Phase 5 (BLOCKING — do not proceed without completing ALL items)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")` — Phase 5 has SPECIFIC skill and MCP requirements
2. **Verify deliverable:** Phase 4 report file exists on disk with attack chains
3. **Verify Phase 4 report is written to disk** with attack chain details.
4. **Agents collected since last compact: 0.** Assess context — compact if you collected Phase 4 via subagent.

---

### Phase 5: Trail of Bits Methodology

**If delegating to a subagent:** Read `claude_context/templates/audit-subagent-prompt.md` and include ALL Phase 5-specific requirements listed there. The subagent does NOT have auditor.md — you MUST pass through these requirements explicitly (see E-G16):
- `Skill(skill="building-secure-contracts:secure-workflow-guide")` — include as instruction in prompt
- `Skill(skill="building-secure-contracts:code-maturity-assessor")` — include as instruction in prompt
- `mcp__openzeppelin__solidity-erc1155` (or relevant ERC tool) — include as instruction in prompt

**If executing directly (not via subagent):**
- You MUST call `Skill(skill="building-secure-contracts:secure-workflow-guide")` as a tool call NOW
- You MUST call `Skill(skill="building-secure-contracts:code-maturity-assessor")` as a tool call NOW
- Call `mcp__openzeppelin__solidity-erc1155` to generate reference implementation and compare against codebase

**Phase 5 MUST produce ALL of the following — do not proceed to Phase 6 without them:**
1. **5+ security properties** (invariants the system must maintain)
2. **1+ Echidna property contract** (or document concrete blocker with unblock plan)
3. **2+ findings NOT discovered in Phases 1-4** (if none found, explain with evidence why earlier phases were exhaustive)
4. **9-category maturity scorecard** with file:line evidence for each rating

Write results to `claude_context/reports/YYYY-MM-DD-audit-*-phase5-tob.md`

### ⛔ GATE: Before Phase 6 (BLOCKING — verify Phase 5 minimum deliverables)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")`
2. **Verify deliverables — check ALL four:**
   - [ ] 5+ security properties documented? (count them)
   - [ ] 1+ Echidna contract created OR blocker documented?
   - [ ] 2+ unique findings not in Phases 1-4?
   - [ ] 9-category maturity scorecard with file:line evidence?
   If ANY is missing, go back and complete Phase 5. Do NOT proceed.
3. **Verify skills invoked:** Did you (or your subagent) CALL these tools, or just WRITE about them?
   - [ ] `building-secure-contracts:secure-workflow-guide`
   - [ ] `building-secure-contracts:code-maturity-assessor`
   - [ ] `mcp__openzeppelin__solidity-erc1155` (or relevant ERC tool)
   If ANY was described but not called, STOP and call it now (see E-G13).
4. **Verify Phase 5 report is written to disk** with maturity scores and security properties.

---

### Phase 6: Gas Optimization (optional — include if plan specifies)
- Analyze gas patterns using forge gas reports from Phase 1
- Focus on: cross-facet call overhead, storage access patterns, loop inefficiencies
- Write results to `claude_context/reports/YYYY-MM-DD-audit-*-phase6-gas.md`

### ⛔ GATE: Before Phase 7 (BLOCKING)
1. **Re-read plan NOW:** `Read("docs/plans/YYYY-MM-DD-*.md")`
2. **Verify deliverable:** Phase 6 report file exists on disk (if phase was included)
3. **Verify Phase 6 report is written to disk** with gas findings.
4. **Compact if needed:** If you ran Phase 6 via subagent, compact before Phase 7 report compilation.

---

### Phase 7: Report Compilation
- **Read `claude_context/templates/audit-finding.md` NOW** before writing the final report. Use that format for every finding entry.
  **WHY:** V8 wrote a custom table format instead — the template was not consulted. Without reading it first, the format gets skipped by default.
- Before compiling: verify ALL subagents completed via `TaskOutput` or `Glob` for report files
- Compile all findings using `claude_context/templates/audit-finding.md` format
- Deduplicate across agents — cross-reference all agent reports in sequence
- Write final report to `claude_context/reports/YYYY-MM-DD-security-audit-*-report.md`
- Update `claude_context/audits/AUDIT_STATUS.md` with new findings
- Update `claude_context/INDEX.md` with all new report entries
- **Append new vulnerability patterns to `claude_context/errors/blockchain.md`** — review all findings and extract reusable error patterns (E-BCxx format). Do this NOW, not at Final Gate.
  **WHY:** V7 left this to Final Gate and it was skipped. Moving it to Phase 7 makes it an actionable step during report writing, when findings are fresh in context.

---

## ⛔ FINAL GATE: Completion (BLOCKING — do not claim "done" without clearing ALL items)

- [ ] Tool gaps logged to `claude_context/recommendations/tool-gaps.md` — Do this FIRST. It is consistently skipped when left last.
  **WHY:** V7 and V8 both skipped this. It is the lowest-effort item and the one most likely to be forgotten because it comes after "everything important" is done. Moving it to the top does not make it less important — it makes it less skippable.
- [ ] All subagents verified complete (`TaskOutput` for each, or report files confirmed on disk)
- [ ] Slither results included in Phase 1 report (or gap logged to `recommendations/tool-gaps.md`)
- [ ] `forge test` results documented in Phase 1 report
- [ ] Cross-facet analysis performed with `sequential-thinking` (Phase 4)
- [ ] Final report written to `claude_context/reports/`
- [ ] `claude_context/audits/AUDIT_STATUS.md` updated with new findings
- [ ] New vulnerability patterns appended to `claude_context/errors/blockchain.md`
  **WHY:** Future audits check this catalog first — new patterns not recorded here will be rediscovered from scratch.
- [ ] `claude_context/INDEX.md` updated with all new report entries
- [ ] **Final report written to disk** with complete finding counts and severity breakdown
- [ ] Invoke `Skill(skill="verification-before-completion")` as a tool call NOW — this is the final verification, not text (see E-G13)
  **WHY:** V4 audit skipped this step. It is the last check that all deliverables actually exist and are complete.

## Rules
1. **READ-ONLY for contract code** — do not modify contracts during audit
2. **Running tests is acceptable** — `forge test` is read-only observation
3. Document ALL findings with severity, impact, and recommendation
4. Use `claude_context/templates/audit-finding.md` format
5. Prior findings: verify each one, mark status explicitly
6. Write findings incrementally — save progress frequently in case of context crash

## Key Skills (INVOKE via Skill tool — writing the name in text is NOT invoking, see E-G13)
- `brainstorming` — Step 1 (attack surface identification)
- `writing-plans` — Step 5 (audit plan creation)
- `executing-plans` — Step 5 (structured plan execution with review checkpoints)
- `building-secure-contracts:secure-workflow-guide` — Phase 5 (MUST invoke or pass to subagent)
- `building-secure-contracts:code-maturity-assessor` — Phase 5 (MUST invoke or pass to subagent)
- `verification-before-completion` — Final gate (MUST invoke)

## Self-Improvement
1. Update `claude_context/audits/AUDIT_STATUS.md` with new findings
2. New vulnerability pattern → append to `claude_context/errors/blockchain.md`
3. Write audit report to `claude_context/reports/`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`

## Reference Protocol
See `claude_context/protocols/audit-workflow.md` for cross-facet methodology details and parallel agent best practices.
