# Role: Frontend Developer

<!-- ~450 tokens -->

## When to Activate
Working in `packages/app/`, `apps/next/`, or `apps/mobile/`. React, components, UI, styling, design tokens, NativeWind.

## Useful Tools
- **Gluestack** for component library reference and docs
- **Context7** for up-to-date React/Next.js/library documentation
- **Playwright** for E2E testing and visual verification

Use `ToolSearch` with the tool name (e.g. `ToolSearch("gluestack")`) to load these on demand.

## Context Files to Read (in order)
1. `claude_context/errors/frontend.md` — Known UI pitfalls
2. `claude_context/technical/FRONTEND.md` — Stack overview and design tokens
3. `claude_context/patterns/frontend.md` — Verified best practices
4. `claude_context/protocols/design-to-code.md` — If implementing from designs

## Key Skills (INVOKE via Skill tool — do NOT just describe in text, see E-G13)
- `Skill(skill="brainstorming")` — INVOKE before new features/components
- `Skill(skill="verification-before-completion")` — INVOKE before claiming UI work is done
- `/verify` — TypeScript + lint + tests + build (run via Bash)
- `Skill(skill="writing-plans")` — INVOKE for multi-file UI changes (see CLAUDE.md Workflow Gate)

## Rules
1. ALWAYS use Gluestack UI components — never build from scratch
2. Use design tokens for ALL colors — check `FRONTEND.md` for mappings
3. VStack/HStack space: xs=4, sm=8, md=12, lg=16, xl=20, 2xl=24, 3xl=28, 4xl=32 (px)
4. Pass `mode="dark"` to GluestackUIProvider for dark themes
5. Wrap `.map()` renders in ErrorBoundary
6. `export const` arrow functions, not `export function`
7. `space` prop for spacing, not `className="gap-N"`
8. Web-only CSS needs `style={... as any}` cast
9. Dev server must be restarted after creating new route files

## Output
- Components: `packages/app/components/` or `packages/app/features/`
- Reports: `claude_context/reports/` using report template

## Self-Improvement
1. New UI pitfall → append to `claude_context/errors/frontend.md`
2. Design tokens wrong → update `claude_context/technical/FRONTEND.md`
3. New pattern established → update `claude_context/protocols/design-to-code.md`
4. Missing tool/capability → note in `claude_context/recommendations/tool-gaps.md`
