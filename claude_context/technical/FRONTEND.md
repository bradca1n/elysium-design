# Frontend Architecture

<!-- ~800 tokens -->

## Stack

| Technology | Location | Purpose |
|-----------|----------|---------|
| Next.js 15 | `apps/next/` | Web application (React 19, App Router) |
| Expo | `apps/mobile/` | Native mobile app (iOS/Android) |
| Shared code | `packages/app/` | UI components, features, hooks, theme |
| Data layer | `packages/data/` | Offline-first storage, sync, React Query hooks |
| Auth | `packages/auth/` | Privy authentication context |
| UI library | Gluestack UI v2 | Cross-platform component primitives |
| Styling | NativeWind (Tailwind for RN) | Utility-first CSS via `className` prop |

## Design Token System

CSS variables defined in theme config -> mapped in `tailwind.config.ts`. Always use semantic tokens, never hardcoded hex values.

### Typography Tokens (dark mode)

| Token | Hex | Usage |
|-------|-----|-------|
| typography-200 | #525252 | Disabled/muted text |
| typography-300 | #737373 | Secondary text |
| typography-400 | #8c8c8c | Tertiary text |
| typography-500 | #a3a3a3 | Body text |
| typography-950 | ~white | Primary text |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| teal-400 | #2dd4bf | Success/positive indicators |
| error-500 | #ef4444 | Error/negative states |
| green-500 | #22c55e | Positive change values |

### VStack/HStack Space Values

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

## Component Organization

```
packages/app/
+-- components/
|   +-- atoms/          # Buttons, text, icons
|   +-- molecules/      # Cards, list items
|   +-- organisms/      # Complex composed sections
|   +-- templates/      # Page-level layouts (e.g. AuthenticatedDataLoader)
|   +-- ui/             # Gluestack UI primitives
|   +-- auth/           # Auth-specific components
|   +-- charts/         # Chart components
|   +-- animated/       # Animation components
|   +-- dev/            # Dev-only components
|   +-- ErrorBoundary.tsx
+-- features/
|   +-- auth/           # Authentication screens
|   +-- discover/       # Fund discovery
|   +-- portfolio/      # Portfolio views
|   +-- profile/        # User profile
|   +-- user/           # User management
+-- provider/           # App-level providers (navigation, safe-area)
+-- hooks/              # Shared custom hooks
+-- services/           # API service functions
+-- theme/              # Theme configuration
+-- constants/          # Route constants, feature flags
+-- utils/              # Shared utilities
+-- translations/       # i18n strings
```

## Key Patterns

- **Functional components only** with TypeScript strict mode
- **Named exports** (not default exports)
- **Props interface** defined above the component
- **Arrow function components**: `export const MyComponent = () => { ... }`
- **Server state**: TanStack Query (React Query) -- never duplicate server state locally
- **UI state**: React Context or local `useState`
- **`style` prop with `as any`**: required for web-only CSS properties (gradients, box-shadow) due to React Native ViewStyle types
- **GluestackUI spacing**: use VStack/HStack `space` prop (not `className="gap-X"`)
- **Dark mode**: pass `mode="dark"` to GluestackUIProvider for dark-themed pages

## Authentication Flow

1. Privy handles auth (wallet-based + email) via `@privy-io/react-auth`
2. Next.js middleware (`apps/next/middleware.ts`) checks `privy-token` cookie
3. Public routes bypass auth; protected routes redirect to login
4. Auth state shared via `packages/auth/` context
