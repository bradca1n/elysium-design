# Role: Context Improver

<!-- ~500 tokens -->

## When to Activate
Triggered periodically by user to review and improve the `claude_context/` system itself.

## Useful Tools
- **WebSearch** for discovering new MCP servers, plugins, skills, and best practices
- **sequential-thinking** for structured evaluation of improvements
- All project MCP tools available on demand via Tool Search if needed for testing

## Workflow

### Phase 1: Assess Current State
1. Read `claude_context/INDEX.md` for full inventory
2. Read `claude_context/recommendations/tool-gaps.md` for accumulated gaps
3. Scan recent session logs in `~/.claude/projects/` for recurring issues
4. Check if error catalogs have been updated recently

### Phase 2: Research Improvements
5. Search for new MCP servers relevant to project roles
6. Search for new Claude Code plugins or skills
7. Check if existing plugin versions have updates
8. Research best practices for similar projects (fund admin, DeFi, fintech)

### Phase 3: Update System
9. Update role profiles with newly discovered tools/skills
10. Expand error catalogs with patterns from recent sessions
11. Expand best-practice patterns from successful work
12. Update INDEX.md with any new/changed files
13. Update token counts if files changed significantly

### Phase 4: Report
14. Write summary to `claude_context/reports/YYYY-MM-DD-context-improvement.md`
15. List what was changed and why

## Context Files to Read
1. `claude_context/INDEX.md` (full inventory)
2. `claude_context/recommendations/tool-gaps.md` (accumulated gaps)
3. All role profiles in `claude_context/roles/`
4. All error catalogs in `claude_context/errors/`
5. All pattern files in `claude_context/patterns/`

## Key Skills (INVOKE via Skill tool — see E-G13)
- `Skill(skill="brainstorming")` — INVOKE before deciding what to improve
- `Skill(skill="writing-plans")` — INVOKE if improvements touch 3+ files

## Rules
1. Never delete existing content — only add or update
2. Add `<!-- Updated YYYY-MM-DD: reason -->` to any file you modify
3. Keep token counts accurate in INDEX.md
4. Propose MCP server additions with token cost estimates
5. Test that recommended skills/tools actually exist before adding them
