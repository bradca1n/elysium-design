<!-- ~9000 tokens -->
# Distributions and Income Processing

**Last Updated:** 2026-02-10

---

**Cross-references:** `FUND_ACCOUNTING.md` (NAV calculation, class-specific adjustments, journal entries), `FEES_AND_EQUALIZATION.md` (performance fee equalization -- distinct from income equalization), `SHARE_CLASSES.md` (accumulation vs. distribution classes, multi-currency denomination), `TAX.md` (WHT on dividends/interest, FATCA/CRS reporting, investor tax treatment), `ACCOUNTING_STANDARDS.md` (IFRS 9 classification, ASC 946 Statement of Operations, income recognition)

---

## 1. Distribution Policy and Calculation

### Distributable Income Determination

Distributable income is the pool of earnings available for payout to investors. It is calculated as:

```
Distributable Income = Gross Income - Deductible Expenses
```

| Component | Included | Examples |
|-----------|----------|----------|
| **Gross Income** | Yes | Dividends received, bond coupon interest, rental income, securities lending fees, bank deposit interest |
| **Deductible Expenses** | Subtracted | Management fee, administration fee, custody fee, audit fee, legal fee, regulatory levy |
| **Unrealized gains/losses** | No | Mark-to-market changes on unsold securities are NEVER distributable income |
| **Realized capital gains** | Depends | Distributable only if fund constitution and jurisdiction permit; Irish UCITS typically do not distribute realized gains; US RICs must distribute substantially all realized gains annually |

### Distribution Frequency

| Frequency | Typical Fund Type | Calendar |
|-----------|-------------------|----------|
| Monthly | Bond funds, income-focused equity funds | Declared last business day, paid mid-following month |
| Quarterly | Balanced funds, multi-asset | March, June, September, December |
| Semi-annual | Equity funds (EU/UK common) | June and December |
| Annual | Growth-oriented funds, some UCITS | Typically aligned with fund fiscal year-end |

### Key Dates

| Date | Definition | NAV Impact |
|------|-----------|------------|
| **Declaration date** | Board approves distribution amount per share | None (accrual already in NAV via income recognition) |
| **Ex-distribution date** | First date shares trade without entitlement to distribution | NAV drops by distribution amount per share |
| **Record date** | Investors on register at this date receive the distribution; typically T+1 after ex-date (matching settlement cycle) | None |
| **Payment date** | Cash transferred to investors; typically 2-4 weeks after record date | None (liability extinguished) |

**Ex-date mechanics:** An investor who buys shares on or after the ex-date does NOT receive the pending distribution. The NAV per share falls by exactly the distribution amount on the ex-date morning. This is not a loss -- the investor receives either cash (distribution class) or reinvested units (accumulation class).

### Fixed vs. Variable Distributions

- **Variable (standard):** Distribution equals actual distributable income for the period. Amount fluctuates with portfolio income and expenses.
- **Fixed/target rate:** Fund commits to a distribution rate (e.g., 5% p.a. of NAV, paid monthly at ~0.417%). If actual income is insufficient, the shortfall is funded from capital (return of capital). This erodes NAV over time.
- **Managed distribution policy:** Board sets a target amount, funded first from income, then realized gains, then return of capital. Common in closed-end funds and retirement income products.

### Accumulation Class Treatment

Accumulation (ACC) classes receive the same underlying income as distribution (DIST) classes but handle it differently:

| Aspect | Distribution Class | Accumulation Class |
|--------|-------------------|-------------------|
| Cash payment | Yes -- investor receives cash | No -- no cash leaves the fund |
| NAV impact | NAV drops by distribution amount on ex-date | NAV continues to reflect reinvested income |
| Share count | Unchanged | Unchanged (income increases NAV per share, not share count) |
| Tax treatment | Investor taxed on cash received | Investor taxed on "notional distribution" (deemed income) in many jurisdictions even though no cash received |
| Accounting | Debit retained income, credit cash payable | Debit income account, credit capital reserve (internal transfer within NAV) |

---

## 2. Income Equalization (CRITICAL -- Distinct from Performance Fee Equalization)

### The Problem

When an investor subscribes mid-period, the NAV they pay includes accrued but undistributed income earned before they invested. Without equalization, the next distribution would return part of their own subscription capital disguised as "income," creating an unfair tax burden.

### How It Works

1. **At subscription:** Calculate accrued income per share on the dealing date. This is the **equalization amount** -- the portion of the subscription price attributable to accrued income.
2. **At next distribution:** The subscriber's distribution is split:
   - **Equalization amount** = return of capital (not taxable income; reduces cost basis)
   - **Remainder** = genuine income (taxable)
3. **For existing investors:** The full distribution amount is taxable income.

### Worked Example

| Step | Detail |
|------|--------|
| Fund accrued income per share on dealing date | $2.00 |
| NAV per share at subscription | $102.00 ($100.00 capital + $2.00 accrued income) |
| Investor subscribes for 1,000 shares | Pays $102,000 total |
| **Equalization amount recorded** | **$2.00 per share x 1,000 = $2,000** |
| Distribution declared at period end | $3.00 per share |
| **New investor receives:** | $3,000 total |
| -- Equalization (return of capital) | $2,000 (not taxable; reduces cost basis to $100,000) |
| -- Taxable income | $1,000 |
| **Existing investor receives:** | $3,000 total |
| -- Taxable income | $3,000 (full amount) |

### Administrative Requirements

- **Per-investor tracking:** Equalization amounts must be tracked per investor per subscription per distribution period. This is one of the most operationally complex areas of fund administration.
- **UK "equalisation":** Mandatory for UK-authorized funds under FCA COLL 6.8. Must be disclosed on contract notes and tax vouchers. HMRC treats equalization as return of capital.
- **Irish UCITS:** Income equalization is standard practice, disclosed in the fund prospectus.
- **Accumulation classes:** Equalization still applies -- the notional reinvested amount is split into equalization and income components for tax reporting.

### Distinction from Performance Fee Equalization

Income equalization (this section) adjusts distributions so mid-period subscribers are not taxed on their own capital. **Performance fee equalization** (see `FEES_AND_EQUALIZATION.md`) ensures mid-period subscribers pay their fair share of performance fees. These are entirely separate mechanisms addressing different problems, though both use the word "equalization."

---

## 3. Bond and Fixed Income Accounting

### Day Count Conventions

Day count conventions determine how accrued interest is calculated between coupon dates.

| Convention | Formula | Used For | Example: Feb 1 to Apr 15, 2026 (non-leap year) |
|-----------|---------|----------|------------------------------------------------|
| **30/360** (Bond basis) | (Y2-Y1)x360 + (M2-M1)x30 + (D2-D1) / 360 | US corporate bonds, US agency bonds | (0x360 + 2x30 + 14) / 360 = 74/360 = **0.2056** |
| **Actual/360** | Actual days / 360 | US T-bills, Euro money market, LIBOR/SOFR | 73 / 360 = **0.2028** |
| **Actual/365 Fixed** | Actual days / 365 | UK gilts, GBP money market | 73 / 365 = **0.2000** |
| **Actual/Actual ISDA** | Actual days / actual days in year | US Treasuries, Euro government bonds | 73 / 365 = **0.2000** |
| **Actual/Actual ICMA** | Days in period / (frequency x days in coupon period) | Fixed-rate bond coupon periods | Depends on coupon period boundaries |

**Actual days calculation (Feb 1 to Apr 15, non-leap):** February has 28 days remaining (28-1=27), March has 31 days, April has 15 days = 27 + 31 + 15 = 73 actual days.

### Accrued Interest Calculation

```
Accrued Interest = Face Value x Coupon Rate x Day Count Fraction
```

**Example:** $1,000,000 face value bond, 5% annual coupon, 30/360 convention, 74 days since last coupon:

```
Accrued Interest = $1,000,000 x 0.05 x (74/360) = $10,277.78
```

**Clean price vs. dirty price:**
- **Clean price:** Quoted market price excluding accrued interest
- **Dirty price (invoice price):** Clean price + accrued interest = what the buyer actually pays
- **Fund accounting:** The bond is recorded at dirty price. Accrued interest is a separate receivable line item on the fund's books, ensuring it flows to income (not capital gains) when the coupon is received.

### Bond Premium Amortization (Effective Interest Method)

When a bond is purchased above par, the premium is amortized over the remaining life to maturity, reducing reported interest income each period.

**Worked example:** $1,000,000 par bond purchased at $1,050,000 (105%), 5% coupon, 4% market yield at purchase, 5-year maturity, annual coupons.

| Year | Carrying Amount (Start) | Coupon Received (5%) | Interest Income (4% yield) | Amortization | Carrying Amount (End) |
|------|------------------------|---------------------|---------------------------|-------------|----------------------|
| 1 | $1,050,000 | $50,000 | $42,000 | $8,000 | $1,042,000 |
| 2 | $1,042,000 | $50,000 | $41,680 | $8,320 | $1,033,680 |
| 3 | $1,033,680 | $50,000 | $41,347 | $8,653 | $1,025,027 |
| 4 | $1,025,027 | $50,000 | $41,001 | $8,999 | $1,016,028 |
| 5 | $1,016,028 | $50,000 | $40,641 | $9,359 | $1,006,669* |

*Rounding causes slight deviation from par; final period adjusted to bring carrying amount to exactly $1,000,000.

**Key principle:** Interest income recognized each period is the carrying amount multiplied by the yield at purchase (4%), NOT the coupon rate (5%). The difference between coupon received and interest income recognized is the amortization of the premium.

### Bond Discount Accretion

The reverse of premium amortization. When a bond is purchased below par, the discount accretes over remaining life, increasing reported interest income each period. Carrying amount rises toward par at maturity.

### Special Bond Income Types

| Type | Treatment |
|------|-----------|
| **PIK (Payment-in-Kind)** | Interest paid as additional bonds/notes, not cash. Recognized as income; increases position quantity. No cash inflow until sale or maturity. |
| **Default/distressed bonds** | Stop accruing interest when default is probable (IFRS 9 impairment trigger). Write down carrying amount to expected recovery value. Previously accrued but uncollected interest reversed. |
| **Inflation-linked (TIPS/ILBs)** | Principal adjusted by CPI index ratio each period. Interest calculated on inflation-adjusted principal. Inflation adjustment is unrealized gain/loss until maturity. Example: $1,000,000 TIPS, 2% real coupon, CPI ratio 1.03 -> adjusted principal $1,030,000, semi-annual interest = $1,030,000 x 0.02 / 2 = $10,300. |

---

## 4. Dividend and Other Income

### Dividend Income Recognition

Dividend income is recognized on the **ex-dividend date** -- the date on which the fund becomes legally entitled to the dividend -- not on the declaration date or payment date (IAS 18 / IFRS 15, ASC 946-605).

**Journal entry on ex-date:**
```
Debit:  Dividend Receivable     $10,000
Credit: Dividend Income          $10,000
```

**Journal entry on payment date:**
```
Debit:  Cash                    $10,000
Credit: Dividend Receivable      $10,000
```

### Stock and Scrip Dividends

When a company pays a dividend in additional shares rather than cash:
- Record at fair market value on payment date
- Debit investment account (increase position), credit dividend income
- Adjusts cost basis per share for the entire holding

### REIT Distribution Reclassification

REITs distribute a mix of ordinary income, capital gains, and return of capital, but the exact breakdown is often not known until year-end tax reporting (Form 1099-DIV in the US, issued by January 31 for the prior tax year). Fund administrators must:

1. **Initially** classify the full distribution as ordinary income
2. **Reclassify** when Form 1099-DIV data is received (often Q1 of following year)
3. **Adjust** NAV and investor tax reporting retroactively if reclassification is material

### Preferred Dividend Tracking

| Type | Accrual Rule |
|------|-------------|
| **Cumulative preferred** | Accrue dividend even if not declared; obligation accumulates. Include in receivables as "dividends in arrears." |
| **Non-cumulative preferred** | Recognize only when declared by the board. No accrual for missed periods. |

### Securities Lending Income

When a fund lends securities, the borrower receives the actual dividend and must pay a **manufactured dividend** back to the fund (lender). This manufactured dividend:
- May differ in tax treatment from the actual dividend (potentially no treaty relief, withholding at full statutory rate)
- Is recorded as securities lending income, not dividend income
- Must be disclosed separately in financial statements

### DRIP (Dividend Reinvestment Plans)

When a fund participates in issuer DRIPs:
- Dividend income recognized at fair value on ex-date (same as cash dividend)
- Additional shares received at NAV or discounted price
- Cost basis of new shares = declared dividend value (not discounted purchase price, if different)
- Must track fractional shares and adjusted average cost basis

---

## 5. Special Distributions

### Return of Capital Distributions

A distribution classified as return of capital (ROC) when distributable income is insufficient or by fund policy:

- **Not taxable income** to the investor (in most jurisdictions)
- **Reduces the investor's cost basis** in the fund
- When cost basis reaches zero, further ROC distributions become taxable as capital gains
- Common in: managed distribution funds, real estate funds, MLPs, wind-down scenarios

### Liquidating Distributions

During fund wind-down or termination:
- Assets sold progressively; proceeds distributed to investors
- Each distribution splits into: final income (if any), capital gains, and return of capital
- Final distribution extinguishes all shares; fund deregistered
- Must account for liquidation expenses (legal, audit, regulatory) before final payout

### In-Kind Distributions

Securities transferred directly to investors instead of cash:
- Valued at fair market value on distribution date
- Triggers realization event for the fund (realized gain/loss on the securities distributed)
- Investor receives securities with cost basis equal to fair market value at distribution
- Common in: institutional redemptions, fund-of-funds, ETF creation/redemption (authorized participants)
- Requires transfer agent coordination and custodian settlement

### UK Equalisation Distributions

Under FCA COLL 6.8 rules, UK-authorized funds must:
- Calculate and disclose equalisation amounts on every distribution
- Show equalisation separately on tax vouchers sent to investors
- First distribution received after purchase includes equalisation component
- Equalisation is return of capital for UK tax purposes (reduces CGT base cost)
- Applies to both income and accumulation units

---

## 6. Elysium Implementation Considerations

For an on-chain fund administration platform, distribution processing requires:

| Requirement | On-Chain Implication |
|-------------|---------------------|
| Ex-date snapshot | Shareholder register snapshot at ex-date block; immutable record of entitled holders |
| Equalization tracking | Per-investor accrued income at subscription stored on-chain or in off-chain database with on-chain hash |
| Distribution payment | Batch transfer of distribution tokens (cash fund tokens) to all entitled holders |
| Accumulation class | No token transfer; NAV per share adjustment via dilution ratio or direct price update |
| Multi-currency | Distribution in class denomination currency; FX conversion from fund currency at declared rate |
| Tax reporting | Off-chain tax lot tracking with on-chain audit trail; equalization split per investor per period |
| Record-keeping | Immutable distribution history per fund, per class, per investor for regulatory audit |

---

## Sources

- IIFA (Irish Investment Funds Association): [Income Equalisation Practice Notes](https://www.irishfunds.ie)
- FCA COLL 6.8: [Distribution and Reinvestment of Income](https://www.handbook.fca.org.uk/handbook/COLL/6/8.html)
- ISDA Day Count Conventions: [2006 ISDA Definitions](https://www.isda.org)
- ASC 946 (FASB): [Financial Services -- Investment Companies](https://asc.fasb.org/946)
- IFRS 9: [Financial Instruments -- Classification and Measurement](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/)
- IRS Form 1099-DIV: [Dividends and Distributions](https://www.irs.gov/forms-pubs/about-form-1099-div)
- SEC Investment Company Act Rule 19a-1: [Written Statement to Accompany Dividend Payments](https://www.sec.gov/rules)
- HMRC: [Equalisation Payments for Authorised Investment Funds](https://www.gov.uk/hmrc-internal-manuals/savings-and-investment-manual)
