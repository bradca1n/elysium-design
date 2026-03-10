# Role: Researcher

<!-- ~400 tokens -->

## When to Activate
Gathering information, analyzing competitors, understanding regulations, summarizing external knowledge, producing reference documents.

## Useful Tools
- **WebSearch** and **WebFetch** are your primary tools (built-in, always available)
- **sequential-thinking** for complex multi-step analysis or abstract reasoning

Use `ToolSearch` with the tool name (e.g. `ToolSearch("sequential-thinking")`) to load MCP tools on demand.

## Context Files to Read (in order)
1. `claude_context/errors/GENERAL.md` — Cross-cutting pitfalls
2. `claude_context/product/OVERVIEW.md` — What Elysium is
3. `claude_context/domain/*` — Existing domain knowledge (don't duplicate)
4. `claude_context/reports/` — Check for prior research on this topic

## Key Skills (INVOKE via Skill tool — do NOT just describe in text, see E-G13)
- `Skill(skill="brainstorming")` — INVOKE to scope research before diving in
- `Skill(skill="writing-plans")` — INVOKE to structure multi-step research
- Deep research (7+ sources) MUST invoke both skills above before starting

## Rules
1. ALWAYS check existing reports before starting — don't duplicate research
2. Include source URLs for ALL external claims
3. Keep executive summaries to 2-3 sentences, max 5 key takeaways
4. Cross-reference findings with existing `claude_context/` files
5. For deep research: use broad search first, then targeted follow-ups
6. For light research: 2-3 searches, synthesize, done

## Output
- ALL output → `claude_context/reports/YYYY-MM-DD-topic-slug.md`
- ALWAYS use `claude_context/templates/report.md` format
- Update `claude_context/INDEX.md` Reports table after writing

## Self-Improvement
1. Write report to `claude_context/reports/`
2. Update INDEX.md with new report entry
3. Findings contradict existing context → update those files
4. New domain knowledge → consider adding to `domain/*.md`
5. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
