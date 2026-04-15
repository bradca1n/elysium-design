# Permissions — Claude Daily Workflow

## Can Do Autonomously (No Approval Needed)

### Figma Design Work
- Create/edit components on Base Components page or Global components pages
- Apply design tokens and variables (colour, text styles, space tokens)
- Create new design tokens when needed (e.g. bg/glass, text color/filled)
- Add new component variants (e.g. Filled state for inputs/selects)
- Search and instantiate existing components
- Take screenshots for self-validation
- Arrange and organise layouts
- Create screen frames with proper token binding
- Clone/duplicate screens for state variants (error, filled, in-progress)
- Update gradient fills across multiple screens

### File Operations
- Read any project file
- Create/edit/write files within the LOCAL/ directory
- Create/edit/write files within the Elysium/ monorepo (packages/app, services/stories, etc.)
- Run the daily-summary skill when prompted
- Update memory files
- Run bash commands (installs, scripts, build tools, curl, etc.)
- Install npm/yarn dependencies

### Storybook & Frontend
- Edit component code in packages/app/components/ to match Figma designs
- Create/modify Storybook stories
- Run Storybook dev server
- Fix visual fidelity issues (fonts, spacing, colours, borders)

### Git Operations
- Git commits and pushes (when asked)
- Push to main branch on elysium-design repo

### Communication
- Send ntfy.sh notifications on elysium-design-2026 (Claude → Brad)
- Poll ntfy.sh on elysium-brad-2026 (Brad → Claude)
- Poll for messages while Brad is away

### Research & Analysis
- Explore codebase and Figma files
- Audit design system consistency (token binding, text styles, spacing)
- Review and lint designs
- Generate component documentation
- Web searches and web fetches for reference material
- Run Python scripts for asset generation (illustrations, exports)
- Install pip/brew dependencies as needed for tooling

---

## Requires Approval

### Design Decisions
- New design patterns not in the existing system
- Significant departures from brief sheet priorities
- Deleting or replacing existing components (minor cleanup/orphan removal is fine)
- Changes to existing design token values (colours, spacing, typography)
- Note: Creating NEW tokens for new use cases is autonomous (e.g. bg/glass); changing EXISTING token values requires approval

### Publishing & Sharing
- Posting comments in Figma
- Creating pull requests
- Any action visible to external collaborators

### Scope Changes
- Adding priorities not on the brief sheet
- Skipping a listed priority
- Changing the approach to an active design problem

---

## Validation Checkpoints
- After completing each top priority item → screenshot + summary for review
- After resolving each active design problem → present solution for sign-off
- Before marking any review checklist item as done → confirm with user

---

## How to Signal "Needs Attention"
When Claude needs input, it will:
1. Clearly state what's blocked and what decision is needed
2. Provide options where possible
3. Continue with other independent work while waiting
