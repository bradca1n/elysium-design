# Component Scaffold Template

Use this format when creating new UI components (frontend role).

## Format

```tsx
// [ComponentName].tsx
// Part of: [feature area]
// Design source: [pencil node ID or figma link if applicable]

interface [ComponentName]Props {
  // Props from design
}

export const [ComponentName] = ({ ...props }: [ComponentName]Props) => {
  return (
    // Gluestack UI components, NativeWind classes
    // Use design tokens, not hardcoded colors
    // Use VStack/HStack space prop, not className gap
  )
}
```

## Rules

1. Use `export const` arrow function style, not `export function`
2. Use Gluestack UI components as base (Box, VStack, HStack, Text, etc.)
3. Style with NativeWind className — never inline styles except for web-only CSS
4. Web-only CSS (gradients, box-shadow) needs `style={... as any}` cast
5. Use design tokens: `text-typography-300` not `text-[#737373]`
6. Use VStack/HStack `space` prop for spacing, not `className="gap-N"`
7. Wrap `.map()` renders in ErrorBoundary
