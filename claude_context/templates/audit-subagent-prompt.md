# Audit Subagent Prompt Template

<!-- ~400 tokens -->
<!-- Created 2026-02-09: Solves instruction chain break when delegating to subagents (E-G16) -->

## Why This Exists

Subagents do NOT inherit `auditor.md` or the audit plan. When you delegate a phase to a subagent, the subagent only knows what you put in its prompt. If you forget to include a requirement, the subagent will skip it — and you won't notice until the retrospective.

**Read this template BEFORE writing any audit subagent prompt.**

## Mandatory Requirements (include in ALL audit subagent prompts)

Copy this block into every audit subagent prompt:

```
You MUST:
1. Write your detailed findings to `claude_context/reports/YYYY-MM-DD-audit-[name].md`
2. Return ONLY a concise summary to the parent: list each finding as `[SEVERITY] ID: one-line description`. Max 2000 characters in your return value.
3. Use the `claude_context/templates/audit-finding.md` format for each finding.
4. For EVERY prior finding assigned to you, explicitly state: STILL PRESENT, FIXED, PARTIALLY FIXED, or NOT FOUND (with evidence).
```

## Phase-Specific Requirements

### Phase 3 (per-facet audit) subagents
No additional tool requirements beyond the mandatory rules above.

### Phase 4 (cross-facet analysis) subagents
Add to prompt:
```
You MUST call `ToolSearch("sequential-thinking")` and use
`mcp__sequential-thinking__sequentialthinking` for multi-step attack chain analysis.
```

### Phase 5 (Trail of Bits) subagents
Add to prompt:
```
You MUST call these skills via the Skill tool (tool calls, not text descriptions):
- Skill(skill="building-secure-contracts:secure-workflow-guide")
- Skill(skill="building-secure-contracts:code-maturity-assessor")

You MUST call this MCP tool to generate a reference implementation:
- ToolSearch("openzeppelin"), then call the relevant generator
  (e.g., mcp__openzeppelin__solidity-erc1155 for ERC1155 projects)
- Compare the generated reference against the codebase implementation

You MUST produce ALL of these deliverables:
1. 5+ security properties (invariants)
2. 1+ Echidna property contract (Solidity file) OR documented blocker with unblock plan
3. 2+ findings NOT in Phases 1-4
4. 9-category maturity scorecard with file:line evidence
```

### Phase 6 (gas optimization) subagents
No additional tool requirements beyond the mandatory rules.

## Prompt Assembly Pattern

When writing a subagent prompt, assemble it in this order:
1. Role and scope description
2. Mandatory requirements (copy from above)
3. Phase-specific requirements (copy the relevant phase section above)
4. Facet code references (which files to read)
5. Prior findings to verify (list specific IDs)
6. Architecture context (relevant findings from Phase 2)
