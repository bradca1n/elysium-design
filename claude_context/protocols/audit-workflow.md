# Protocol: Smart Contract Security Audit

<!-- ~1100 tokens -->
<!-- Updated 2026-02-12: AI-native rewrite, countable triggers, inline gates in auditor.md. Fixed claude-mem write refs (read-only). -->

## When to Use
- Full security audit of smart contracts
- Pre-deployment review
- Post-change security assessment

## When to Use Quick Review Instead
- Single-function change with clear scope
- Adding events or view functions only
- Test-only changes

## Workflow Summary

```
brainstorming → tool-loading → claude-mem-search → context-reading →
  writing-plans → executing-plans →
  Phase 1 (automated) → ⛔ GATE →
  Phase 2 (architecture) → ⛔ GATE →
  Phase 3 (parallel agents) → ⛔ GATE (MANDATORY COMPACT) →
  Phase 4 (cross-facet) → ⛔ GATE →
  Phase 5 (Trail of Bits) → ⛔ GATE (verify deliverables) →
  Phase 6 (gas, optional) → ⛔ GATE →
  Phase 7 (report) → ⛔ FINAL GATE (verification-before-completion)
```

Each ⛔ GATE is defined inline in `claude_context/roles/auditor.md` after its phase. Gates are blocking prerequisites for the next phase — not optional checklists. Every gate includes:
1. Verify deliverable exists on disk
2. Write progress to disk (report files, status updates)
3. Re-read plan file via Read() tool call
4. Phase-specific context management (countable trigger, not percentage)

## Cross-Facet Analysis Methodology

This is the highest-value phase. Per-facet audits catch ~70% of bugs; cross-facet analysis catches the remaining ~30% which are often the most critical.

### Using sequential-thinking MCP
You MUST call `ToolSearch("sequential-thinking")` to load this tool, then use for multi-step attack scenarios:
1. Identify all cross-facet calls (via call graph or manual mapping)
2. For each trust boundary crossing, ask: "What if the caller manipulates state before this call?"
3. Trace token flows end-to-end: mint → transfer → lock → burn
4. Check for TOCTOU: state read in one facet, used in another after delay
5. Verify shared storage invariants hold across all writers

### Common cross-facet vulnerability patterns
- **Dual state tracking**: Two facets maintain the same value (e.g., totalSupply) independently
- **Bypass via alternative path**: Normal flow checks X; admin/force flow skips X
- **RBAC inconsistency**: Different facets require different roles for equivalent operations
- **State machine violations**: One facet transitions state without notifying dependent facets

## Parallel Agent Structure

### Small codebase (<10 contracts)
- 2-3 agents, each covering 3-5 contracts
- Personal cross-facet review

### Medium codebase (10-30 contracts)
- 5-7 agents, grouped by domain (token, order, admin, view)
- Dedicated cross-facet agent with call graph

### Large codebase (30+ contracts)
- 8-10 agents, one per major facet
- Dedicated cross-facet agent
- Dedicated shared-code/library agent

## Agent Context Management (countable triggers — not percentages)

**The #1 cause of audit session crashes is parallel subagents returning large results simultaneously.**

### Mandatory Rules

1. **Every subagent prompt MUST include requirements from `claude_context/templates/audit-subagent-prompt.md`.** Read this template BEFORE writing any agent prompt (see E-G16).

2. **Use `run_in_background: true`** for all audit subagents. Check results one at a time via `TaskOutput`.

3. **After collecting every 3 agent results:** Write progress to disk (phase reports, status updates). Then assess whether to compact.
   **WHY:** 3 agent collections = ~6,000-9,000 tokens of new context. This is a safe batch size. Collecting all 6+ at once risks overflow.

4. **Before starting Phase 4:** MANDATORY compact. Phase 3 agent collection inflates context ~30-50%. Phase 4 sequential-thinking generates substantial new context. Skipping this compact caused the V4 audit context crash.

5. **Never launch new agents after collecting 6+ agent results without compacting first.**

6. **If you notice responses getting truncated or tools failing:** You are near context limit. Write any unsaved findings to disk IMMEDIATELY, then compact.

## Report Quality Criteria
- Every finding has: severity, location (file:line), description, impact, recommendation
- Prior findings explicitly verified with status (OPEN/FIXED/MITIGATED)
- Statistics table with severity counts
- Priority remediation order
- Report written incrementally (not all at end)

## Reference
- Role profile: `claude_context/roles/auditor.md` (primary — contains all gates)
- Subagent prompt template: `claude_context/templates/audit-subagent-prompt.md`
- Finding template: `claude_context/templates/audit-finding.md`
- Prior audits: `claude_context/audits/`
