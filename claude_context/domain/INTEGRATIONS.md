# Integrations & Off-Chain Architecture

<!-- ~1200 tokens -->
**Last Updated:** 2026-02-08

---

## Haruko PMS Integration

**What it is:** An institutional-grade portfolio management and risk platform for digital assets. The crypto equivalent of Bloomberg PORT -- positions, risk, and P&L in real-time.

**Key facts:** Founded 2021, London. $16M raised (Series A). 90+ institutional clients. API-first architecture. SOC 2-compliant. Onboarding: 2-4 weeks.

### Haruko Provides

| Category | Coverage |
|---|---|
| Centralized exchanges | 100+ venues (Binance, Coinbase, Kraken, etc.) |
| Custodians | BitGo, Zodia, Komainu, Gemini, Crypto.com |
| Blockchains | 30+ native support |
| DeFi protocols | 250+ (Aave, Uniswap, Curve, Lido, Compound, etc.) |
| Pricing | Configurable waterfall, derivatives pricing (SVI, SABR, Heston) |
| Reconciliation | Real-time across venues |
| Shadow NAV | Fund-level with capital flows, costs, fees |

### What Haruko Does NOT Provide

- No share class management or class-level accounting
- No investor-level accounting (subscriptions, redemptions, capital accounts)
- No fee waterfall per class
- No transfer agency, investor reporting, smart contract interaction
- **No Interactive Brokers or traditional asset integration** (purely digital assets)

---

## Architecture: Haruko + Elysium

```
MANAGER'S WORLD                    ELYSIUM PLATFORM
+---------------+                  +---------------------------+
| Exchanges     |                  |  OFFCHAIN SERVICE         |
| Custodians    |---> HARUKO ----->|  Class Allocator          |
| DeFi          |     (Unified     |  - Pro-rata P&L           |
+---------------+      API +       |  - Fee accruals           |
                       Shadow      |  - Cost allocation        |
                       NAV)        |  - Dilution calc          |
                                   |  - FX rate prep           |
                                   |          |                |
                                   |  On-Chain Poster          |
                                   |  - updateNav()            |
                                   |  - updateDilution()       |
                                   |  - updateFXRates()        |
                                   |  - processOrders()        |
                                   +----------+----------------+
                                              |
                                              v
                                   SMART CONTRACTS (Diamond)
```

---

## Data Flow Per Dealing Period

### Pulled from Haruko API
- Total portfolio value (fund-level GAV)
- Cash balances per venue/currency
- Position-level P&L (audit trail)
- Strategy-tagged P&L (for class-specific positions like hedges)
- Accrued costs/fees, token prices, reconciliation status

### Computed by Class Allocator Service
1. Calculate each class's allocation ratio
2. Allocate fund P&L pro-rata
3. Apply class-specific items (mgmt fee, perf fee, hedge P&L, other costs)
4. Compute dilution factors (fund, mgmt fee, perf fee, cost allocation)
5. Get FX rates

### Posted On-Chain
1. `updateNav(fundId, navValue)` -- fund NAV in reporting currency
2. Update dilution factors per class
3. `updateFXRates(rates)` -- for cross-currency pricing
4. `processOrders(orders, fxRates)` -- dealing execution

---

## What We Still Need to Build

| Component | Description | Status |
|---|---|---|
| **Class Allocator Service** | Transforms Haruko fund-level output into dilution model inputs. The uniquely Elysium piece. | Not started |
| **On-Chain Poster Service** | Converts allocator outputs to smart contract transactions. Handles signing, gas, error recovery. | Not started |
| **Fund Configuration UI/API** | Setup funds, classes, fee schedules, currencies. Maps Haruko strategies to share classes. | Not started |

---

## Future: Traditional Asset Support

Haruko is crypto-only. For hybrid crypto+TradFi funds:
- Need a second data source (IB API, or TradFi PMS like Eze/Bloomberg)
- Class Allocator merges data from both sources
- On-chain architecture is **asset-agnostic** -- same dilution model regardless of underlying assets

**Approach:** Start crypto-only with Haruko. Add TradFi data sources later.
