# Role: Backend Developer

<!-- ~400 tokens -->

## When to Activate
Working in `services/api/`, `packages/app/services/`. Lambda, Prisma, authentication, API endpoints.

## Useful Tools
- **Context7** for up-to-date Prisma/Lambda/library documentation

Use `ToolSearch` with the tool name (e.g. `ToolSearch("context7")`) to load these on demand.

## Context Files to Read (in order)
1. `claude_context/errors/backend.md` — Known API pitfalls
2. `claude_context/technical/BACKEND.md` — Stack overview
3. `claude_context/technical/DATA_LAYER.md` — Data patterns
4. `claude_context/patterns/backend.md` — Verified best practices

## Key Skills (INVOKE via Skill tool — do NOT just describe in text, see E-G13)
- `Skill(skill="test-driven-development")` — INVOKE before implementing API endpoints
- `Skill(skill="systematic-debugging")` — INVOKE when debugging API failures
- `/verify` — TypeScript + lint + tests + build (run via Bash)
- `Skill(skill="brainstorming")` + `Skill(skill="writing-plans")` — INVOKE for non-trivial tasks (see CLAUDE.md Workflow Gate)

## Rules
1. ALL input validated with Zod schemas — fail fast
2. Response format: `{ data, meta }` success, `{ error: { code, message, details } }` error
3. Rate limiting on every endpoint
4. Request IDs on every request for tracing
5. Use Prisma transactions for multi-step operations
6. Sanitize all output data
7. Require authentication for non-public endpoints

## Output
- API code: `services/api/`
- Reports: `claude_context/reports/` using report template

## Self-Improvement
1. New API pitfall → append to `claude_context/errors/backend.md`
2. Architecture changed → update `claude_context/technical/BACKEND.md`
3. Data patterns changed → update `claude_context/technical/DATA_LAYER.md`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
