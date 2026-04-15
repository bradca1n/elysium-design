# Investment Mandates & Policies

<!-- ~4000 tokens -->
**Last Updated:** 2026-02-10

---

## What Is an Investment Mandate?

An investment mandate is the formal set of rules defining **what a fund can and cannot invest in**. It is documented in the fund's prospectus (for regulated funds) or PPM (for private funds) and the Investment Management Agreement (IMA). The mandate covers: eligible assets, diversification limits, leverage limits, liquidity requirements, sector/geography restrictions, ESG constraints, and benchmark tracking.

The administrator and compliance function monitor adherence to the mandate via **pre-trade** and **post-trade** compliance checks.

---

## UCITS Eligible Assets

UCITS funds may only invest in:

| Asset Type | Conditions |
|---|---|
| **Transferable securities** | Listed/traded on regulated markets; sufficiently liquid |
| **Money market instruments** | Listed or unlisted, with adequate liquidity and reliable valuation |
| **Units of other UCITS/AIFs** | Max 10% in a single target fund; target must itself comply with diversification |
| **Deposits** | With credit institutions; max 12 months maturity; repayable on demand |
| **Financial derivative instruments (FDI)** | For hedging or efficient portfolio management; underlying must be eligible; counterparty risk limits apply |
| **Recently issued transferable securities** | Must undertake to apply for listing within 1 year |

**Not eligible**: Physical commodities, real estate, unlisted equities (except recently issued), private loans, crypto-assets (under current rules).

---

## UCITS Diversification Rules (The 5/10/40 Rule)

The core diversification framework for UCITS:

```
Standard limit:      Max 5% of NAV in securities of any single issuer
Extended limit:      Can raise to 10% for certain issuers
Aggregate ceiling:   All positions >5% must not exceed 40% of NAV in aggregate
```

### Full Rule Set

| Rule | Limit | Notes |
|---|---|---|
| Single issuer (transferable securities) | 5% (extendable to 10%) | 10% positions capped at 40% aggregate |
| Government/supranational issuers | 35% (extendable to 100%) | 100% if 6+ issues, no single issue >30% |
| Single UCITS/AIF | 10% of NAV | No more than 25% of target fund's units |
| Deposits with single institution | 20% of NAV | |
| OTC derivative counterparty exposure | 5% (banks) / 10% (credit institutions) | |
| **Combined limit** (securities + deposits + OTC) | 20% per single body | Prevents concentration via multiple channels |
| Index-tracking funds | 20% (35% exceptional) per issuer | Recognizes index concentration |
| Cash/ancillary liquid assets | No explicit limit, but must be "ancillary" | |

### UCITS Borrowing

- Max 10% of NAV, temporary purposes only (bridging redemptions, settlement timing)
- Cannot be used for investment leverage
- Leverage via derivatives subject to separate limits (commitment or VaR approach)

---

## Leverage Limits

### UCITS — Commitment Approach

The **commitment approach** converts derivative positions to their equivalent underlying market value:
- Net derivative exposure ≤ 100% of NAV (i.e., total leverage ≤ 200% of NAV including the portfolio itself)
- Netting allowed for opposing positions on same underlying
- Hedging positions can be excluded
- Calculated daily

### UCITS — VaR Approach

For funds with complex derivative strategies:

| Method | Limit | Calculation |
|---|---|---|
| **Absolute VaR** | ≤ 20% of NAV | 1-month holding period, 99% confidence, 250+ business days of data |
| **Relative VaR** | ≤ 200% of reference portfolio VaR | Same parameters; reference portfolio must be derivative-free |

Funds using VaR must also disclose leverage using the commitment method for transparency.

### AIFMD — Leverage Reporting

AIFs must report leverage to regulators using **both** methods:

| Method | Description |
|---|---|
| **Gross method** | Sum of absolute notional values of all derivatives; no netting or hedging offsets allowed. Most conservative measure. |
| **Commitment method** | Allows netting and hedging offsets. More realistic measure of economic leverage. |

AIFMD does not impose hard leverage limits (unlike UCITS) but regulators can impose limits if systemic risk is identified.

### US Investment Company Act (ICA 1940)

- Borrowing: 300% asset coverage (fund assets ≥ 3× borrowings)
- Derivatives: SEC Rule 18f-4 requires funds to adopt derivatives risk management programs if derivative exposure exceeds 10% of NAV
- Full coverage: VaR-based limits for funds with significant derivative use

---

## Investment Restrictions (Common)

| Restriction | UCITS | Typical Hedge Fund (Cayman) |
|---|---|---|
| Short selling | Not permitted (synthetic short via derivatives OK) | Generally permitted |
| Physical commodities | Not permitted | Often permitted |
| Real estate (direct) | Not permitted | Permitted (RE funds) |
| Unlisted securities | Limited (max 10% of NAV) | Generally permitted |
| Borrowing | 10% of NAV, temporary only | Per LPA terms (often 100%+ of NAV) |
| Securities lending | Permitted with safeguards | Permitted |
| Concentration | 5/10/40 rule | Per prospectus (often 20-25% single name) |
| Currency exposure | Permitted, hedging optional | Per mandate |

---

## Pre-Trade and Post-Trade Compliance

### Pre-Trade Compliance

Automated system checks **before** an order is executed:
- Order is validated against all investment restrictions (prospectus, IMA, regulatory)
- If the order would breach a limit → **hard block** (order rejected) or **soft warning** (compliance officer override)
- Override requires documented justification
- Runs in real-time within order management system (OMS)

### Post-Trade Compliance

Monitoring **after** trades settle, typically daily:
- Portfolio positions checked against all limits using reconciled data
- Detects **passive breaches** (caused by market movements, redemptions changing ratios — not by trading)
- Passive breaches are not violations but must be remediated within prescribed timeframes
- Active breaches (caused by trading) require immediate notification to compliance and potentially the regulator

### Breach Remediation

| Breach Type | Detection | Timeline | Notification |
|---|---|---|---|
| Active (trading error) | Pre-trade (blocked) or post-trade | Immediate correction | Regulator (UCITS: without delay) |
| Passive (market movement) | Post-trade only | Remediate "as soon as reasonably practicable" | Internal compliance; regulator if persistent |
| Structural (fund design) | Setup review | Before launch | Regulator during authorization |

---

## ESG / Sustainability (SFDR)

The EU Sustainable Finance Disclosure Regulation (SFDR) classifies funds into three categories:

| Classification | Meaning | Disclosure Requirements |
|---|---|---|
| **Article 6** | No sustainability focus | Must disclose how sustainability risks are integrated (or explain why not) |
| **Article 8** ("light green") | Promotes environmental/social characteristics | Pre-contractual + website + periodic disclosure of ESG characteristics, proportion of sustainable investments, DNSH assessment |
| **Article 9** ("dark green") | Has a sustainable investment objective | Most stringent: must demonstrate all investments contribute to the objective; mandatory PAI (Principal Adverse Impact) reporting |

### ESMA Fund Naming Guidelines (effective May 2025)

- Funds using "ESG", "sustainable", "green", "climate" etc. in their name must align investments with those terms
- Minimum thresholds: 80% of investments aligned with promoted characteristics
- Exclusion requirements: Paris-Aligned Benchmark exclusions for "sustainable" funds

**Elysium relevance**: Investment mandate compliance is currently **offchain** — Elysium does not enforce investment restrictions on-chain. The administrator's compliance system handles this. However, the on-chain model could eventually support encoding key restrictions (concentration limits, eligible asset classes) as smart contract parameters.

---

## Sources

- [UCITS Directive — Wikipedia](https://en.wikipedia.org/wiki/Undertakings_for_Collective_Investment_in_Transferable_Securities_Directive_2009)
- [FCA Handbook — UCITS Investment Powers](https://handbook.fca.org.uk/handbook/COLL/5/2.html)
- [FinanceStu — Commitment Approach vs. VaR](https://financestu.com/commitment-approach-vs-var/)
- [CFA Institute — Investment Policy Statement](https://rpc.cfainstitute.org/sites/default/files/-/media/documents/article/position-paper/investment-policy-statement-individual-investors.pdf)
- [Worldfavor — SFDR Article 6, 8, 9](https://blog.worldfavor.com/sfdr-what-is-article-6-8-9)
- [ESMA — UCITS Risk Reporting Guidelines](https://www.cssf.lu/wp-content/uploads/GuidelinesUCITSreporting122022.pdf)
- [Morningstar — SFDR Article 8 and 9 Funds](https://www.morningstar.com/business/insights/blog/esg/sfdr-article-8-funds)

## Related Files

- `REGULATORY.md` — Full regulatory framework including UCITS, AIFMD, MiFID II
- `GOVERNANCE_AND_COMPLIANCE.md` — Compliance monitoring, risk management, valuation governance
- `FUND_LIFECYCLE.md` — Investment mandate defined during fund formation
- `FEES_AND_EQUALIZATION.md` — Fee structures interact with mandate (performance fee hurdles tied to benchmarks)
