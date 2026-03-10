# Data Layer

<!-- ~800 tokens -->

**Authoritative reference:** `docs/data.md` (comprehensive data loading and persistence documentation)

## Architecture

The Elysium app uses an **offline-first** (cache-first, stale-while-revalidate) data pattern. The data layer lives in `packages/data/` and provides platform-agnostic storage, sync orchestration, and React Query integration.

### Provider Stack

```
AppDataProvider (packages/app/data/provider.tsx)
+-- DataSyncProvider (packages/data/src/context.tsx)
|   Initializes the storage adapter
+-- InitialLoadProvider (packages/data/src/initialLoad/context.tsx)
    Orchestrates initial load + background refresh
```

## Two Persistence Modes

### Blob (Key/Value)

- JSON-serialized objects stored under string keys (e.g. `elysium.me`, `elysium.portfolio`)
- Metadata per entry: `fetchedAt`, `staleAt`, `version`
- Used for: user profile (`ME`), portfolio summary (`PORTFOLIO`)

### Relational (Tables)

- Normalized rows in dedicated tables (orders, transfers, funds, holdings, investables, etc.)
- Registry-based (`relationalStorageRegistry`) mapping source keys to `persist/load/clear` routines
- Sync metadata stored as blob entries (e.g. `elysium.orders.metadata` with `lastSyncedAt`)
- Used for: orders, transfers, funds, holdings, investable funds, portfolio events, historical snapshots

## Storage Adapters

| Platform | Adapter | Blob Storage | Relational Storage |
|----------|---------|-------------|-------------------|
| Web | `WebStorageAdapter` | IndexedDB `cache_entries` store | IndexedDB object stores per table |
| Mobile | `ExpoStorageAdapter` | SQLite + XOR encryption (via expo-secure-store key) | SQLite tables with indexes |

Key files:
- `packages/data/src/platform/web/storage.ts`
- `packages/data/src/platform/expo/storage.ts`
- `packages/data/src/types.ts` (StorageAdapter interface)

## Initial Load Pipeline

Configured in `packages/app/data/initialData.ts` via `createInitialDataSources()`.

| Source | Required | Mode | Stale Time | Priority |
|--------|----------|------|-----------|----------|
| `elysium.me` | Yes | blob | 5 min | -1 (first) |
| `elysium.portfolio` | Yes | blob | 15 sec | 0 |
| Historical portfolio | No | relational | 30 sec | 0 |
| Orders | No | relational | 5 min | 0 |
| Funds | No | relational | 60 sec | 0 |
| Holdings | No | relational | 30 sec | 0 |
| Transfers | No | relational | 60 sec | 0 |
| Investable funds | No | relational | 60 sec | 0 |
| Portfolio events | No | relational | 30 sec | 0 |

### Load Stages

1. **Guardrails**: prevents concurrent loads
2. **Cache seeding**: pre-seeds React Query with cached investables (avoids empty-list flicker)
3. **Freshness evaluation**: checks `staleAt` (blob) or `lastSyncedAt` (relational) per source
4. **Fast path**: if nothing is stale, mark success immediately with no network calls
5. **Cache-first path**: if all required sources have cached data (even stale), render immediately and refresh in background
6. **Network-required path**: if required sources have no cache, load by priority groups, fail fast on required source errors

## React Query Hooks

### Blob: `createSyncedQuery`
- File: `packages/data/src/hooks/useSyncedQuery.ts`
- Loads from cache first, seeds React Query, enables network query after cache loaded
- Suppresses `isLoading` when cached data exists

### Relational: `createRelationalQuery`
- File: `packages/data/src/hooks/useRelationalQuery.ts`
- Reads from relational tables into React Query
- Disabled during sync to avoid transient empty reads
- `sync(token)` triggers background refresh via initial-load system

## UX State Model

| State | Meaning |
|-------|---------|
| `isInitialized` | Storage adapter initialized |
| `isLoading` | Any source currently loading |
| `isReady` | All required sources succeeded |
| `isComplete` | All sources in success or error |
| `hasLoadedOnce` | First load attempt finished |

UI gating (`AuthenticatedDataLoader.tsx`):
- Before first load: show loading indicator
- Required data failed: show error + retry
- Otherwise: render app; optional sources refresh in background
