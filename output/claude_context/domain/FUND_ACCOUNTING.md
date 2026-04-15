# Fund Accounting & NAV Calculation

<!-- ~7000 tokens -->
**Last Updated:** 2026-02-10

---

## NAV Calculation: Fund Level

**Step 1 -- Gross Asset Value (GAV):**
Sum all assets (securities at market value + cash + receivables) minus all liabilities (payables, accrued fund-level expenses).

**Step 2 -- Allocation Ratios:**
Each class owns a proportion of the fund. Ratios change daily as subscriptions/redemptions flow and class-specific adjustments diverge values.

**Step 3 -- Allocate Fund P&L Pro-Rata:**
Portfolio gains/losses distributed to each class by allocation ratio. At this stage all classes have identical percentage returns.

**Step 4 -- Class-Specific Adjustments:**
This is where classes diverge:
- Management fee accrual (different rates per class)
- Performance fee accrual (if applicable)
- Hedging P&L (mark-to-market of FX forwards)
- Hedging transaction costs (bid-ask on rolls)
- Distribution/trailer fees
- Class-specific expenses (legal, audit allocation, etc.)

**Step 5 -- NAV Per Share:**
Divide each class's adjusted NAV by its shares outstanding.

---

## Elysium's On-Chain Price Formula

```
fundPrice      = nav * PRECISION / fundTotalSupply
adjustedFundPrice = fundPrice * PRECISION / fundDilution
classPrice     = adjustedFundPrice * PRECISION / classDilution
dealingPrice   = classPrice * PRECISION / dealingDilution
```

For multi-currency: `classPriceInDenom = classPrice * fxRate(fundCurrency -> classCurrency) / PRECISION`

### Three-Level Dilution System

| Level | Storage | Purpose | Direction |
|---|---|---|---|
| **Fund-level** | `baseInfo[fundId].dilutionRatio` | Compensate all classes for costs embedded in external NAV | Goes DOWN for costs |
| **Class-level** | `baseInfo[classId].dilutionRatio` | Charge specific classes their fair share (shared with mgmt fees) | Goes UP for costs |
| **Dealing-level** | `baseInfo[dealingId].dilutionRatio` | Charge specific dealings the performance fee (different HWM) | Goes UP for costs |

Key insight: fund dilution and class dilution move in **opposite directions** for costs.

---

## Automated vs. Manual in Traditional Admin

### Fully Automated
- Data feeds from custodians, prime brokers, market data providers
- Securities pricing from vendor feeds with exception-based review
- Position reconciliation (custodian vs. accounting, nightly)
- Accruals (management fees, performance fees, admin fees -- daily)
- Corporate actions (dividends, splits, mergers)
- FX hedge tracking (especially when custodian IS the admin)

### Still Manual
- Complex/illiquid valuations
- Exception handling (trade breaks, pricing disputes)
- NAV sign-off (human reviews every NAV before publication)
- New fund onboarding (structure, classes, fee schedules)
- Irregular costs (legal invoices, audit fees) -- initially manual, then rules-based

---

## Cost Tagging for Classes

- **Fund-level costs**: Configured as accrual rules at setup; auto-computed daily per class. No human touch after configuration.
- **Portfolio positions**: NOT tagged to classes. Shared pro-rata. No "this Apple position belongs to Class A."
- **FX hedging forwards**: Tagged to specific class via strategy/portfolio sleeve identifier. Initial tagging manual; daily P&L then automatic.
- **Irregular costs**: Manual journal entry with allocation decision. Can be rule-based for recurring items.

---

## NAV Update Processing Order (On-Chain)

1. `_processAllPendingAdjustments()` -- modifies dilutionRatios
2. `mintAllPendingManagementFees()` -- uses adjusted prices
3. Store NAV and price history

---

## Class-Specific Adjustments

Signed amounts: positive = cost (increases class dilution), negative = gain (decreases class dilution).

**Labels** (13 values): DISTRIBUTION_FEE, PLATFORM_FEE, AUDIT_FEE, LEGAL_FEE, REGULATORY_FEE, SETUP_COST, CUSTODY_FEE, TRANSACTION_COST, TAX_RECLAIM, REBATE, HEDGE, TAX_PROVISION, OTHER.

Safety: `ProtocolSafetyConfig.maxAdjustmentBps` caps single-adjustment impact per class.

---

## Fund Accounting Journal Entries

<!-- Updated 2026-02-10: Added journal entry examples for fund accountants -->

Double-entry bookkeeping applies to funds like any other entity. Below are the key entries a fund accountant processes. See `ACCOUNTING_STANDARDS.md` for IFRS/US GAAP treatment.

### Subscription (Investor buys shares)

```
Dr  Cash / Bank Account              $1,000,000
  Cr  Share Capital (Class A)                     $1,000,000
```
Shares issued at NAV per share on dealing day. If subscription fee applies:
```
Dr  Cash / Bank Account              $1,010,000
  Cr  Share Capital (Class A)                     $1,000,000
  Cr  Subscription Fee Income                        $10,000
```

### Redemption (Investor sells shares)

```
Dr  Share Capital (Class A)          $500,000
  Cr  Cash / Bank Account (payable)               $500,000
```
If redemption fee applies, net amount paid to investor is reduced.

### Management Fee Accrual (Daily)

```
Dr  Management Fee Expense           $1,644    (1% / 365 × $60M NAV)
  Cr  Management Fee Payable                       $1,644
```
On payment date (typically monthly/quarterly):
```
Dr  Management Fee Payable           $49,315   (accumulated accrual)
  Cr  Cash / Bank Account                         $49,315
```

### Performance Fee Crystallization (Period-end)

```
Dr  Performance Fee Expense          $200,000
  Cr  Performance Fee Payable                     $200,000
```
Crystallization resets the accrual; HWM is updated. See `FEES_AND_EQUALIZATION.md`.

### Dividend Income Received

```
Dr  Cash / Bank Account              $50,000
Dr  Withholding Tax Receivable       $7,500    (15% WHT on $50K gross)
  Cr  Dividend Income                              $57,500   (gross amount)
```

### Unrealized Gain on Investment

```
Dr  Investment in Securities         $100,000   (mark-to-market increase)
  Cr  Unrealized Gain on Investments              $100,000
```

### Realized Gain on Sale

```
Dr  Cash / Bank Account              $550,000   (sale proceeds)
  Cr  Investment in Securities                    $500,000   (cost basis)
  Cr  Realized Gain on Investments                 $50,000
```

---

## Fund Chart of Accounts (Typical Structure)

| Account Category | Examples | Notes |
|---|---|---|
| **Assets** | | |
| Investments at fair value | Equities, bonds, derivatives, funds | Marked to market daily |
| Cash and equivalents | Bank accounts, money market, margin accounts | Per currency |
| Receivables | Dividends, interest, tax reclaims, pending sales | Accrued or settled |
| **Liabilities** | | |
| Payables | Pending purchases, redemptions payable | Settled on T+n |
| Accrued expenses | Mgmt fee, admin fee, custody, audit, legal | Daily accrual |
| Borrowings | Bank lines, margin loans | If applicable |
| **Equity / Net Assets** | | |
| Share capital | Per class — shares × NAV at issuance | Subscriptions/redemptions |
| Retained earnings | Accumulated P&L | Undistributed income |
| **Income** | | |
| Dividend income | Gross of WHT | By security |
| Interest income | Bonds, deposits, repos | Accrued daily |
| Realized gains/losses | On disposal of investments | By lot/FIFO/average |
| Unrealized gains/losses | Mark-to-market movements | Daily revaluation |
| **Expenses** | | |
| Management fees | Daily accrual per class | Rate × NAV / 365 |
| Performance fees | Accrual per dealing with HWM | See equalization |
| Administration fees | Typically fixed + basis points | |
| Custody fees | Basis points on AUM + transaction fees | |
| Audit, legal, director fees | Annual, accrued monthly | Allocated across classes |

---

## The Fund Accounting Cycle

```
Daily:
  1. Receive market data (prices, FX rates, corporate actions)
  2. Value portfolio (mark-to-market all positions)
  3. Record income (dividends declared, interest accrued)
  4. Accrue expenses (management fee, admin fee, etc.)
  5. Process subscriptions/redemptions (share issuance/cancellation)
  6. Calculate NAV per share per class
  7. Reconcile positions (admin vs. custodian)
  8. Review and sign-off
  9. Publish NAV

Monthly:
  10. Pay accrued management fees
  11. Prepare management accounts / trial balance
  12. Reconcile cash (bank statements)

Quarterly:
  13. Prepare investor statements
  14. File regulatory reports (AIFMD Annex IV, Form PF)
  15. Calculate and pay distributions (if applicable)

Annually:
  16. Prepare financial statements
  17. Support external audit
  18. File tax reports (FATCA/CRS)
  19. Produce annual report
```

See `RECONCILIATION_AND_OPS.md` for detailed operational procedures at each stage.

---

## Accrued Interest Calculation Conventions

<!-- Added 2026-02-10: Day count conventions, clean/dirty price, worked examples -->

Bond interest accrues between coupon dates. The day count convention determines how many "days" are counted for accrual purposes. Different markets and instruments use different conventions.

### Day Count Convention Reference

| Convention | Formula | Typical Use |
|---|---|---|
| **30/360** (Bond Basis) | `[(Y2-Y1)×360 + (M2-M1)×30 + (D2-D1)] / 360` | US corporate bonds, US agency bonds |
| **Actual/360** | `actual days / 360` | US T-bills, EUR money market, SOFR |
| **Actual/365 Fixed** | `actual days / 365` | UK gilts, GBP money market |
| **Actual/Actual ISDA** | `actual days / actual days in year` | US Treasuries, EUR government bonds |
| **Actual/Actual ICMA** | `days in period / (frequency × days in coupon period)` | Fixed-rate coupon bonds (ICMA market) |

### Worked Example

$1,000,000 face value, 5% annual coupon, 74 days since last coupon (semi-annual payment):

| Convention | Day Count Fraction | Accrued Interest |
|---|---|---|
| 30/360 | 74/360 = 0.20556 | $10,278 |
| Actual/360 | 74/360 = 0.20556 | $10,278 |
| Actual/365 Fixed | 74/365 = 0.20274 | $10,137 |
| Actual/Actual ISDA (non-leap) | 74/365 = 0.20274 | $10,137 |
| Actual/Actual ICMA (182-day period) | 74/(2×182) = 0.20330 | $10,165 |

### Clean Price vs. Dirty Price

- **Clean price**: quoted price excluding accrued interest (what traders see on screens)
- **Dirty price** (full price): clean price + accrued interest (what the buyer actually pays)

Fund accounting treatment: the bond is recorded at dirty price (full cost). Accrued interest purchased is booked as a separate receivable that flows to income on the next coupon date:

```
Dr  Investment in Bonds (clean)       $1,020,000
Dr  Accrued Interest Receivable           $10,278
  Cr  Cash / Settlement Payable                     $1,030,278
```

On coupon receipt, the accrued interest receivable is reversed and the net amount is recognized as income. See `ACCOUNTING_STANDARDS.md` for IFRS 9 effective interest method requirements.

---

## Bond Premium Amortization & Discount Accretion

<!-- Added 2026-02-10: Effective interest method, straight-line method, distributable income impact -->

When a bond is purchased above par (premium) or below par (discount), the difference must be amortized/accreted over the bond's remaining life.

### Effective Interest Method (Required IFRS 9, Preferred ASC 946)

- **Interest income recognized** = carrying amount × yield at purchase (market yield)
- **Amortization** = coupon received − interest income recognized

### Worked Example: Premium Bond

$1,000,000 par, purchased at $1,050,000 (105%), 5% coupon, 4% market yield, 5-year maturity, annual coupons.

| Year | Carrying Amount (BOY) | Coupon (5%) | Interest Income (4%) | Amortization | Carrying Amount (EOY) |
|---|---|---|---|---|---|
| 1 | $1,050,000 | $50,000 | $42,000 | $8,000 | $1,042,000 |
| 2 | $1,042,000 | $50,000 | $41,680 | $8,320 | $1,033,680 |
| 3 | $1,033,680 | $50,000 | $41,347 | $8,653 | $1,025,027 |
| 4 | $1,025,027 | $50,000 | $41,001 | $8,999 | $1,016,028 |
| 5 | $1,016,028 | $50,000 | $40,641 | $9,359 | $1,006,669* |

*Rounding adjustment applied at maturity to reach par $1,000,000.

Journal entry (Year 1):
```
Dr  Cash                               $50,000   (coupon received)
  Cr  Interest Income                                $42,000
  Cr  Investment in Bonds (amortization)              $8,000
```

### Straight-Line Method

Permitted under certain US GAAP elections. Equal amortization each period: $50,000 / 5 years = $10,000/year.

### Discount Accretion

Reverse process: carrying amount increases toward par. Interest income recognized exceeds coupon received, and the difference is added to the carrying amount.

### Impact on Distributable Income

Premium amortization **reduces** reported interest income (and thus distributable income). Discount accretion **increases** it. This directly affects distribution calculations per share. See `DISTRIBUTIONS_AND_INCOME.md` for distribution methodology.

---

## Distribution Calculation Methodology

<!-- Added 2026-02-10: Distributable income pool, per-share calculation, equalization, multi-class -->

### Determining the Distributable Income Pool

1. **Gross income**: dividends, interest (net of amortization/accretion), rental income, securities lending fees
2. **Subtract deductible expenses**: management fee, admin fee, custody, audit, legal, regulatory levy
3. **Exclude unrealized gains/losses**: never distributable regardless of jurisdiction
4. **Realized capital gains**: jurisdiction-dependent:
   - *Irish UCITS*: typically **not** distributable (retained in NAV)
   - *US RICs (IRC §4982)*: **must** distribute substantially all realized gains or pay 4% excise tax

### Per-Share Calculation

```
Distribution per share = Distributable income / Weighted average shares outstanding
```

Weighted average shares accounts for subscriptions and redemptions during the distribution period, not point-in-time share count.

### Equalization Adjustment

Mid-period subscribers pay for accrued income embedded in the NAV. The equalization portion is returned to them as a non-taxable return of capital:

```
Net distribution = Gross distribution per share − Equalization amount per share
```

See `DISTRIBUTIONS_AND_INCOME.md` for the full equalization lifecycle and `FEES_AND_EQUALIZATION.md` for performance fee equalization.

### Multi-Class Allocation

Income is allocated proportional to each class's NAV as at the ex-date, unless class-specific income exists (e.g., a hedging gain attributable to one class). Class-specific expenses reduce that class's distributable pool.

### Accumulation vs. Distribution Classes

Both classes share the same income pool. **Distribution (DIST)** classes pay out; **accumulation (ACC)** classes retain income in NAV (reflected as higher NAV per share). The income recognition is identical; only the cash flow differs.

---

## Cross-Trade and Inter-Fund Transaction Accounting

<!-- Added 2026-02-10: Definition, regulatory requirements, pricing, accounting treatment -->

### Definition

A cross-trade is a securities transaction between two funds (or sub-funds of the same umbrella) managed by the same investment manager, executed without going through an external market.

### Regulatory Requirements

| Jurisdiction | Rule | Key Requirements |
|---|---|---|
| **US (1940 Act)** | [Rule 17a-7](https://www.law.cornell.edu/cfr/text/17/270.17a-7) | Security must have readily available market quotations; price at independent current market price (average of highest bid and lowest offer); board must adopt procedures; no brokerage commission |
| **EU (AIFMD)** | [Regulation 231/2013](https://eur-lex.europa.eu/eli/reg_del/2013/231/oj/eng), Articles 25-29 (conflicts of interest, order aggregation) | Must be in best interest of both funds; fair allocation; conflicts of interest policy required; documented justification |
| **UCITS** | UCITS Directive Art. 25 + national ManCo rules | Permitted if executed at arm's length; compliance pre-approval; must benefit both funds; pricing at fair market value |

### Pricing

Cross-trades are typically executed at **mid-market price** (average of bid and ask) at the time of execution. For fixed income, this may be the mid of independent dealer quotes. The pricing must be documented and defensible.

### Documentation Requirements

- Cross-trade report with transaction justification
- Compliance pre-approval (before execution)
- Best execution analysis demonstrating benefit to both funds
- Board/ManCo ratification (periodic or per-trade)

### Accounting Treatment

Each fund records normal buy/sell entries. No brokerage commission is charged (or a reduced internal crossing fee may apply):

**Selling fund:**
```
Dr  Cash / Receivable                  $500,000
  Cr  Investment in Securities                       $480,000   (cost basis)
  Cr  Realized Gain                                   $20,000
```

**Buying fund:**
```
Dr  Investment in Securities           $500,000
  Cr  Cash / Payable                                 $500,000
```

The absence of brokerage commission benefits both funds. Any settlement occurs through the shared custodian or transfer agent. See `DERIVATIVES_AND_MARGIN.md` for derivative-specific cross-trade considerations.

---

## Sources

- [ISDA Day Count Conventions — Wikipedia](https://en.wikipedia.org/wiki/Day_count_convention)
- [SEC Rule 17a-7 — eCFR](https://www.law.cornell.edu/cfr/text/17/270.17a-7)
- [SEC Staff Statement on Cross Trading (2021)](https://www.sec.gov/newsroom/speeches-statements/investment-management-statement-investment-company-cross-trading-031121)
- [AIFM Delegated Regulation 231/2013 — EUR-Lex](https://eur-lex.europa.eu/eli/reg_del/2013/231/oj/eng)
- [Day Count Conventions — OpenGamma Strata](https://strata.opengamma.io/apidocs/com/opengamma/strata/basics/date/DayCounts.html)
- [Corporate Finance Institute — Day Count Convention](https://corporatefinanceinstitute.com/resources/derivatives/day-count-convention/)
