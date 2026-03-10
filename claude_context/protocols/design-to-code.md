# Protocol: Design to Code

<!-- ~800 tokens -->

## When to Use
Converting Pencil.dev or Figma designs into Gluestack UI + NativeWind components.

## Workflow

### Phase 1: Read Design
1. Use `mcp__pencil__get_editor_state()` to check active document
2. Use `mcp__pencil__batch_get()` to read design nodes
3. Use `mcp__pencil__get_screenshot()` to capture visual reference

### Phase 2: Extract Structure
- Identify component hierarchy from design tree
- Map design elements to Gluestack UI components
- Note spacing, colors, typography from design tokens

### Phase 3: Implement Components
- Create components in `packages/app/features/{feature}/` or `packages/app/components/`
- Use `export const` arrow function style
- Use Gluestack UI components as base (Box, VStack, HStack, Text, Heading, etc.)

### Phase 4: Apply Styling
Use design tokens, NEVER hardcoded values:

#### Typography Tokens (dark mode)
| Token | Hex | CSS Class |
|-------|-----|-----------|
| typography-200 | #525252 | text-typography-200 |
| typography-300 | #737373 | text-typography-300 |
| typography-400 | #8c8c8c | text-typography-400 |
| typography-500 | #a3a3a3 | text-typography-500 |
| typography-950 | ~white | text-typography-950 |

#### Spacing (VStack/HStack space prop)
| Prop | Pixels |
|------|--------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 28px |
| 4xl | 32px |

#### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| teal-400 | #2dd4bf | Success/positive |
| error-500 | #ef4444 | Error/negative |
| green-500 | #22c55e | Positive change |

### Phase 5: Code Quality Review
- Use VStack/HStack `space` prop, not `className="gap-N"`
- Use design tokens, not hardcoded hex colors
- Web-only CSS (gradients, box-shadow) needs `style={... as any}`
- Wrap `.map()` renders in ErrorBoundary
- Complete barrel exports in index.ts
- Preview layouts must NOT have own html/body tags

### Phase 6: Visual Verification
- Start dev server (restart if new route files were created)
- Compare rendered output with design screenshot
- Iterate until pixel-accurate

## Common Mistakes
See `claude_context/errors/frontend.md` for complete list.
