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

Two-tier system: **Primitives** (raw values) → **Semantics** (intent). Always use semantic tokens in code, never hardcoded hex values. Tokens are CSS variables: `var(--text-color/primary)`.

Source of truth: `LOCAL/elysium-design/tokens/`

### Text Color

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `text-color/primary` | #171717 | #FEFEFF | Headings, primary labels |
| `text-color/secondary` | #737373 | #8C8C8C | Secondary labels |
| `text-color/muted` | #A3A3A3 | #737373 | Placeholder, disabled text |
| `text-color/inverse` | #FEFEFF | #171717 | Text on inverted surfaces |
| `text-color/positive` | #348352 | #84D3A2 | Positive values |
| `text-color/negative` | #EF4444 | #EF4444 | Negative/error values |

### Background

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg/canvas` | #FEFEFF | #171717 | Page background |
| `bg/surface` | #F8F8F8 | #202021 | Cards, panels |
| `bg/elevated` | #E5E5E5 | #404040 | Elevated surfaces, modals |
| `bg/subtle` | #F8F8F8 | #202021 | Subtle section backgrounds |

### Border

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `border/subtle` | #E5E5E5 | #404040 | Dividers, subtle outlines |
| `border/default` | #E5E5E5 | #525252 | Default borders |
| `border/strong` | #DBDBDC | #737373 | Emphasis borders |
| `border/positive` | #348352 | #84D3A2 | Success state borders |
| `border/negative` | #DC2626 | #EF4444 | Error state borders |

### Status

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `status/positive` | #348352 | #84D3A2 | Success indicator |
| `status/positive-bg` | #A2F1C0 | #14532D | Success badge background |
| `status/negative` | #E63535 | #EF4444 | Error indicator |
| `status/negative-bg` | #FEE2E2 | #7F1D1D | Error badge background |
| `status/warning` | #E77828 | #FB954B | Warning indicator |
| `status/warning-bg` | #FFF4EC | #542D12 | Warning badge background |
| `status/info` | #0B8DCD | #32B4F4 | Info indicator |
| `status/info-bg` | #C7EBFC | #032638 | Info badge background |
| `status/neutral` | #404040 | #DBDBDC | Neutral indicator |
| `status/neutral-bg` | #F8F8F8 | #202021 | Neutral badge background |

### Chart Gradients

| Token | Light | Dark |
|-------|-------|------|
| `gradient/chart/positive/start` | #ACFCD9 80% | #227752 80% |
| `gradient/chart/positive/end` | #CAFFE8 0% | #0C2319 0% |
| `gradient/chart/negative/start` | #EF4444 80% | #7B1C1C 80% |
| `gradient/chart/negative/end` | #EF4444 0% | #7B1C1C 0% |

### Spacing Scale

Tokens live in the **semantic** collection (same value in Light and Dark). Token name: `space/N`.

`0 · 2 · 4 · 8 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 112 · 128 · 144` (all in px)

### Border Radius

| Token | Value |
|-------|-------|
| `radius/xs` | 4px |
| `radius/s` | 6px |
| `radius/m` | 8px |
| `radius/l` | 12px |
| `radius/xl` | 16px |
| `radius/2xl` | 56px |
| `radius/full` | 999px |

### Typography Scale

| Token | Size | Usage |
|-------|------|-------|
| `text-size/display/lg` | 48px | Hero display |
| `text-size/display/md` | 44px | Display |
| `text-size/heading/lg` | 36px | Page headings |
| `text-size/heading/md` | 30px | Section headings |
| `text-size/heading/sm` | 24px | Sub-headings |
| `text-size/title/lg` | 18px | Large titles |
| `text-size/title/md` | 16px | Titles |
| `text-size/title/sm` | 14px | Small titles |
| `text-size/body/lg` | 18px | Large body |
| `text-size/body/md` | 16px | Body text |
| `text-size/body/sm` | 14px | Small body |
| `text-size/caption/md` | 12px | Captions |
| `text-size/caption/sm` | 10px | Small captions |
| `text-size/label/lg` | 14px | Large labels |
| `text-size/label/md` | 12px | Labels |
| `text-size/label/sm` | 10px | Small labels |
| `text-size/data/lg` | 48px | Large data figures |
| `text-size/data/md` | 24px | Data figures |
| `text-size/data/sm` | 14px | Small data figures |

### Font Fixed Tokens

| Token | Value |
|-------|-------|
| `font/line/tight` | 18px |
| `font/line/normal` | 22px |
| `font/line/relaxed` | 24px |
| `font/weight/light` | 300 |
| `font/weight/regular` | 400 |
| `font/weight/medium` | 500 |
| `font/weight/semibold` | 600 |
| `font/weight/bold` | 700 |

### Z-Index (layer)

| Token | Value |
|-------|-------|
| `layer/base` | 0 |
| `layer/sticky` | 10 |
| `layer/dropdown` | 100 |
| `layer/popover` | 200 |
| `layer/sheet` | 300 |
| `layer/modal` | 400 |
| `layer/toast` | 500 |
| `layer/tooltip` | 600 |

### VStack/HStack Space Props (Gluestack)

Gluestack `space` prop maps to the spacing scale above:

| Prop | Pixels |
|------|--------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 40px |

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
