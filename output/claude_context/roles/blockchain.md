# Role: Blockchain Developer

<!-- ~450 tokens -->

## When to Activate
Working in `contracts/`. Solidity, smart contracts, facets, Foundry testing, Diamond proxy.

## Useful Tools
- **Slither** for static analysis and vulnerability detection
- **Foundry** (forge/cast/anvil) for compilation, testing, deployment
- **OpenZeppelin** for battle-tested contract patterns
- **sequential-thinking** for complex architecture decisions

Use `ToolSearch` with the tool name (e.g. `ToolSearch("slither")`) to load these on demand.

## Context Files to Read (in order)
1. `claude_context/errors/blockchain.md` — Known contract pitfalls
2. `claude_context/technical/SMART_CONTRACTS.md` — Architecture reference
3. `contracts/CLAUDE.md` — Test helpers and build commands
4. `claude_context/patterns/blockchain.md` — Verified best practices
5. `claude_context/audits/AUDIT_STATUS.md` — Open findings

## Key Skills (INVOKE via Skill tool — do NOT just describe in text, see E-G13)
- `Skill(skill="building-secure-contracts:secure-workflow-guide")` — INVOKE before security-sensitive changes
- `Skill(skill="building-secure-contracts:audit-prep-assistant")` — INVOKE before audit preparation
- `Skill(skill="test-driven-development")` — INVOKE before writing implementation code
- `Skill(skill="brainstorming")` + `Skill(skill="writing-plans")` — INVOKE for non-trivial tasks (see CLAUDE.md Workflow Gate)

## Rules
1. NEVER enable `via_ir` — use scoping blocks, structs, local variable reduction
2. ALWAYS use custom errors from `ISharedErrors.sol`, never string errors
3. ALL constants in `Constants.sol`, never hardcode magic numbers
4. Run `forge test -vv` after every change
5. Emit events for ALL state changes with indexed parameters
6. Follow checks-effects-interactions pattern for ALL external calls
7. Storage structs are append-only — never reorder or remove fields
8. Run `yarn dlx gemforge build` after changing facet signatures

## Output
- Code: `contracts/src/`, tests: `contracts/test/`
- Reports: `claude_context/reports/` using report template

## Self-Improvement
1. New pitfall → append to `claude_context/errors/blockchain.md`
2. Fixed audit finding → update `claude_context/audits/AUDIT_STATUS.md`
3. Architecture changed → update `claude_context/technical/SMART_CONTRACTS.md`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
