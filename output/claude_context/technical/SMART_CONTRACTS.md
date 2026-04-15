# Smart Contract Architecture

<!-- Updated 2026-02-08: Expanded with verified content from contracts/CLAUDE.md -->
<!-- ~2800 tokens -->

**For test helpers, return value destructuring, and build commands:** See `contracts/CLAUDE.md`
**For common pitfalls:** See `claude_context/errors/blockchain.md`

## Project Overview

Elysium is a Solidity smart contract system for **B2B fund administration** built on the **Diamond Proxy Pattern (EIP-2535)**. It runs on a **private blockchain** — no external users have direct chain access; all interactions go through Elysium's services/APIs.

Each fund represents an independent customer (fund manager company). Fund isolation is critical — investor money must never commingle between fund managers.

## Design Paradigms

**Storage-First**: Storage is the authoritative source, not events. Events are convenience only. All data is queryable from storage via `eth_call` with specific block numbers. Every state change stores `block.number` for audit trail.

**Account-Based Proposal System**: External callers invoke facet functions → `_validateAndPropose()` checks permissions and creates a proposal → when threshold is met, proposal executes via `delegatecall` → `execute*` functions check `onlyInternalExecution` modifier. This prevents direct external calls to execute functions.

**Three-Level Dilution System**: Costs affecting specific classes are handled through dilution factors on the shared `BaseInfo.dilutionRatio` field:
- **Fund-level dilution** (`baseInfo[fundId].dilutionRatio`): compensates all classes for costs embedded in external NAV
- **Class-level dilution** (`baseInfo[classId].dilutionRatio`): charges specific classes their fair share (shared with management fees)
- **Dealing-level dilution** (`baseInfo[dealingId].dilutionRatio`): charges specific dealings the performance fee due to different time and HWM

## Entity Hierarchy

```
Platform (Elysium)
└── Umbrella Fund (grouping, ID starts at 1)
    ├── Cash Fund Tokens (one per currency per umbrella, for settlement)
    └── Fund (the product/customer unit, numbered per umbrella)
        └── Share Class (investor-facing, currency-specific, numbered per fund starting at 2)
            └── Dealing (NAV point in time, numbered per class starting at 1)
```

## Token ID Encoding

All token IDs use the lower 64 bits of a uint256:

```
[Umbrella 16b] [Fund 16b] [Class 16b] [Dealing 16b]
  bits 48-63    bits 32-47  bits 16-31   bits 0-15
```

## Price Formula

```
fundPrice = nav * PRECISION / fundTotalSupply
adjustedFundPrice = fundPrice * PRECISION / fundDilution
classPrice = adjustedFundPrice * PRECISION / classDilution
dealingPrice = classPrice * PRECISION / dealingDilution
```

For multi-currency: `classPriceInDenomination = classPrice * fxRate(fundCurrency -> classCurrency) / PRECISION`

## Key State Machines

### Dealing Process
```
IDLE → AWAITS_NAV_UPDATE → PROCESSING → IDLE
```
- `IDLE`: Normal state, orders can be submitted
- `AWAITS_NAV_UPDATE`: Dealing timestamp reached, waiting for external NAV
- `PROCESSING`: NAV updated, orders being processed at this NAV
- Back to `IDLE`: All orders processed

State is computed dynamically by `NavManagementFacet.dealingProcessState()`.

### Fund/Class Lifecycle
```
ACTIVE ↔ RETIRED → CLOSED
CLOSED → ACTIVE (admin only)
```
- `ACTIVE`: Normal operations
- `RETIRED`: No new subscriptions, redemptions still allowed
- `CLOSED`: All operations stopped, requires `totalSupply == 0`
- Effective status = `max(fundStatus, classStatus)` — most restrictive wins

### NAV Update Processing Order
1. `_processAllPendingAdjustments()` — modifies dilutionRatios
2. `mintAllPendingManagementFees()` — uses adjusted prices
3. Store NAV and price history

## Role System

| Role Constant | Value | Scope |
|---|---|---|
| `ROLE_USER` | `bytes32(0)` | Any valid account, no role check |
| `ROLE_MANAGER` | `keccak256("MANAGER")` | Per-fund: `funds[fundId].manager == accountAddress` |
| `ROLE_ADMIN` | `keccak256("ADMIN")` | Global: `roles[ROLE_ADMIN][accountAddress]` |
| `ROLE_NAV_UPDATER` | `keccak256("NAV_UPDATER")` | Global: unified roles mapping |
| `ROLE_FX_UPDATER` | `keccak256("FX_UPDATER")` | Global: unified roles mapping |
| `ROLE_SETTLEMENT` | `keccak256("SETTLEMENT")` | Global: unified roles mapping |

## Order System

**Types**: SUBSCRIBE (buy shares), REDEEM (sell shares), SWAP (decomposes into linked REDEEM + SUBSCRIBE)

**Flow**: Submit → PENDING → NAV update → Process → FILLED/CANCELLED

**Features**: conditional orders (minPrice/maxPrice), due dates, target amounts, partial fills, forced redemptions, cross-umbrella settlement with FX, dependent orders (SWAP linking)

**Redeem tokens**: Redeem orders specify a dealing token ID (not a class token). Dealing tokens represent shares minted at a specific NAV point.

## Multi-Currency

- Fund has one `reportingCurrency` (base currency for NAV)
- Classes have `denominationCurrency` (investor-facing currency)
- Settlement always in class denomination currency
- Cash fund tokens: one per umbrella per currency (`TokenIdUtils.createCashFundTokenId(umbrellaId, currencyISO)`)
- FX rates: stored as `1 USD = X currency` scaled by PRECISION. Cross-rates derived via USD triangulation
- FX updater role: `ROLE_FX_UPDATER`, updates via `updateFXRates()`

## Class-Specific Adjustments

Costs/gains that affect specific classes (FX hedging, distribution fees, etc.) are posted as pending adjustments and processed during the next NAV update.

**Signed amounts**: positive = cost (increases class dilution), negative = gain (decreases class dilution)

**Labels** (`AdjustmentLabel` enum, 13 values):
- Cost-only: DISTRIBUTION_FEE, PLATFORM_FEE, AUDIT_FEE, LEGAL_FEE, REGULATORY_FEE, SETUP_COST, CUSTODY_FEE, TRANSACTION_COST
- Gain-only: TAX_RECLAIM, REBATE
- Bidirectional: HEDGE, TAX_PROVISION, OTHER

Direction validation: posting a positive amount with a gain-only label (or negative with cost-only) reverts with `AdjustmentDirectionMismatch`.

**Safety**: `ProtocolSafetyConfig.maxAdjustmentBps` caps single-adjustment impact per class.

**Audit trail**: `getClassAuditTrail()` merges fee history and adjustment history chronologically.

## Facets (16)

| Facet | Purpose |
|---|---|
| **AccountFacet** | Account creation, permissions (owner/operator), multisig proposal system, transaction execution |
| **OrderManagementFacet** | Order submission (subscribe/redeem/swap), cancellation, processing with NAV-synced dealing |
| **OrderValidationFacet** | External view validation for order submission/cancellation (split from OrderManagement for EIP-170 size limit) |
| **FundTokensFacet** | ERC1155 implementation, token locking/unlocking, hierarchical holdings tracking, transfers |
| **FundManagementFacet** | Fund/class/dealing/umbrella creation, onramp/offramp, dealing token conversion, configuration |
| **NavManagementFacet** | NAV updates with safety checks, price calculations (fund/class/dealing), dealing process state, protocol safety config |
| **FeeManagementFacet** | Management fee calculation/minting, performance fee batch minting, risk metrics, fee/audit history |
| **ClassAdjustmentFacet** | Class-specific cost/gain adjustments (posting, cancelling, querying), audit trail merging fees + adjustments |
| **EligibilityFacet** | Investor eligibility (KYC, accreditation, jurisdiction, investor type, commercial tags) |
| **FundLifecycleFacet** | Fund/class lifecycle state transitions (ACTIVE/RETIRED/CLOSED), forced redemptions |
| **FXManagementFacet** | FX reference rate registry, batch rate updates, cross-rate derivation via USD triangulation |
| **SettlementFacet** | Cross-umbrella cash fund settlement with FX rate validation |
| **ViewCallsFacet** | Paginated queries for orders, transfers, portfolio events, fund/class data, holdings |
| **ViewCalls2Facet** | Eligible classes queries, investable funds view |
| **AdminViewCallsFacet** | System-wide overview stats, account summaries, role assignments for admin dashboard |
| **ManagerViewCallsFacet** | Fund summaries, class performance metrics for manager dashboard |

## Storage Layout

All state in `AppStorage` at slot 0, namespaced:
- `s.FundAdmin[0]` — Funds, classes, dealings, orders, umbrella funds, currencies, FX, adjustments
- `s.FundTokens[0]` — ERC1155 balances, supply, transfers, hierarchical holdings, locked balances
- `s.Account[0]` — Accounts, permissions, proposals, wallet-account registry
- `s.PerformanceFeeCalculator[0]` — Fee calculation window config

Key shared struct: `BaseInfo` — used for funds, classes, cash tokens, dealings. Fields: `name`, `totalSupply` (uint128), `createdAt` (uint32), `dilutionRatio` (uint128).

## Key Constants (`src/libs/Constants.sol`)

| Constant | Value | Meaning |
|---|---|---|
| `PRECISION` | `1e18` | All price/amount arithmetic |
| `BPS_DENOMINATOR` | `10000` | Basis points (10000 = 100%) |
| `SECONDS_PER_YEAR` | `31536000` | Fee annualization |
| `ELYSIUM_UMBRELLA_ID` | `1` | Default umbrella created at init |
| `FIRST_FUND_NUM` | `1` | Funds start at 1 (0 reserved) |
| `FIRST_USER_CLASS_ID` | `2` | Class 1 = fee class; user classes start at 2 |
| `MIN_FUND_DILUTION_RATIO` | `0.01e18` | Floor for fund dilution (1%) |
| `MAX_PENDING_ADJUSTMENTS` | `100` | Max pending adjustments per fund |
| `ISO_USD` | `840` | USD currency code |
| `ISO_EUR` | `978` | EUR currency code |
| `ISO_GBP` | `826` | GBP currency code |
| `ISO_CHF` | `756` | CHF currency code |
| `ISO_JPY` | `392` | JPY currency code |

## Key Source Files

| File | Purpose |
|------|---------|
| `src/libs/LibAppStorage.sol` | All storage structs and AppStorage root |
| `src/shared/BaseFacet.sol` | Base for all facets: modifiers, role constants, `_validateAndPropose()` |
| `src/shared/FundAdminStructs.sol` | All business structs and enums |
| `src/libs/TokenIdUtils.sol` | Token ID encoding/decoding (64-bit hierarchical scheme) |
| `src/libs/Constants.sol` | All system constants |
| `src/interfaces/ISharedErrors.sol` | Common custom errors shared across facets |
| `src/init/InitDiamond.sol` | Diamond initialization (creates umbrella 1, registers default currencies) |
| `src/generated/IDiamondProxy.sol` | Auto-generated unified interface for all facets |

## Offchain Services

- **NAV Calculator** — computes fund NAV from external portfolio data
- **NAV Updater** — authorized service calling `updateNav()` (role: `ROLE_NAV_UPDATER`)
- **FX Updater** — provides currency exchange rates (role: `ROLE_FX_UPDATER`)
- **KYC Provider** — investor eligibility verification
- **Fiat/Crypto Onramp** — settlement in various currencies

## Build, Test & Mandatory Rules

See `contracts/CLAUDE.md` for build commands and `claude_context/errors/blockchain.md` (E-BC01–BC03) for mandatory rules.

**Foundry config** (`foundry.toml`): Solidity 0.8.30, optimizer 200 runs, `via_ir = false`. CI profile: 10k fuzz runs, 1k invariant runs.
