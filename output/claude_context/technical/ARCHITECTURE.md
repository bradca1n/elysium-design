# Architecture Overview

<!-- ~800 tokens -->

Elysium is a B2B fund administration platform built as a monorepo with three system layers: a cross-platform frontend, a serverless backend, and smart contracts on a private blockchain.

## System Layers

```
+----------------------------------------------+
|  Frontend                                     |
|  +-- apps/next/     (Next.js 15 web app)      |
|  +-- apps/mobile/   (Expo native app)         |
|                                               |
|  Shared UI: packages/app/                     |
|  (Gluestack UI v2 + NativeWind)               |
|                                               |
|  Shared Data: packages/data/                  |
|  (Offline-first, React Query, IndexedDB/SQLite)|
+-----------------------------------------------+
|  Backend                                      |
|  +-- services/api/  (AWS Lambda + Prisma)     |
|  Auth: Privy (wallet + email)                 |
|  Middleware: Middy (Zod validation, logging)  |
+-----------------------------------------------+
|  Smart Contracts                              |
|  +-- contracts/     (Foundry + Diamond Proxy) |
|  Private blockchain (chain ID 2201)           |
|  No public access -- all via Elysium services |
+-----------------------------------------------+
```

## How They Connect

1. **Frontend to Backend**: The Next.js/Expo apps authenticate users via Privy, obtain JWT identity tokens, and call the API Gateway endpoints (`/v1/*`). Middleware validates tokens with `@privy-io/server-auth`.

2. **Backend to Blockchain**: Lambda handlers use `viem` to make `eth_call` (reads) and send transactions to the Diamond Proxy contract on the private chain. The `@elysium/abi` package provides the generated contract ABI.

3. **Offchain Services to Blockchain**: Dedicated service accounts (with roles like `ROLE_NAV_UPDATER`, `ROLE_FX_UPDATER`) call contract functions directly:
   - NAV Updater service calls `updateNav()` on chain
   - FX Updater service calls `updateFXRates()` on chain
   - KYC Provider manages investor eligibility

4. **Data Flow**: Backend reads on-chain state via `ViewCallsFacet` / `ViewCalls2Facet`, transforms it with Prisma-stored metadata, and returns typed responses. The frontend `@elysium/data` package caches results in IndexedDB (web) or encrypted SQLite (mobile).

## Monorepo Structure

```
elysium/                          # Root (Yarn 4 workspaces)
+-- apps/
|   +-- next/                     # Next.js 15 web application
|   +-- mobile/                   # Expo React Native app
+-- packages/
|   +-- app/                      # Shared UI components, features, hooks, theme
|   +-- data/                     # Offline-first data layer (storage adapters, sync)
|   +-- auth/                     # Shared auth context (Privy integration)
|   +-- abi/                      # Generated contract ABI types
|   +-- env/                      # Environment variable utilities
|   +-- logger/                   # Shared logging
|   +-- wallets/                  # Wallet integration utilities
+-- services/
|   +-- api/                      # AWS Lambda API (Serverless Framework)
+-- contracts/                    # Solidity smart contracts (Foundry + Gemforge)
+-- docs/                         # Documentation
```

## Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15, Expo, React 19 | Cross-platform rendering |
| UI | Gluestack UI v2, NativeWind, Tailwind | Component library + styling |
| State | TanStack Query (React Query) | Server state, caching |
| Backend | AWS Lambda, Middy, Serverless Framework | Serverless API |
| Database | Prisma ORM, PostgreSQL | Relational data |
| Auth | Privy | Wallet + email authentication |
| Blockchain | Solidity 0.8.30, Foundry, Gemforge | Smart contracts |
| Chain Access | viem | TypeScript Ethereum client |
