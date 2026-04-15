# Smart Account Integration Design

**Date:** 2026-03-03
**Branch:** feature/update-diamond-calls
**Status:** Approved

## Overview

Integrate the diamond proxy's on-chain smart account system into the API layer.
Two goals:

1. **Create** a smart account when a user confirms their Cognito account
2. **Use** the smart account address (not the EOA wallet) for all on-chain view calls

## Background

The diamond now has an `AccountFacet` with a smart account system. Each user's EOA
wallet maps to one or more on-chain smart accounts via `getAccounts(wallet)`. All
portfolio, holdings, orders, and events are tracked against smart account addresses,
not wallet addresses.

## Part 1 — `postConfirmation`: Create smart account on user confirmation

**Trigger:** `isNewEntity === true` (same guard as the wallet key secret creation)

**Steps:**
1. Retrieve platform service wallet private key from Secrets Manager
   — secret ARN from `PLATFORM_WALLET_SECRET_ARN` env var
2. Create viem wallet client with that private key
3. Call `createAccount` on the diamond:
   - `adminAccountAddress`: `adminAccount.address`
   - `owner`: user's freshly generated EOA wallet address
   - `name`: `cognitoSub`
   - `accountType`: investor=1, manager=2, admin=3
   - `eligibility`: all-false defaults (`InvestorAttributesUpdate` with all `update*` = false)
4. Fire-and-forget (no receipt wait) — wrap in try/catch, log errors and continue
   (same philosophy as `ResourceExistsException` handling for the wallet secret)

**New env vars required:**
- `PLATFORM_WALLET_SECRET_ARN` — ARN of the Secrets Manager secret holding the platform wallet private key
- `VIEW_CALLS_ADDRESS` — already exists (diamond proxy address, used for both reads and writes)

## Part 2 — View calls: resolve smart account before every on-chain query

**Pattern:** call `getAccounts(walletAddress)` on-chain → use `accounts[0]` as the account address passed to view functions.

If `getAccounts` returns an empty array (account not yet created / creation failed), the handler returns an appropriate empty/null response rather than throwing.

**Files to update** (view calls currently passing EOA `walletAddress`):

| File | Function | Contract call |
|------|----------|---------------|
| `graphql/resolvers/orders.ts` | `orders` | `getOrders` |
| `graphql/resolvers/holdings.ts` | `holdings` | `getHoldings` |
| `graphql/resolvers/events.ts` | `portfolioEvents` | `getPortfolioEvents` |
| `graphql/resolvers/portfolio.ts` | `portfolio`, `historicalPortfolio` | via service |
| `graphql/resolvers/funds.ts` | `funds`, `investableFunds`, `fundNAV` | via services |
| `graphql/resolvers/mutations.ts` | `encodeSubmitOrder` | `submitOrder` calldata |
| `handlers/portfolio/index.ts` | `portfolioHandler` | via service |
| `handlers/investable-funds/index.ts` | `investableFundsHandler` | via service |
| `handlers/holdings/index.ts` | `holdingsHandler` | `getHoldings` |
| `handlers/orders/index.ts` | `ordersHandler` | `getOrders` |

**Services** (`portfolio.service.ts`, `investableFunds.service.ts`): no signature changes needed — callers resolve account before calling them.

## Part 3 — `/me` returns `smartAccounts`

Both the REST `meHandler` and GraphQL `me` resolver call `getAccounts(walletAddress)` (when `walletAddress` is non-null) and include the result in the response.

**REST response** (`handlers/me/index.ts`):
```json
{
  "id": "...",
  "walletAddress": "0x...",
  "smartAccounts": ["0xabc..."],
  "poolType": "investor"
}
```

**GraphQL schema** (`typeDefs.ts`): add `smartAccounts: [String!]!` to the `MeResult` type.

## Error handling

- `getAccounts` returns empty array → view calls return empty/null, do not throw 401/500
- `createAccount` reverts → log error, do not fail the Cognito trigger (user is still confirmed)
- `PLATFORM_WALLET_SECRET_ARN` missing → throw at startup, same as other required env vars

## Files changed (summary)

```
services/api/src/handlers/cognito/postConfirmation.ts        (createAccount call)
services/api/src/handlers/cognito/__tests__/postConfirmation.test.ts (update tests)
services/api/src/handlers/me/index.ts                        (add smartAccounts)
services/api/src/handlers/me/me.schema.ts                    (update schema)
services/api/src/handlers/portfolio/index.ts                 (resolve account)
services/api/src/handlers/investable-funds/index.ts          (resolve account)
services/api/src/handlers/holdings/index.ts                  (resolve account)
services/api/src/handlers/orders/index.ts                    (resolve account)
services/api/src/graphql/resolvers/user.ts                   (add smartAccounts)
services/api/src/graphql/resolvers/portfolio.ts              (resolve account)
services/api/src/graphql/resolvers/funds.ts                  (resolve account)
services/api/src/graphql/resolvers/orders.ts                 (resolve account)
services/api/src/graphql/resolvers/holdings.ts               (resolve account)
services/api/src/graphql/resolvers/events.ts                 (resolve account)
services/api/src/graphql/resolvers/mutations.ts              (encodeSubmitOrder account)
services/api/src/graphql/typeDefs.ts                         (MeResult type)
```
