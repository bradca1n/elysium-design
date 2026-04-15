# Backend Architecture

<!-- ~600 tokens -->

## Stack

| Technology | Purpose |
|-----------|---------|
| AWS Lambda | Serverless compute (Node.js 20.x) |
| Serverless Framework v3 | Deployment and local dev (`serverless-offline`) |
| Middy | Lambda middleware (validation, auth, error handling, logging) |
| Prisma ORM | PostgreSQL database access |
| Privy (`@privy-io/server-auth`) | JWT-based user authentication |
| Zod | Request/response schema validation |
| viem | Blockchain RPC client (reads + writes) |
| AWS Lambda Powertools | Structured logging |

## API Endpoints

All endpoints are HTTP API Gateway v2 routes under `/v1/`:

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/v1/chain` | No | Chain info (RPC URL, chain ID, contract address) |
| GET | `/v1/me` | Yes | Current user profile |
| GET | `/v1/portfolio` | Yes | Portfolio summary |
| GET | `/v1/portfolio/historical` | Yes | Historical portfolio snapshots |
| GET | `/v1/portfolio/events` | Yes | Portfolio events (trades, dividends) |
| GET | `/v1/orders` | Yes | User orders |
| GET | `/v1/funds` | Yes | Available funds |
| GET | `/v1/holdings` | Yes | User holdings |
| GET | `/v1/transfers` | Yes | Transfer history |
| GET | `/v1/investable-funds` | Yes | Investable fund catalog |
| POST | `/v1/subscribe` | Yes | Submit subscription order |
| POST | `/v1/encode/submit-order` | Yes | Encode order for on-chain submission |

## Request Pipeline

Each handler is wrapped with `withMiddlewares()` (`src/middleware/createHandler.ts`):

1. **Auth middleware** (optional): extracts Bearer token, verifies via Privy, attaches `privyUser` to event
2. **HTTP normalizer**: normalizes API Gateway event structure
3. **JSON body parser**: parses request body
4. **Zod validator**: validates request against inbound/outbound schemas
5. **Lambda context logger**: injects structured logging
6. **API response middleware**: wraps responses in standard format
7. **Error handler**: catches errors and returns structured error responses

## Key Directories

```
services/api/
+-- src/
|   +-- handler.ts              # Lambda function exports
|   +-- handlers/               # Route handlers (one directory per endpoint)
|   |   +-- me/                 # /v1/me handler + schema
|   |   +-- portfolio/          # /v1/portfolio + /v1/portfolio/historical
|   |   +-- orders/             # /v1/orders
|   |   +-- funds/              # /v1/funds
|   |   +-- holdings/           # /v1/holdings
|   |   +-- transfers/          # /v1/transfers
|   |   +-- investable-funds/   # /v1/investable-funds
|   |   +-- subscribe/          # /v1/subscribe
|   |   +-- encode-submit-order/# /v1/encode/submit-order
|   |   +-- chain/              # /v1/chain
|   |   +-- portfolio-events/   # /v1/portfolio/events
|   +-- middleware/              # Middy middleware (auth, response formatting)
|   +-- lib/                    # Shared utilities (Prisma client, viem client, constants)
|   +-- schemas/                # Base Zod schemas (SuccessResponse, ErrorResponse)
+-- prisma/                     # Prisma schema and migrations
+-- serverless.yml              # Serverless Framework configuration
```

## Blockchain Integration

The backend reads on-chain state via `viem` public client (`src/lib/viemClient.ts`):
- Singleton `PublicClient` for read operations against the Diamond Proxy
- `VIEW_CALLS_ADDRESS` environment variable points to the deployed contract
- Contract ABI imported from `@elysium/abi` workspace package

## Environment

- Region: `eu-west-1` (configurable)
- VPC-bound Lambdas (security groups + subnets for database access)
- Secrets via AWS Secrets Manager (`DB_SECRET_ARN`)
- Privy credentials via environment variables
