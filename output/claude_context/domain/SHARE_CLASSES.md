# Share Classes & Multi-Currency

<!-- ~3000 tokens -->
**Last Updated:** 2026-02-10

---

## How Share Classes Work

All share classes share the **same investment portfolio**. There is NOT a separate portfolio per class. What differs per class is purely an **accounting overlay**.

**Two layers:**
- **Layer 1 (Fund Level):** All securities, one combined NAV, one set of portfolio P&L, fund-level expenses
- **Layer 2 (Class Level):** Each class gets a proportional slice, with class-specific adjustments applied on top, resulting in different NAV per share

### The Hedging "Account"

FX forward contracts are fund-level assets/liabilities but **attributed** to a specific class. The fund is the legal counterparty; the admin ring-fences P&L to the hedged class. Classes do not have physically separate bank accounts -- the admin tracks a notional cash balance per class.

**Contagion risk:** If hedging losses exceed the hedged class's NAV, the fund still owes the counterparty, and that liability falls on the fund as a whole (other classes' assets).

---

## FX Hedging Models

### Unhedged
Investor bears full FX risk. Total return = fund performance + FX movement.

### Passive (Standard) Currency Hedging
- Rolling forward contracts (1-3 months) lock in future exchange rate for hedged class NAV
- Imperfect: stale hedge notional (industry tolerance: 98-102% of NAV)
- Hedging "fee" is embedded in forward rate via covered interest rate parity (~2-3% p.a. for EUR/USD currently)
- Not a separate line item

### NAV Hedging vs. Portfolio Hedging
- **NAV Hedging** (most common): Hedges base-to-class currency as single pair. Does NOT look at portfolio exposures.
- **Portfolio Hedging**: Hedges actual portfolio currency exposures. More accurate, more complex and expensive.

### Active Hedging
Manager dynamically adjusts hedge ratio (0-100%+) based on market views. Gains/losses allocated entirely to the hedged class.

---

## Multi-Currency Settlement in Elysium

| Concept | Implementation |
|---|---|
| Fund reporting currency | `FundInfo.reportingCurrency` (base currency for NAV) |
| Class denomination currency | `ClassInfo.denominationCurrency` (investor-facing) |
| Settlement currency | Always in class denomination currency |
| Cash fund tokens | One per umbrella per currency: `createCashFundTokenId(umbrellaId, currencyISO)` |
| FX rates | Stored as `1 USD = X currency` scaled by PRECISION; cross-rates via USD triangulation |
| FX updater | `ROLE_FX_UPDATER`, updates via `updateFXRates()` |

---

## On-Chain Handling of Hedging

All hedging complexity lives **offchain**. The on-chain formula already handles everything:

```
classPrice = fundPrice / fundCostDilution / (mgmtFee x perfFee x costAllocationDilution) x fxRate
```

| Hedging Model | Offchain Action | On-Chain Impact |
|---|---|---|
| Passive class hedge | Forward carry cost + settlement P&L | `costAllocationDilution` updated |
| Active class hedge | Larger/smaller P&L per hedge ratio | `costAllocationDilution` updated |
| Fund-level hedge | FX derivatives are portfolio positions | Already in fund NAV |
| Imperfect hedge (90%) | 10% residual in class P&L | `costAllocationDilution` reflects net |

**Design decision:** Use **actual incurred costs** (amount-based per dealing period), not fixed on-chain rates. Forward settlements produce varying gains/losses; audit trail accuracy requires actual numbers.

---

## Share Class Features & Variants

<!-- Updated 2026-02-10: Added comprehensive share class feature taxonomy -->

Share classes within the same sub-fund share the **same portfolio** but differ in accounting treatment, fees, currency, and investor access. Below are the standard dimensions along which classes vary.

### Income Treatment

| Type | Behavior | Naming Convention |
|---|---|---|
| **Accumulation (Acc)** | Income reinvested — increases NAV per share | Class A Acc, Class I Acc |
| **Distribution (Dist/Inc)** | Income paid out to investors (dividends) | Class A Dist, Class A Inc |

Distribution frequency: monthly, quarterly, semi-annual, annual — specified in prospectus.

### Fee Tiers

| Class | Typical Mgmt Fee | Minimum Investment | Target Investor |
|---|---|---|---|
| **Retail (A)** | 1.00–2.00% | $1,000–$10,000 | Individual investors |
| **Institutional (I)** | 0.50–1.00% | $1M–$10M | Pension funds, insurance, endowments |
| **Seed (S/X)** | 0.00–0.50% | Negotiated | Day-1 investors, founders |
| **Platform/Clean (C/Z)** | 0.50–0.75% | Via platform | Distribution platforms (no trailer fee) |
| **Bundled (B)** | 1.25–1.75% | Via IFA | Includes trailer/distribution fee |

**Clean vs. bundled**: Regulators (FCA RDR, MiFID II) are pushing toward "clean" share classes with no embedded distribution fees. Bundled classes pay trailer fees (retrocessions) to distributors — increasingly restricted. See `FEES_AND_EQUALIZATION.md` for retrocession rules.

### Currency Denomination

| Variant | Behavior |
|---|---|
| **Base currency class** | Denominated in fund's reporting currency (e.g., USD for a USD fund) |
| **Hedged class** | Denominated in non-base currency with FX hedge (e.g., EUR-hedged on a USD fund) |
| **Unhedged class** | Denominated in non-base currency without hedge — investor bears FX risk |

See the FX Hedging Models section above for details.

### Voting Rights

Most fund structures give **one vote per share** regardless of class, but:
- Some classes may be **non-voting** (typically seed/founder classes)
- Voting matters for: appointment of directors, winding up the fund, changes to prospectus, mergers
- UCITS: shareholders must approve material changes to the fund

### Other Features

| Feature | Description |
|---|---|
| **Lock-up period** | Minimum holding period before redemption allowed (e.g., 1 year) |
| **Notice period** | Days of advance notice required for redemption (e.g., 30-90 days) |
| **Redemption gates** | Fund can limit total redemptions per dealing day (e.g., max 10% of NAV) |
| **High water mark scope** | Per class or per dealing — determines performance fee fairness |
| **Subscription/redemption fees** | Entry/exit charges, typically 0–5% |
| **Dilution adjustment** | Swing pricing applied per class based on net flows |

### Elysium's On-Chain Class Model

In Elysium, each share class maps to a `classId` in the Diamond proxy:
- Class creation: `createClass(fundId, params)` — sets fee rates, denomination currency, dealing schedule
- Class-level dilution: `baseInfo[classId].dilutionRatio` captures all class-specific costs
- Dealing-level: Each dealing cycle within a class has its own `dealingId` for performance fee tracking

See `FUND_LIFECYCLE.md` for how classes are created during fund formation.
See `FEES_AND_EQUALIZATION.md` for fee structures per class.
See `TRANSFER_AGENCY.md` for subscription/redemption workflows per class.
