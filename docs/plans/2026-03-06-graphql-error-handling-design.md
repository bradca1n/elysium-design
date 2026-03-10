# GraphQL Error Handling Design

**Date:** 2026-03-06
**Status:** Approved
**Branch:** feature/submit-transaction-cognito

## Problem

All GraphQL responses come back as HTTP 200. The Apollo client currently has no error link, so:
- `UNAUTHENTICATED` errors are silently delivered to components with no logout/redirect
- Network failures are not surfaced globally
- Query errors are swallowed unless the component checks the `error` prop

The REST (`ky`) layer already has robust 401 handling via `handle401Response` + `configureAuthClient`. This design mirrors that pattern for the GraphQL layer.

## Approach: Callback params on `createApolloClient`

Add optional `onUnauthenticated` and `onError` callbacks to `createApolloClient`. The error link is built inside and calls these at invocation time. Each `ApolloWrapper` passes stable ref-wrapped callbacks, and a new `ErrorSetup` render-nothing component (inside `ApolloProvider`) wires up the real `signOut`/`useToast` to those refs.

## Error Handling Rules

| Error type | Action |
|-----------|--------|
| GraphQL `UNAUTHENTICATED` | Call `onUnauthenticated` → clear Apollo store, sign out, redirect to landing |
| Network error (connection failure) | Call `onError` → toast "Network error: ..." |
| GraphQL error on a **query** | Call `onError` → toast with error message |
| GraphQL error on a **mutation** | Skip (mutation components have their own `onError` handlers) |
| All other cases | No-op |

Mutation vs query detection: check `operation.query.definitions[0].operation === 'mutation'`.

## Architecture

### `packages/data/src/graphql/client.ts`

Add two optional params. Build an error link when either is provided, insert at front of chain:

```
errorLink → authLink → httpLink
```

Error link implementation:
```ts
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        onUnauthenticated?.();
        return;
      }
      const isMutation =
        operation.query.definitions.some(
          (d) => d.kind === 'OperationDefinition' && d.operation === 'mutation'
        );
      if (!isMutation) {
        onError?.(err.message ?? 'An error occurred');
      }
    }
  }
  if (networkError) {
    onError?.(`Network error: ${networkError.message}`);
  }
});
```

### `packages/app/components/ApolloErrorSetup.tsx` (new, shared)

Render-nothing component. Must be mounted inside `ApolloProvider` AND `GluestackUIProvider`.

```tsx
interface Props {
  onUnauthenticatedRef: MutableRefObject<(() => void) | undefined>;
  onErrorRef: MutableRefObject<((msg: string) => void) | undefined>;
}

export function ApolloErrorSetup({ onUnauthenticatedRef, onErrorRef }: Props) {
  const { signOut } = useAuth();
  const apolloClient = useApolloClient();
  const toast = useToast();

  useEffect(() => {
    onUnauthenticatedRef.current = async () => {
      await apolloClient.clearStore();
      await signOut();
      if (typeof window !== 'undefined') {
        window.location.href = PATHS.landing;
      }
      // On native, signOut triggers auth state change → AppNavigation shows auth stack
    };
  }, [signOut, apolloClient, onUnauthenticatedRef]);

  useEffect(() => {
    onErrorRef.current = (message) => {
      const id = Math.random().toString();
      toast.show({
        id,
        placement: 'bottom',
        duration: 4000,
        render: ({ id: toastId }) => (
          <Toast nativeID={`toast-${toastId}`} action="error" variant="solid">
            <ToastDescription>{message}</ToastDescription>
          </Toast>
        ),
      });
    };
  }, [toast, onErrorRef]);

  return null;
}
```

### `apps/next/app/providers.tsx` — changes

1. Move `GluestackUIProvider` to wrap `ApolloWrapper` (so `useToast` is available inside)
2. Add `onUnauthenticatedRef` and `onErrorRef` to `ApolloWrapper`
3. Pass stable ref-wrapped callbacks to `createApolloClient`
4. Render `<ApolloErrorSetup>` as first child of `ApolloProvider`

New provider tree:
```
AuthProvider → GluestackUIProvider → ApolloWrapper[+ErrorSetup] → MeGate → children
```

### `apps/expo/App.tsx` — changes

Same ref pattern. `GluestackUIProvider` already wraps children inside `ApolloWrapper`, so `ApolloErrorSetup` works as a child of `ApolloProvider`.

Provider tree stays:
```
AuthProvider → ApolloWrapper[+ErrorSetup] → GluestackUIProvider → SafeAreaProvider → AppNavigation
```

`ApolloErrorSetup` must be rendered after `GluestackUIProvider` (i.e., inside it) on Expo. Move it into the children rather than a direct child of `ApolloProvider`.

Actually simpler: render `ApolloErrorSetup` inside `GluestackUIProvider` in both apps by wrapping it into a small inner component.

## Files Changed

| File | Change |
|------|--------|
| `packages/data/src/graphql/client.ts` | Add `onUnauthenticated?`, `onError?` params + error link |
| `packages/app/components/ApolloErrorSetup.tsx` | New shared component |
| `apps/next/app/providers.tsx` | Add refs, `ApolloErrorSetup`, move `GluestackUIProvider` up |
| `apps/expo/App.tsx` | Add refs, `ApolloErrorSetup` |

## Key Constraints

- `ApolloErrorSetup` must be inside both `ApolloProvider` (for `useApolloClient`) AND `GluestackUIProvider` (for `useToast`)
- The error link callbacks are captured by closure at client creation time — use stable ref wrappers so the client doesn't need to be recreated when auth state changes
- Do not show toast for mutation GraphQL errors (components handle these)
- `onUnauthenticated` must be idempotent (may be called multiple times for concurrent inflight requests)
