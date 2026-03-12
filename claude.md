B2B fund administration platform on private blockchain. Tokenized fund shares, automated NAV processing, multi-currency settlement, class-specific cost allocation. Built for institutional fund managers replacing legacy systems like SS&C and BNY.

## ⛔ WORKFLOW GATE — Read This FIRST (see E-G09, E-G13)

**For ANY non-trivial task** (touches 3+ files, has multiple approaches, involves subagents, or is a security review):

You MUST actually INVOKE (tool call, not text) these two skills BEFORE doing anything else:

1. **`Skill(skill="brainstorming")`** — identifies requirements, attack surfaces, approaches, tool selection. Do NOT substitute your own brainstorming.
2. **`Skill(skill="writing-plans")`** — creates a reviewable plan with phases, tool/MCP/skill assignments, agent structure. Do NOT substitute `EnterPlanMode` alone.

**Checkpoint** — confirm before proceeding:
- [ ] Both skills INVOKED via tool calls (not mentioned in text)
- [ ] Plan lists ALL tools/MCPs/skills, files to read, and subagents with scope
- [ ] Prior work searched (claude-mem if available, or auto-memory/session transcripts)

For trivial tasks (single file, obvious fix, < 3 steps): skip this gate.

## Skills workflow

Skills MUST be invoked via the `Skill` tool — not described in text. Describing a skill without invoking it is error E-G13.
---
| Skill | When to INVOKE (via Skill tool) |
|-------|------------|
| `brainstorming` | **Before any creative work** — new features, components, design tokens, style guide, layout architecture decisions |
| `executing-plans` | **Before any creative work** — Use when you have a written implementation plan to execute in a separate session with review checkpoints|
| `frontend-design` | **Before any creative work** — Use this skill for UI tasks that build web components, pages, or applications.w features, components, design tokens, style guide, layout architecture decisions |
| `implement-design` | **Before any creative work** — Translates Figma designs into production-ready code with 1:1 visual fidelity. Use when implementing UI from Figma files, when user mentions "implement design", "generate code", "implement component", "build Figma design", provides Figma URLs, or asks to build components matching Figma specs. Requires Figma MCP server connection.|
| `verification-before-completion` | **Before claiming done** — run tests, verify output, check all files |
| `canvas-design` | **Before claiming done** — Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations. |
| `writing-plans` | **Before implementation** — creates a reviewable plan with phases, tool/MCP/skill assignments, agent structure |

**Required workflow chain** for non-trivial tasks (each step = actual `Skill` tool call):
```
Skill("brainstorming") → Skill("writing-plans") → Skill("frontend-design") →
  Skill("implement-design") → Skill("verification-before-completion")
```

## Gluestack MCP — Component Library

When creating any new UI component, page, or layout, use the Gluestack MCP tools **before writing code**:

1. `get_all_components_metadata` — discover available components
2. `select_components` — confirm which components to use
3. `get_selected_components_docs` — fetch full docs before generating code

**Rules:**
- Never use raw HTML tags (`<div>`, `<button>`, `<input>`, etc.) — use Gluestack components only
- No StyleSheet — use TailwindCSS via `className` prop
- Prefer `VStack`/`HStack` over `Box`
- Import all components individually
- All screens must be scrollable, responsive, and mobile-friendly

**Triggers:** user requests a new component, page, dashboard, form, table, modal, or any UI element for the fund administration platform.

## Figma Plugins

Any Figma plugins built for this project should be created in `LOCAL/plugins/<plugin-name>/`. Each plugin folder must contain at minimum `manifest.json`, `code.js`, and `ui.html`.

## Knowledge Base

All domain, product, and technical context lives in `claude_context/`. Always read `claude_context/INDEX.md` first to find relevant files — load only what's needed for the task.

**For every UI/UX task, load these before starting:**
- `claude_context/technical/FRONTEND.md` — Gluestack UI, NativeWind, design tokens, spacing
- `claude_context/errors/frontend.md` — UI pitfalls to avoid
- `claude_context/patterns/frontend.md` — verified component patterns
- `claude_context/product/OVERVIEW.md` — product context and target user

**Also load when relevant:**
- `claude_context/protocols/design-to-code.md` — Figma → Gluestack workflow
- `claude_context/templates/component.md` — component scaffold format
- `claude_context/product/FEATURES.md` — when building against existing feature inventory