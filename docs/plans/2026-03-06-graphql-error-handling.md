# GraphQL Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Apollo error link that redirects on UNAUTHENTICATED errors, toasts on network errors and unhandled query errors, and leaves mutation errors to individual components.

**Architecture:** Add `onUnauthenticated` and `onError` optional callbacks to `createApolloClient`. Each app's `ApolloWrapper` passes stable ref-wrapped callbacks; a new shared `ApolloErrorSetup` render-nothing component (inside both `ApolloProvider` and `GluestackUIProvider`) wires up the real `signOut`/`useToast` to those refs via `useEffect`.

**Tech Stack:** Apollo Client 3 (`@apollo/client/link/error`), React refs, Gluestack `useToast`, `@elysium/auth` `useAuth`

**Note on tests:** Neither `packages/data` nor `packages/app` have a test runner configured — verification is via TypeScript (`npx tsc --noEmit`) and manual smoke-testing in dev.

---

## Context

- Design doc: `docs/plans/2026-03-06-graphql-error-handling-design.md`
- `createApolloClient` lives in `packages/data/src/graphql/client.ts`
- Both apps have an `ApolloWrapper` component (nearly identical):
  - Web: `apps/next/app/providers.tsx`
  - Expo: `apps/expo/App.tsx`
- `useToast` comes from `app/components/ui/toast` (Gluestack). Needs `GluestackUIProvider` in scope.
- `useAuth` comes from `@elysium/auth`. Needs `AuthProvider` in scope.
- `useApolloClient` needs `ApolloProvider` in scope.
- `PATHS.landing` is `'/landing'` — from `app/constants/routes`

---

### Task 1: Add error link to `createApolloClient`

**Files:**
- Modify: `packages/data/src/graphql/client.ts`

**Step 1: Read the file**

Open `packages/data/src/graphql/client.ts` and understand the current link chain: `authLink.concat(httpLink)`.

**Step 2: Add the two new optional params and the error link**

Replace the current file content with the following (full file):

```ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { persistCache } from 'apollo3-cache-persist';
import type { PersistentStorage } from 'apollo3-cache-persist';
import type { OperationDefinitionNode } from 'graphql';

export type ApolloStorageBackend = PersistentStorage<string>;

/**
 * Creates a configured Apollo Client instance.
 *
 * @param getToken        - Returns the current auth token (or null if unauthenticated).
 *                          Called on every request so token rotation works automatically.
 * @param storage         - Optional persistence backend. Pass AsyncStorage on Expo.
 *                          Omit on web (use BFF proxy instead) and for SSR or tests.
 * @param graphqlUri      - Full URI of the GraphQL endpoint.
 *                          Defaults to `${EXPO_PUBLIC_API_BASE_URL}/graphql`.
 *                          On Next.js web, pass '/api/graphql' to route via the BFF proxy.
 * @param onUnauthenticated - Called when the server returns UNAUTHENTICATED. Should
 *                          clear the session and redirect to login.
 * @param onError         - Called for network errors and unhandled query-level GraphQL
 *                          errors. Should surface the message to the user (e.g. toast).
 *                          Mutation errors are skipped — mutation components handle those.
 */
export async function createApolloClient(
  getToken: () => string | null,
  storage?: ApolloStorageBackend,
  graphqlUri?: string,
  onUnauthenticated?: () => void,
  onError?: (message: string) => void,
): Promise<ApolloClient<unknown>> {
  const cache = new InMemoryCache();

  if (storage) {
    await persistCache({ cache, storage });
  }

  const uri = graphqlUri ?? `${process.env.EXPO_PUBLIC_API_BASE_URL}/graphql`;
  const httpLink = createHttpLink({ uri });

  const authLink = setContext((_, { headers }) => {
    const token = getToken();
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        if (err.extensions?.['code'] === 'UNAUTHENTICATED') {
          onUnauthenticated?.();
          return; // stop processing further errors for this operation
        }

        const isMutation = operation.query.definitions.some(
          (d): d is OperationDefinitionNode =>
            d.kind === 'OperationDefinition' && d.operation === 'mutation',
        );
        if (!isMutation) {
          onError?.(err.message ?? 'An unexpected error occurred');
        }
      }
    }

    if (networkError) {
      onError?.(`Network error: ${networkError.message}`);
    }
  });

  return new ApolloClient({
    link: errorLink.concat(authLink).concat(httpLink),
    cache,
  });
}
```

**Step 3: Type-check**

```bash
cd /path/to/repo && npx tsc --noEmit -p packages/data/tsconfig.json
```

Expected: No new errors. (There are pre-existing errors in other packages — ignore those.)

**Step 4: Commit**

```bash
git add packages/data/src/graphql/client.ts
git commit -m "feat(data): add Apollo error link with onUnauthenticated + onError callbacks"
```

---

### Task 2: Create shared `ApolloErrorSetup` component

**Files:**
- Create: `packages/app/components/ApolloErrorSetup.tsx`

**Step 1: Create the file**

```tsx
import { MutableRefObject, useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { useAuth } from '@elysium/auth';
import { Toast, ToastDescription, useToast } from 'app/components/ui/toast';
import { PATHS } from 'app/constants/routes';
import { performLogout } from 'app/services/auth';

interface ApolloErrorSetupProps {
  onUnauthenticatedRef: MutableRefObject<(() => void) | undefined>;
  onErrorRef: MutableRefObject<((message: string) => void) | undefined>;
}

/**
 * Render-nothing component. Wire up Apollo error callbacks to real auth + toast actions.
 *
 * MUST be mounted:
 * - Inside ApolloProvider (for useApolloClient)
 * - Inside GluestackUIProvider (for useToast)
 * - Inside AuthProvider (for useAuth)
 */
export function ApolloErrorSetup({ onUnauthenticatedRef, onErrorRef }: ApolloErrorSetupProps) {
  const apolloClient = useApolloClient();
  const { signOut } = useAuth();
  const toast = useToast();

  useEffect(() => {
    onUnauthenticatedRef.current = async () => {
      await performLogout({ apolloClient });
      await signOut();
      if (typeof window !== 'undefined') {
        window.location.href = PATHS.landing;
      }
      // On native, signOut clears Cognito session → AuthProvider sets authenticated=false
      // → AppNavigation automatically shows the auth stack. No redirect needed.
    };
  }, [apolloClient, signOut, onUnauthenticatedRef]);

  useEffect(() => {
    onErrorRef.current = (message: string) => {
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

**Step 2: Type-check**

```bash
npx tsc --noEmit -p packages/app/tsconfig.json
```

Expected: No new errors.

**Step 3: Commit**

```bash
git add packages/app/components/ApolloErrorSetup.tsx
git commit -m "feat(app): add ApolloErrorSetup component for global GraphQL error handling"
```

---

### Task 3: Update web providers (`apps/next/app/providers.tsx`)

**Files:**
- Modify: `apps/next/app/providers.tsx`

**Step 1: Read the current file**

```
apps/next/app/providers.tsx
```

**Step 2: Understand the current provider tree**

```
StyledJsxRegistry
  AuthProvider
    ApolloWrapper
      MeGate
        GluestackUIProvider   ← useToast needs this ABOVE ApolloErrorSetup
          {children}
```

`ApolloErrorSetup` needs `GluestackUIProvider` in scope. Move `GluestackUIProvider` above `ApolloWrapper`.

**Step 3: Rewrite the file**

```tsx
'use client';

import React, { MutableRefObject, useEffect, useRef, useState } from 'react';

import { AuthProvider, useAuth, useIdentityToken } from '@elysium/auth';
import { env } from '@elysium/env';
import { ApolloClient, ApolloProvider, useQuery } from '@apollo/client';
import { GluestackUIProvider } from 'app/components/ui/gluestack-ui-provider';
import StyledJsxRegistry from './registry';
import { createApolloClient, MeDocument } from '@elysium/data';
import { ApolloErrorSetup } from 'app/components/ApolloErrorSetup';
import 'app/translations';

const cognitoUserPoolId = env.COGNITO_USER_POOL_ID;
const cognitoClientId = env.COGNITO_CLIENT_ID;
const cognitoRegion = env.COGNITO_REGION;

interface ApolloWrapperProps {
  children: React.ReactNode;
  onUnauthenticatedRef: MutableRefObject<(() => void) | undefined>;
  onErrorRef: MutableRefObject<((message: string) => void) | undefined>;
}

function ApolloWrapper({ children, onUnauthenticatedRef, onErrorRef }: ApolloWrapperProps) {
  const { identityToken } = useIdentityToken();

  const [client, setClient] = useState<ApolloClient<unknown> | null>(null);

  // Keep a ref so the auth link always reads the latest token,
  // even though the Apollo client is only created once.
  const tokenRef = useRef<string | null>(identityToken);
  tokenRef.current = identityToken;

  useEffect(() => {
    if (!client) {
      // No cache persistence on web — data is sensitive financial info.
      // Requests are proxied through /api/graphql (BFF) so the real API URL
      // is never exposed to the browser.
      createApolloClient(
        () => tokenRef.current,
        undefined,
        '/api/graphql',
        () => onUnauthenticatedRef.current?.(),
        (msg) => onErrorRef.current?.(msg),
      ).then(setClient);
    }
  }, [identityToken, client, onUnauthenticatedRef, onErrorRef]);

  if (!client) return null;

  return (
    <ApolloProvider client={client}>
      <ApolloErrorSetup onUnauthenticatedRef={onUnauthenticatedRef} onErrorRef={onErrorRef} />
      {children}
    </ApolloProvider>
  );
}

function MeGate({ children }: { children: React.ReactNode }) {
  const { authenticated, ready } = useAuth();
  // This component ensures the `me` query is resolved before rendering the app,
  // so that the user record and PlatformAccess are always available.
  // This is important for components that run on every page (e.g. layout) and
  // rely on `me` data to function correctly.
  const { loading, data } = useQuery(MeDocument, { skip: !authenticated });

  // Auth still initialising — wait before deciding what to render.
  if (!ready) return "Loading user data...";

  // Not authenticated — pass through so login/public pages render normally.
  if (!authenticated) return <>{children}</>;

  // Authenticated but `me` query still in flight.
  if (loading || !data) return "Loading user data...";

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const onUnauthenticatedRef = useRef<(() => void) | undefined>(undefined);
  const onErrorRef = useRef<((message: string) => void) | undefined>(undefined);

  return (
    <StyledJsxRegistry>
      <AuthProvider userPoolId={cognitoUserPoolId} clientId={cognitoClientId} region={cognitoRegion}>
        <GluestackUIProvider>
          <ApolloWrapper onUnauthenticatedRef={onUnauthenticatedRef} onErrorRef={onErrorRef}>
            <MeGate>
              {children}
            </MeGate>
          </ApolloWrapper>
        </GluestackUIProvider>
      </AuthProvider>
    </StyledJsxRegistry>
  );
}
```

**Key changes:**
- `GluestackUIProvider` moved up to wrap `ApolloWrapper` (so `useToast` is available inside `ApolloErrorSetup`)
- `MeGate`'s `GluestackUIProvider` removed (no longer needed)
- `ApolloWrapper` accepts `onUnauthenticatedRef` + `onErrorRef` props
- `ApolloErrorSetup` rendered as first child of `ApolloProvider`
- `onUnauthenticatedRef` + `onErrorRef` created in `Providers` and shared via props

**Step 4: Type-check**

```bash
npx tsc --noEmit -p apps/next/tsconfig.json
```

Expected: No new errors.

**Step 5: Commit**

```bash
git add apps/next/app/providers.tsx
git commit -m "feat(web): wire up Apollo error link in providers — redirect on UNAUTHENTICATED, toast on errors"
```

---

### Task 4: Update Expo app (`apps/expo/App.tsx`)

**Files:**
- Modify: `apps/expo/App.tsx`

**Step 1: Read the current file**

```
apps/expo/App.tsx
```

**Step 2: Understand the current structure**

```
AuthProvider
  ApolloWrapper          ← creates ApolloProvider internally, returns {children}
    GluestackUIProvider  ← children of ApolloWrapper, so inside ApolloProvider ✓
      SafeAreaProvider
        AppNavigation
```

`ApolloErrorSetup` needs to be inside `GluestackUIProvider`. Since `GluestackUIProvider` is passed as children to `ApolloWrapper`, we can render `ApolloErrorSetup` as a sibling of `SafeAreaProvider` inside `GluestackUIProvider` — but we need access to the refs.

Cleanest solution: own the refs in `App` (top level), pass them to both `ApolloWrapper` (for client creation) and render `ApolloErrorSetup` inside `GluestackUIProvider`.

**Step 3: Rewrite the file**

```tsx
import 'global.css';

import 'react-native-gesture-handler';

import { AuthProvider, useIdentityToken } from '@elysium/auth';
import { env } from '@elysium/env';
import { ApolloClient, ApolloProvider } from '@apollo/client';
import { GluestackUIProvider } from 'app/components/ui/gluestack-ui-provider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigation from './src/navigation/AppNavigation';
import { createApolloClient } from '@elysium/data';
import { ApolloErrorSetup } from 'app/components/ApolloErrorSetup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import 'app/translations';

interface ApolloWrapperProps {
  children: React.ReactNode;
  onUnauthenticatedRef: MutableRefObject<(() => void) | undefined>;
  onErrorRef: MutableRefObject<((message: string) => void) | undefined>;
}

function ApolloWrapper({ children, onUnauthenticatedRef, onErrorRef }: ApolloWrapperProps) {
  const { identityToken } = useIdentityToken();
  const [client, setClient] = useState<ApolloClient<unknown> | null>(null);

  // Keep a ref so the auth link always reads the latest token,
  // even though the Apollo client is only created once.
  const tokenRef = useRef<string | null>(identityToken);
  tokenRef.current = identityToken;

  useEffect(() => {
    createApolloClient(
      () => tokenRef.current,
      AsyncStorage,
      undefined,
      () => onUnauthenticatedRef.current?.(),
      (msg) => onErrorRef.current?.(msg),
    ).then(setClient);
  }, []);

  if (!client) return null;

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

export default function App() {
  const onUnauthenticatedRef = useRef<(() => void) | undefined>(undefined);
  const onErrorRef = useRef<((message: string) => void) | undefined>(undefined);

  return (
    <AuthProvider userPoolId={env.COGNITO_USER_POOL_ID} clientId={env.COGNITO_CLIENT_ID} region={env.COGNITO_REGION}>
      <ApolloWrapper onUnauthenticatedRef={onUnauthenticatedRef} onErrorRef={onErrorRef}>
        <GluestackUIProvider>
          <ApolloErrorSetup onUnauthenticatedRef={onUnauthenticatedRef} onErrorRef={onErrorRef} />
          <SafeAreaProvider>
            <AppNavigation />
          </SafeAreaProvider>
        </GluestackUIProvider>
      </ApolloWrapper>
    </AuthProvider>
  );
}
```

**Key changes:**
- `onUnauthenticatedRef` + `onErrorRef` owned by `App`, passed to both `ApolloWrapper` and `ApolloErrorSetup`
- `ApolloWrapper` accepts and passes refs through to `createApolloClient` via stable wrappers
- `ApolloErrorSetup` placed inside `GluestackUIProvider` (so `useToast` works) and inside `ApolloProvider` (via `ApolloWrapper`)

**Step 4: Type-check**

```bash
# From repo root — Expo uses root tsconfig
npx tsc --noEmit -p apps/expo/tsconfig.json 2>/dev/null || echo "Check for new errors only"
```

**Step 5: Commit**

```bash
git add apps/expo/App.tsx
git commit -m "feat(expo): wire up Apollo error link — redirect on UNAUTHENTICATED, toast on errors"
```

---

### Task 5: Smoke test

**Web:**
1. `yarn turbo dev` → open the Next.js app
2. Open DevTools → Network tab → filter for `/api/graphql`
3. While authenticated, temporarily modify `apps/next/api/graphql/route.ts` (or similar) to return an error with code `UNAUTHENTICATED`
4. Confirm: session clears and app redirects to `/landing`
5. Revert the temp change

**Simpler manual test:**
1. Log in to the web app
2. Delete the `cognito-id-token` cookie in DevTools
3. Navigate to a page that fires a GraphQL query
4. Confirm: redirected to `/landing` (the next query fires with an expired token → server returns UNAUTHENTICATED → error link fires)

**Network error test:**
1. In DevTools → Network → toggle "Offline" mode
2. Navigate to a page that fires a query
3. Confirm: error toast appears at bottom of screen with "Network error: ..."

**Mutation double-toast check:**
1. In the Subscribe screen, trigger a mutation error (e.g. enter invalid amount)
2. Confirm: only ONE toast appears (from the mutation's own `onError`), not two

---

### Task 6: Final type-check pass

```bash
cd services/api && npx tsc --noEmit
npx tsc --noEmit -p packages/data/tsconfig.json
npx tsc --noEmit -p packages/app/tsconfig.json
npx tsc --noEmit -p apps/next/tsconfig.json
```

Confirm no new errors introduced (pre-existing errors listed in MEMORY.md are acceptable).

**Final commit if any loose ends:**

```bash
git add -p  # stage only intentional changes
git commit -m "chore: fix any type issues from GraphQL error handling"
```
