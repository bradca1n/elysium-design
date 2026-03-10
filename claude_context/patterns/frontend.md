# Frontend Best Practices

<!-- ~300 tokens -->
<!-- Updated 2026-02-08: Initial creation -->

## Verified Patterns

### P-FE01: Use VStack/HStack space prop for all spacing
- **When:** Any layout with gaps between children
- **Pattern:** `<VStack space="md">` not `className="gap-3"`
- **Why:** Cross-platform compatible, uses design token system

### P-FE02: Use design tokens for all colors
- **When:** Any text or background color
- **Pattern:** `text-typography-300` not `text-[#737373]`
- **Why:** Theme-consistent, dark mode compatible

### P-FE03: Use createSyncedQuery for blob-backed data
- **When:** Data stored as JSON blob (user profile, portfolio, settings)
- **Pattern:** `createSyncedQuery(StoreKeys.KEY, fetcher, options)`
- **Why:** Handles cache-first render, background revalidation, stale detection

### P-FE04: Use createRelationalQuery for table-backed data
- **When:** Normalized data (orders, transfers, holdings, funds)
- **Pattern:** `createRelationalQuery('tableName', queryFn, options)`
- **Why:** Efficient updates, proper invalidation, offline-first

### P-FE05: Wrap .map() renders in ErrorBoundary
- **When:** Rendering lists from external/dynamic data
- **Pattern:** `<ErrorBoundary fallback={...}>{items.map(...)}</ErrorBoundary>`
- **Why:** One bad item shouldn't crash the entire list
