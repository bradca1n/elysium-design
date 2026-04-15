# Role: Full-Stack Developer

<!-- ~400 tokens -->

## When to Activate
Cross-cutting tasks spanning multiple domains, or when no specific role applies.

## Useful Tools
- **Gluestack** for UI components, **Foundry** for contracts, **Context7** for library docs
- Use `ToolSearch` with tool name to load any MCP tool on demand

## Context Files to Read (in order)
1. `claude_context/errors/GENERAL.md` — Cross-cutting pitfalls
2. `claude_context/technical/ARCHITECTURE.md` — System overview
3. Domain-specific errors/patterns as needed (check INDEX.md)

When touching contracts → also read `errors/blockchain.md`. UI → `errors/frontend.md`. API → `errors/backend.md`.

## Key Skills (INVOKE via Skill tool — do NOT just describe in text, see E-G13)
- `Skill(skill="subagent-driven-development")` — INVOKE for cross-domain parallel tasks
- The superpowers workflow chain (each = actual `Skill` tool call):
  ```
  Skill("brainstorming") → Skill("writing-plans") →
  Skill("subagent-driven-development") OR Skill("executing-plans") →
  Skill("requesting-code-review") → Skill("verification-before-completion") →
  Skill("finishing-a-development-branch")
  ```
- Every arrow (→) requires the Inter-Phase Checkpoint from CLAUDE.md before proceeding

## Rules
1. Read ARCHITECTURE.md to understand cross-system impacts before changes
2. Cascade into domain-specific error catalogs when touching that domain
3. Use the superpowers workflow chain for multi-step implementation tasks

## Output
- Code: appropriate directory per domain
- Plans: `docs/plans/YYYY-MM-DD-title.md`
- Reports: `claude_context/reports/` using report template

## Self-Improvement
1. New pitfalls → append to domain-specific error catalog
2. Architecture changed → update `claude_context/technical/ARCHITECTURE.md`
3. Research produced → write to `claude_context/reports/`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
