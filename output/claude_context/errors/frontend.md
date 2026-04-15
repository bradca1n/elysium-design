<!-- ~800 tokens -->
# Frontend Error Catalog

UI and component pitfalls specific to the Elysium React Native / Next.js frontend (Gluestack UI, NativeWind, TanStack Query).

## E-FE01: Using `export function` Instead of Arrow Style
- **Pattern:** Writing `export function MyComponent() { ... }` for component declarations.
- **Fix:** Use `export const MyComponent = () => { ... }` arrow function style consistently across all components.
- **Discovered:** 2026-02-08

## E-FE02: Using `className="gap-X"` Instead of VStack/HStack `space` Prop
- **Pattern:** Applying spacing between children via Tailwind `gap-*` classes on VStack or HStack.
- **Fix:** Use the `space` prop on VStack/HStack components: `<VStack space="md">`. The `space` prop is the Gluestack-native way to handle child spacing.
- **Discovered:** 2026-02-08

## E-FE03: Forgetting ErrorBoundary Around `.map()` Items
- **Pattern:** Rendering a list with `.map()` without wrapping items in an ErrorBoundary, so one broken item crashes the entire list.
- **Fix:** Wrap mapped items in an ErrorBoundary component so a single item failure does not take down the whole list.
- **Discovered:** 2026-02-08

## E-FE04: Duplicating Formatters Across Components
- **Pattern:** Writing local `formatCurrency()`, `formatPercent()`, or `formatDate()` functions inside multiple components.
- **Fix:** Use the shared `formatters.ts` utility. If a formatter does not exist there, add it once and import everywhere.
- **Discovered:** 2026-02-08

## E-FE05: Wrong Import Ordering
- **Pattern:** Imports in a single unsorted block with no blank-line separators between external, internal, and relative imports.
- **Fix:** Group imports: (1) external packages, (2) internal packages (`@elysium/*`), (3) relative imports. Separate groups with blank lines. Alphabetize within each group.
- **Discovered:** 2026-02-08

## E-FE06: Hardcoded Hex Colors Instead of Design Tokens
- **Pattern:** Using `text-[#777]`, `bg-[#1a1a1a]`, or other arbitrary hex values in className strings.
- **Fix:** Use design token classes: `text-typography-300`, `bg-background-950`, etc. The token system is defined in `config.ts` and mapped through `tailwind.config.ts`.
- **Discovered:** 2026-02-08

## E-FE07: Missing Dark Mode on GluestackUIProvider
- **Pattern:** Rendering a dark-themed page without passing `mode="dark"` to GluestackUIProvider, resulting in light-mode defaults.
- **Fix:** Always pass `mode="dark"` to GluestackUIProvider for dark-themed pages. Example: `<GluestackUIProvider mode="dark">`.
- **Discovered:** 2026-02-08

## E-FE08: Preview Layout With Own HTML/Body Tags
- **Pattern:** Adding `<html>` and `<body>` tags in a preview or sub-layout when the root layout already provides them.
- **Fix:** Preview and sub-layouts must NOT include their own `<html>` or `<body>` tags. The root layout handles document structure.
- **Discovered:** 2026-02-08

## E-FE09: Forgetting to Add Routes to PUBLIC_ROUTES
- **Pattern:** Creating a new page that should be accessible without authentication but forgetting to register its path in the public routes constant.
- **Fix:** Add the route path to `PUBLIC_ROUTES` in `packages/app/constants/routes.ts` for any page that should bypass auth.
- **Discovered:** 2026-02-08

## E-FE10: Incomplete Barrel Exports in index.ts
- **Pattern:** Creating new components in a feature directory but not re-exporting them from the directory's `index.ts` barrel file.
- **Fix:** After creating or renaming a component, update the `index.ts` barrel file to export it. Every public component must be listed.
- **Discovered:** 2026-02-08

## E-FE11: Wrong VStack/HStack Space Values
- **Pattern:** Assuming incorrect pixel mappings for space prop values (e.g., thinking `sm=6px`, `md=8px`, `lg=12px`).
- **Fix:** The correct mappings are: `xs=4px`, `sm=8px`, `md=12px`, `lg=16px`, `xl=20px`, `2xl=24px`, `3xl=28px`, `4xl=32px`. Reference these when matching designs.
- **Discovered:** 2026-02-08

## E-FE12: Building UI From Scratch Instead of Using Gluestack Components
- **Pattern:** Creating custom `<div>` or `<View>` based UI elements (buttons, inputs, modals, cards) when Gluestack UI already provides them.
- **Fix:** Always check Gluestack UI's component library first. Use `Button`, `Input`, `Modal`, `Card`, `Badge`, `Avatar`, etc. from `@gluestack-ui/themed`. Only build custom when no suitable Gluestack component exists.
- **Discovered:** 2026-02-08
