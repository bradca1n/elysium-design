# Transfer Agency & Investor Servicing

<!-- ~9500 tokens -->
**Last Updated:** 2026-02-10

---

## 1. Transfer Agent Role

The transfer agent (TA) is the fund's official record-keeper for investor ownership. In the fund administration ecosystem, the TA sits between investors (or their intermediaries) and the fund itself, performing these core functions:

| Function | Description |
|---|---|
| **Shareholder register** | Maintains the official register of unitholders/shareholders with names, addresses, holdings, and transaction history |
| **Order processing** | Receives, validates, and executes subscription, redemption, switch, and transfer orders |
| **AML/KYC** | Performs investor onboarding due diligence, ongoing monitoring, and suspicious activity reporting |
| **Investor communications** | Distributes statements, contract notes, tax certificates, annual reports, and proxies |
| **Distribution management** | Calculates and pays income/capital gain distributions to investors |
| **Regulatory reporting** | Files beneficial ownership reports, tax withholding (FATCA/CRS), and regulatory returns |

Major TA providers include SS&C (DST), State Street, BNP Paribas Securities Services, CACEIS, and Northern Trust. Many fund administrators offer TA as a bundled service alongside fund accounting and NAV calculation.

**Cross-reference:** See `FUND_LIFECYCLE.md` for fund formation and service provider selection.

---

## 2. Subscription Workflow

```
                         SUBSCRIPTION WORKFLOW
  ================================================================

  INVESTOR                 TRANSFER AGENT              FUND / CUSTODIAN
  --------                 --------------              ----------------

  1. Submit application
     + ID documents  ------>
                           2. AML/KYC Checks
                              - Identity verification
                              - Sanctions screening
                              - PEP screening
                              - Source of funds/wealth
                              |
                              v
                           3. Accept / Reject
                              - Eligibility check
                              - Minimum investment check
                              - Investor classification
                              |
                              v
  4. Transfer funds  -----> 5. Confirm money receipt
     to collection          (match to order)
     account                   |
                              v
                           6. Dealing
                              - Apply to dealing day
                              - Check cut-off time
                              - Aggregate net orders
                              |
                              v
                           7. NAV Calculation  <------ Portfolio valuation
                              - Forward pricing           at valuation point
                              - Apply any swing/
                                dilution adjustment
                              |
                              v
                           8. Settlement
                              - Calculate shares =
                                Amount / NAV per share
                              - Deduct entry fees
                              |
                              v
                           9. Share Issuance
                              - Update register   -----> Instruct custodian
                              - Allocate shares           to receive cash
                              |
                              v
  10. Receive        <----- 11. Confirmation
      contract note          - Contract note sent
      + statement            - Statement updated
```

**Key timing:** Orders received before the cut-off time are processed at the next valuation point. Orders received after cut-off roll to the following dealing day.

---

## 3. Redemption Workflow

```
                         REDEMPTION WORKFLOW
  ================================================================

  INVESTOR                 TRANSFER AGENT              FUND / CUSTODIAN
  --------                 --------------              ----------------

  1. Submit redemption
     request (amount
     or shares)     ------>
                           2. Validation
                              - Sufficient holding?
                              - Lock-up period expired?
                              - Notice period met?
                              - Gate limit check
                              - Minimum holding breach?
                              |
                              v
                           3. Dealing
                              - Apply to dealing day
                              - Check cut-off time
                              - Aggregate net orders
                              |
                              v
                           4. NAV Calculation  <------ Portfolio valuation
                              - Forward pricing           at valuation point
                              - Apply any swing/
                                dilution adjustment
                              |
                              v
                           5. Payment Calculation
                              - Shares x NAV per share
                              - Deduct exit fees
                              - Deduct any tax
                                withholding
                              |
                              v
                           6. Share Cancellation
                              - Update register   -----> Instruct custodian
                              - Cancel shares             to release cash
                              |
                              v
                           7. Payment             -----> Transfer funds
                              - Wire to investor          from fund account
                              bank account
                              |
                              v
  8. Receive         <----- 9. Confirmation
     funds + contract        - Contract note sent
     note                    - Statement updated
```

**Redemption constraints:**

| Constraint | Description |
|---|---|
| **Lock-up** | Initial period (often 1-2 years for hedge funds) during which no redemptions are permitted |
| **Notice period** | Advance notice required (30-90 days typical for AIFs) before a dealing day |
| **Gate** | Maximum percentage of NAV that can be redeemed on any single dealing day (typically 10-25%) |
| **Side pocket** | Illiquid assets segregated from the main portfolio; redeemed only when liquidated |

---

## 4. Dealing Cycles

| Term | Definition |
|---|---|
| **Dealing day** | The day on which subscriptions and redemptions are accepted (daily for UCITS, weekly/monthly/quarterly for AIFs) |
| **Cut-off time** | Deadline for order receipt on a dealing day (e.g., 12:00 CET for Luxembourg funds, 4:00 PM ET for US mutual funds) |
| **Valuation point** | The time at which portfolio assets are priced to calculate NAV (usually market close on the dealing day) |
| **Settlement period** | Time between dealing day and actual cash/share movement: T+1 (US mutual funds), T+2 to T+3 (European UCITS), T+3 to T+5 (AIFs and less liquid strategies) |
| **Forward pricing** | NAV is calculated AFTER orders are placed, using the next available valuation point. This prevents speculation against the fund. Required for UCITS and US mutual funds. |
| **Historic pricing** | NAV is already known at the time of ordering. Rare; used in some insurance-linked products and older UK unit trusts. |

**Settlement cycle mismatch:** When a fund has T+1 settlement for investor dealings but the underlying securities settle on T+2, the fund must either maintain a cash buffer, use overdraft facilities, or accept settlement risk. This is a key operational challenge.

**Cross-reference:** See `FUND_ACCOUNTING.md` for NAV calculation methodology. See `RECONCILIATION_AND_OPS.md` for settlement reconciliation.

---

## 5. Anti-Dilution Mechanisms

When investors subscribe or redeem, the fund must buy or sell underlying assets. The transaction costs (spreads, commissions, taxes, market impact) would dilute existing investors if borne by the fund. Anti-dilution mechanisms pass these costs to the transacting investors.

### 5.1 Swing Pricing

The NAV is adjusted ("swung") by a swing factor in the direction of net dealing activity:

- **Net inflows** (subscriptions > redemptions): NAV is swung **upward** so incoming investors pay more
- **Net outflows** (redemptions > subscriptions): NAV is swung **downward** so exiting investors receive less

**Full swing:** Applied on every dealing day regardless of flow size. Every transaction triggers an adjustment.

**Partial swing:** Applied only when net flows exceed a **swing threshold** (e.g., 2-5% of fund NAV). Below threshold, the unadjusted NAV is used.

**Swing factor:** Expressed in basis points (bps). Determined by the fund's estimated transaction costs:
- Explicit costs: broker commissions, stamp duty, settlement fees
- Implicit costs: bid-ask spread, market impact

**Worked Example (Partial Swing):**

```
Fund NAV:           $100,000,000
NAV per share:      $100.00
Swing threshold:    5% of NAV ($5,000,000)
Swing factor:       50 bps (0.50%)

Scenario A: Net inflow of $8,000,000 (above threshold)
  Swung NAV = $100.00 x (1 + 0.0050) = $100.50
  All trades priced at $100.50

Scenario B: Net outflow of $3,000,000 (below threshold)
  No swing applied
  All trades priced at $100.00

Scenario C: Net outflow of $12,000,000 (above threshold)
  Swung NAV = $100.00 x (1 - 0.0050) = $99.50
  All trades priced at $99.50
```

### 5.2 Dilution Levy

A separate charge (not built into the NAV) applied to subscribing or redeeming investors when flows exceed a threshold. The levy is paid into the fund to compensate for transaction costs. Unlike swing pricing, the dilution levy is visible as a distinct line item on the contract note.

### 5.3 Dilution Adjustment

Similar to swing pricing but applied at the individual order level rather than the overall NAV. Each order is adjusted based on its proportional impact on the fund's transaction costs.

**Regulatory note:** ESMA and IOSCO now recommend that all open-ended funds have at least one anti-dilution tool available. Luxembourg CSSF requires swing pricing governance to be documented in the prospectus.

---

## 6. Investor Types & Classifications

| Category | Jurisdiction | Definition / Threshold |
|---|---|---|
| **Retail investor** | EU (MiFID II) | Any natural person not meeting professional criteria. Highest level of regulatory protection. |
| **Professional investor (per se)** | EU (MiFID II) | Credit institutions, investment firms, insurance companies, pension funds, governments, central banks, large corporates meeting 2-of-3: balance sheet >=EUR 20M, net revenue >=EUR 40M, own funds >=EUR 2M |
| **Elective professional** | EU (MiFID II) | Retail investor who opts in; must meet 2-of-3: 10+ transactions/quarter over 4 quarters, portfolio >EUR 500K, 1+ year financial sector experience |
| **Well-informed investor** | Luxembourg (SIF Law) | Institutional, professional, or any investor who: (a) invests >=EUR 100,000, OR (b) holds a credit institution assessment confirming expertise. Required for SIF and RAIF vehicles. |
| **Accredited investor** | US (SEC Reg D) | Natural person: net worth >$1M (excl. primary residence) OR income >$200K ($300K joint) for prior 2 years. Entity: >$5M in assets. Also includes registered brokers, banks, insurance companies. |
| **Qualified purchaser** | US (ICA Section 3(c)(7)) | Natural person: >=\$5M in investments. Family company: >=\$5M. Trust: >=\$25M. Entity: >=\$25M. Allows funds to have unlimited investors (vs. 100 for 3(c)(1) funds). |
| **Qualified institutional buyer (QIB)** | US (Rule 144A) | Entity owning/investing >=\$100M in securities (>=\$10M for broker-dealers). |

**Cross-reference:** See `REGULATORY.md` for jurisdiction-specific distribution rules and passporting requirements.

---

## 7. AML/KYC Due Diligence Framework

### 7.1 Three Tiers of Due Diligence

| Level | Trigger | Requirements |
|---|---|---|
| **SDD** (Simplified) | Low-risk: listed companies on major exchanges, regulated FIs in FATF-compliant jurisdictions, government agencies, pension funds | Reduced documentation. Streamlined onboarding. Sanctions screening still mandatory. |
| **CDD** (Standard) | Default for all investors not qualifying for SDD or EDD | Full identity verification, beneficial ownership identification (>25% control in EU, >10% proposed by some regulators), risk profiling, sanctions/PEP screening |
| **EDD** (Enhanced) | High-risk: PEPs, complex structures, high-risk jurisdictions (FATF grey/black list), correspondent banking, unusual transaction patterns | Source of funds/wealth analysis, senior management approval, adverse media screening, enhanced ongoing monitoring, more frequent review cycles |

### 7.2 Beneficial Ownership

The TA must identify all natural persons who ultimately own or control >25% of the investing entity (EU 4AMLD/5AMLD threshold). This requires "looking through" corporate chains, trusts, and nominee structures. Some jurisdictions are moving toward a 10% threshold (proposed under 6AMLD).

### 7.3 Screening & Monitoring

- **Sanctions screening:** All investors screened against OFAC SDN, EU Consolidated List, UN Sanctions, UK HMT at onboarding and on every list update
- **PEP screening:** Political exposure identified at onboarding; ongoing monitoring for changes in status
- **Adverse media:** Automated screening for negative news linked to financial crime
- **Transaction monitoring:** Unusual patterns (frequent switches, round-tripping, layering) flagged for investigation
- **Suspicious activity reporting (SAR):** Filed with local FIU (FinCEN in US, FIU-NL in Netherlands, CRF Luxembourg) when suspicion threshold is met. Tipping off the investor is a criminal offense.
- **Periodic review:** High-risk investors reviewed annually, medium-risk every 3 years, low-risk every 5 years

---

## 8. Register Maintenance

### 8.1 Registration Forms

| Form | Description |
|---|---|
| **Certificated** | Physical share certificates issued to investor. Rare for funds (more common in equities). Transfer requires certificate surrender and re-issuance. |
| **Uncertificated (book-entry)** | Shares exist only as electronic entries on the register. Standard for most investment funds. Transfer is a register update. |
| **Dematerialized** | Fully electronic via CSD (e.g., Clearstream, Euroclear). Shares held in nominee name of the CSD participant. |

### 8.2 Ownership Models

| Model | Description | AML Responsibility |
|---|---|---|
| **Registered owner** | Investor appears directly on the TA register by name. Full KYC performed by TA. | TA |
| **Nominee** | An intermediary (bank, platform, custodian) holds shares on behalf of the beneficial owner. Nominee name appears on register. | Nominee performs KYC on end-investor; TA relies on nominee attestation |
| **Omnibus account** | A single account at the TA level holding aggregated positions for multiple underlying investors. The intermediary maintains sub-records. | Intermediary. TA performs due diligence on the omnibus operator. Netting of orders occurs at intermediary level before submission. |

**Regulatory tension:** Regulators prefer transparency (registered owner model) for AML purposes, but market efficiency drives the omnibus/nominee model. UCITS V and AIFMD require depositaries to perform look-through on omnibus accounts.

---

## 9. Distribution Channels

```
                     FUND DISTRIBUTION ARCHITECTURE

  FUND MANAGER
       |
       v
  TRANSFER AGENT  <------- Direct investors (application forms, portal)
       |
       +------- Platforms (B2B) --------+
       |    - Allfunds (~$1.5T AuA)    |
       |    - Clearstream Vestima       |  Order routing,
       |    - Euroclear FundsPlace      |  settlement,
       |    - NSCC/Fund/SERV (US)       |  rebate management
       |    - Calastone                 |
       +--------------------------------+
       |
       +------- Fund Supermarkets (B2C) --+
       |    - Hargreaves Lansdown        |  Retail investor
       |    - Fidelity FundsNetwork      |  access, nominee
       |    - Schwab                     |  holding
       +----------------------------------+
       |
       +------- IFAs / Wealth Managers ---+
       |    - Via platforms or direct     |  Advisory,
       |    - Trailer fee / retrocession |  discretionary
       +----------------------------------+
       |
       +------- Institutional Mandates ---+
            - Segregated accounts         |  Bespoke terms,
            - Side letters                |  direct register
            +-----------------------------+
```

**Platform mechanics:** Platforms aggregate orders from multiple distributors, net them, and send a single consolidated order to the TA. Settlement occurs between the platform and the TA, with the platform managing settlement with its own participants. This reduces operational burden on the TA but creates omnibus account structures.

---

## 10. Messaging Standards

### 10.1 SWIFT MT (ISO 15022) -- Legacy

| Message | Purpose |
|---|---|
| **MT502** | Order to buy or sell fund shares (subscription/redemption) |
| **MT509** | Trade status message (order confirmation/rejection status) |
| **MT515** | Client confirmation of execution |

### 10.2 ISO 20022 (MX) -- Current Standard

SWIFT's Funds Migration Programme is moving funds messaging from MT to MX format. The `setr` (Securities Trade) business area covers fund orders:

| MX Message | Purpose | Replaces |
|---|---|---|
| **setr.010** | Subscription Order | MT502 |
| **setr.012** | Subscription Order Confirmation | MT515 |
| **setr.011** | Subscription Order Cancellation | MT502 |
| **setr.004** | Redemption Order | MT502 |
| **setr.006** | Redemption Order Confirmation | MT515 |
| **setr.005** | Redemption Order Cancellation | MT502 |
| **setr.013** | Switch Order | MT502 |
| **setr.015** | Switch Order Confirmation | MT515 |
| **setr.001** | Redemption Bulk Order | MT502 |
| **setr.007** | Subscription Bulk Order | MT502 |
| **setr.016** | Order Instruction Status Report | MT509 |
| **setr.017** | Order Cancellation Status Report | MT509 |

### 10.3 Other Protocols

- **FIX Protocol:** Used by some institutional investors and execution platforms for real-time order routing
- **Calastone:** Proprietary blockchain-based messaging network connecting distributors and TAs, replacing fax/email/SWIFT for fund orders
- **EMX (Euroclear Message Exchange):** Proprietary format for Euroclear FundsPlace participants
- **Fundsettle:** Euroclear's settlement platform for cross-border fund transactions

---

## 11. In-Specie Transfers

An in-specie transfer moves assets (securities, not cash) between parties for subscriptions or redemptions.

### 11.1 In-Specie Subscription

Instead of sending cash, an investor transfers a portfolio of securities to the fund. Common for:
- ETF authorized participants (creation/redemption baskets)
- Large institutional subscriptions to avoid market impact
- Fund restructurings (merging funds)

**Process:**
1. Investor proposes asset list for subscription
2. Fund manager reviews portfolio for investment policy compliance
3. Independent valuation of assets on dealing day
4. Assets transferred from investor's custodian to fund's custodian (DvP where possible)
5. Shares issued based on agreed valuation
6. Register updated, confirmation sent

### 11.2 In-Specie Redemption

The fund transfers securities to the redeeming investor instead of selling them and paying cash. Common for:
- Large redemptions that would cause market impact
- Tax-efficient distributions (no capital gains event for the fund)
- Fund liquidations (distributing remaining assets)

**Requirements:**
- Must be permitted by the fund's prospectus
- Assets must be valued by an independent party
- Fair treatment: in-specie redemption must not disadvantage remaining investors
- Investor must have custody capability to receive the assets

**Cross-reference:** See `RECONCILIATION_AND_OPS.md` for DvP settlement and custody reconciliation.

---

## 12. Elysium Platform Implications

For Elysium's tokenized fund share model, the transfer agent function is partially replaced by on-chain mechanics:

| Traditional TA Function | Elysium On-Chain Equivalent |
|---|---|
| Shareholder register | Token holder mapping in smart contract (ERC-20 balanceOf) |
| Share issuance | Token minting on subscription settlement |
| Share cancellation | Token burning on redemption settlement |
| Transfer restrictions | Transfer hooks enforcing lock-up, eligibility, and sanctions checks |
| Omnibus netting | Not needed -- each investor has a distinct on-chain address |
| Contract notes | On-chain events (Transfer, Mint, Burn) with off-chain enrichment |

Functions that remain off-chain: AML/KYC onboarding, regulatory reporting, investor communications, tax withholding, NAV calculation trigger. The TA role does not disappear; it shifts from record-keeping to compliance and servicing.

---

## 13. Forced/Compulsory Redemption

A compulsory redemption is initiated by the fund (not the investor) to forcibly redeem all or part of an investor's holding.

### 13.1 Triggers

| Trigger | Description |
|---|---|
| **AML/KYC failure** | Investor fails to provide requested CDD/EDD documentation within specified timeframe, or ongoing monitoring reveals adverse findings |
| **Sanctions designation** | Investor (or beneficial owner) added to OFAC, EU, UN, or UK sanctions list |
| **Eligibility lapse** | Investor no longer meets qualification criteria -- e.g., accreditation lapse, loss of professional investor status, regulatory change in home jurisdiction |
| **Minimum holding breach** | Redemption or market movement causes holding to fall below the fund's stated minimum (typically defined in prospectus) |
| **Tax status change** | Loss of treaty eligibility, FATCA/CRS non-compliance, or change rendering the investor's continued participation adverse to the fund or other investors |

### 13.2 Process

1. **Board/ManCo resolution** authorizing the compulsory redemption (documented in board minutes)
2. **Investor notification** with minimum notice period (typically 30 days; prospectus governs)
3. **Suspension of voting rights** pending execution of the redemption
4. **Pricing** at the NAV on the next dealing day following the notice period expiry
5. **Settlement** per normal redemption cycle; proceeds remitted to investor's bank on record

### 13.3 Special Handling

- **Partial forced redemption:** Where only part of the holding is non-compliant (e.g., excess above a regulatory threshold), redeem only the ineligible portion and retain the rest
- **In-kind settlement:** Available if permitted by prospectus; may be used where cash settlement is impractical or restricted
- **Escrow for disputed amounts:** Where an investor contests the compulsory redemption, proceeds are held in escrow pending resolution
- **Regulatory notification:** CBI (Ireland) and CIMA (Cayman) require notification of compulsory redemptions linked to AML/sanctions; SAR filing may also be required

**Legal basis:** The prospectus compulsory redemption clause is the primary authority. Additional obligations arise from AML/CFT legislation (Criminal Justice (Money Laundering and Terrorist Financing) Act 2010 in Ireland) and CBI conditions of authorization for UCITS and QIAIFs.

**Cross-reference:** See `INVESTOR_ONBOARDING_AND_SERVICING.md` for AML triggers and ongoing monitoring requirements.

---

## 14. Switch Transactions

A switch is a combined redemption from one fund/class and subscription into another, executed as a linked pair.

### 14.1 Switch Types

| Type | Mechanics | Cash Movement | Contract Notes |
|---|---|---|---|
| **Between sub-funds** (same umbrella) | Simultaneous redemption and subscription; single dealing day pricing; switch fee may apply | Yes -- proceeds flow between sub-funds | Two (one per leg) or combined switch note |
| **Between share classes** (same sub-fund) | NAV-to-NAV conversion using exchange ratio; no actual redemption/subscription | None -- register update only | Single conversion note |
| **Between different funds** (different legal entities) | Treated as independent redemption + subscription; settlement timing may differ | Yes -- separate settlement cycles | Two separate contract notes |

### 14.2 Exchange Ratio (Class-to-Class Switch)

```
Exchange Ratio = NAV per share (source class) / NAV per share (target class)
New shares = Old shares x Exchange Ratio

Example:
  1,000 shares of Class A at NAV $150.00 → Class B at NAV $120.00
  Exchange Ratio = 150 / 120 = 1.25
  New holding = 1,000 x 1.25 = 1,250 shares of Class B
```

### 14.3 Pricing & Tax

- **Same cut-off time and dealing day** for both legs to avoid pricing mismatch
- **FX conversion** applied at the fund's prevailing rate for cross-currency switches
- **Tax treatment:** Treated as a disposal in most jurisdictions (capital gains event). Exception: switching between share classes within the same Irish sub-fund is generally not a taxable event under Irish CGT rules (TCA 1997, s.739B)

**Cross-reference:** See `TAX.md` for detailed treatment of switch-related tax events across jurisdictions.

---

## 15. Transfer/Re-Registration Transactions

A transfer changes the registered owner of existing shares without creating or cancelling units.

### 15.1 Transfer Types

| Type | Key Requirements |
|---|---|
| **Investor-to-investor** | Bilateral transfer agreement, completed transfer form signed by both parties, full AML/KYC on the receiving party |
| **Broker-to-broker (nominee)** | Platform re-registration form, CREST settlement where applicable (UK/Irish listed funds), receiving nominee must be on the TA's approved list |
| **Inheritance/succession** | Certified death certificate, grant of probate or letters of administration, beneficiary AML/KYC, executor authority documentation |

### 15.2 Process & Pricing

- **No NAV impact:** Transfers do not create or cancel shares; the fund's assets are unaffected
- **Transfer pricing:** Typically at NAV on the transfer date for stamp duty/tax purposes, or at a price agreed between the parties (private negotiation)
- **Stamp duty:** Generally none for fund units/shares in Ireland and Luxembourg. UK SDRT may apply to certain OEICs at 0.5%. Varies by jurisdiction.

### 15.3 Transfer Restrictions

- **Lock-up periods:** Transfers may be prohibited during lock-up (prospectus-dependent; some funds permit transfers but not redemptions during lock-up)
- **Board consent:** Some prospectuses require ManCo/board approval for transfers, particularly for private funds
- **Minimum holding:** Both transferor (post-transfer) and transferee must meet minimum holding requirements

**Cross-reference:** See `INVESTOR_ONBOARDING_AND_SERVICING.md` for AML/KYC requirements on the receiving party.

---

## 16. Dormant Account Management

### 16.1 Definition & Identification

A dormant account is one with no investor-initiated activity (transaction, correspondence, or communication) for a defined period. Thresholds vary:

| Jurisdiction | Dormancy Period | Governing Framework |
|---|---|---|
| **US** | 3-5 years (varies by state) | Uniform Unclaimed Property Act (UUPA); individual state statutes |
| **UK** | 12-15 years for investments | Dormant Assets Act 2022 (expanded scope from banking to investment/wealth management sector) |
| **Ireland** | No specific statutory period for funds | Common law principles; CBI guidance on client asset management |
| **Luxembourg** | No specific fund-level statute | CSSF circular guidance; general civil code provisions |

### 16.2 Procedures

1. **Annual register sweep:** Identify accounts meeting dormancy criteria
2. **Outreach:** Written notice to last known address, email/phone contact attempts, skip-tracing for lost investors
3. **Classification:** Mark as dormant on register; restrict automated distributions if address is unverified
4. **Fee treatment:** Some funds charge dormant account maintenance fees (must be disclosed in prospectus)
5. **Escheatment:** In US jurisdictions, unclaimed assets must be reported and remitted to the relevant state after the dormancy period. The UK Dormant Assets Scheme (fluctuating value assets element opening 2026) will apply to investment funds. Ireland has no specific escheatment statute for funds.

### 16.3 Data Protection Tensions

- **GDPR retention limits** generally require deletion of personal data when no longer necessary for processing
- **AML record-keeping** requires retention of transaction records for 5 years post-relationship (6AMLD)
- **Resolution:** AML obligation overrides GDPR for the statutory retention period; data minimization applies thereafter

**Cross-reference:** See `INVESTOR_ONBOARDING_AND_SERVICING.md` for dormancy identification and investor outreach procedures.

---

## 17. Unclaimed Distributions

### 17.1 Definition

An unclaimed distribution arises when dividend cheques are returned undelivered, bank transfers fail (closed account, incorrect details), or the investor cannot be contacted to arrange payment.

### 17.2 Handling Process

| Step | Action |
|---|---|
| **1. Suspense** | Credit distribution amount to a suspense/unclaimed distributions account on the fund's books |
| **2. Outreach** | Attempt investor contact via all available channels (registered address, email, phone, nominee/intermediary) |
| **3. Reinvestment** | If permitted by prospectus, reinvest unclaimed cash distributions into additional shares after a defined waiting period |
| **4. Escheatment** | After the statutory dormancy period, report and remit to the relevant authority (US state unclaimed property division; UK Reclaim Fund under Dormant Assets Act) |
| **5. Write-off** | Where escheatment applies, remove liability from fund books and record remittance |

### 17.3 Key Considerations

- **Accounting treatment:** Remains as a liability on fund books until claimed by the investor or escheated to the relevant authority
- **Interest:** Unclaimed distributions do not typically accrue interest for the investor (fund prospectus governs)
- **Reclaim rights:** Investors retain the right to reclaim escheated amounts from the relevant state/authority (not from the fund) indefinitely in most jurisdictions
- **Tax withholding:** Withholding tax obligations (e.g., Irish dividend withholding tax at 25%) apply at the time of distribution regardless of whether the distribution is claimed

**Cross-reference:** See `DISTRIBUTIONS_AND_INCOME.md` for distribution calculation methodology and payment mechanics.

---

## Sources

- [FDIC Registered Transfer Agent Examination Manual](https://www.fdic.gov/bank-examinations/section-11-fdic-registered-transfer-agent-examination-manual)
- [Vistra: Transfer Agents as Partners for Private Funds](https://www.vistra.com/insights/transfer-agents-valuable-partner-private-funds)
- [The Investment Association: T+1 Settlement Overview](https://www.theia.org/sites/default/files/2024-11/IA%20T+1%20Settlement%20Overview.pdf)
- [The Investment Association: Fund Settlement Cycle](https://www.theia.org/sites/default/files/2023-09/IA%20T+1%20-%20Fund%20Settlement%20Cycle.pdf)
- [BBH: T+1 FAQ](https://www.bbh.com/us/en/insights/investor-services-insights/t-1-faq.html)
- [IOSCO: Anti-dilution Liquidity Management Tools](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD756.pdf)
- [AFG: Swing Pricing and Variable ADL Guide](https://www.afg.asso.fr/app/uploads/2020/12/guidepro-swingpricing-eng-201207web-1.pdf)
- [BlackRock: Swing Pricing - Raising the Bar](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf)
- [Vanguard: A Guide to Swing Pricing](https://www.vanguard.co.uk/content/dam/intl/europe/documents/en/swing-pricing-guide.pdf)
- [ALFI: Swing Pricing Guidelines 2022](https://www.alfi.lu/getattachment/3154f4f7-f150-4594-a9e3-fd7baaa31361/app_data-import-alfi-alfi-swing-pricing-brochure-2022.pdf)
- [Sanctions.io: CDD, SDD, and KYC Explained](https://www.sanctions.io/blog/cdd-sdd-and-kyc-explained)
- [Carta: AML and KYC for Fund Operations](https://carta.com/learn/private-funds/regulations/aml-kyc/)
- [Wikipedia: Accredited Investor](https://en.wikipedia.org/wiki/Accredited_investor)
- [ALFI: SIF (Specialised Investment Funds)](https://www.alfi.lu/en-gb/pages/setting-up-in-luxembourg/alternative-investment-funds-legal-vehicles/sif-(specialised-investment-funds))
- [BNP Paribas: Fund Distribution - Reducing Complexity](https://securities.cib.bnpparibas/qa-cross-border-distribution/)
- [Euroclear FundsPlace](https://www.euroclear.com/services/en/funds.html)
- [State Street: Investor Servicing](https://www.statestreet.com/us/en/solutions/investor-servicing)
- [Trace Financial: SWIFT Funds Migration to MX](https://www.tracefinancial.com/initiatives/swift-funds-migration-to-mx/)
- [SWIFT: ISO 20022 Standards](https://www.swift.com/standards/iso-20022/iso-20022-standards)
- [Finance Strategists: In Specie](https://www.financestrategists.com/wealth-management/investment-management/in-specie/)
- [SEC: Risks Associated with Omnibus Accounts](https://www.sec.gov/tm/risks-omnibus-accounts-transacting-low-priced-securities)
- [IOSCO: Regulation of Nominee Accounts](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD362.pdf)
- [Mondaq: Luxembourg Investment Funds](https://www.mondaq.com/fund-management-reits/1035696/everything-you-need-to-know-on-luxembourg-investment-funds)
- [UK Dormant Assets Act 2022](https://www.legislation.gov.uk/ukpga/2022/5/data.xht?view=snippet&wrap=true)
- [The Investment Association: Dormant Assets Scheme](https://www.theia.org/initiatives/dormant-assets)
- [GOV.UK: Dormant Assets Scheme Strategy](https://www.gov.uk/government/publications/dormant-assets-scheme-strategy/dormant-assets-scheme-strategy)
- [FCA: Expansion of the Dormant Assets Scheme (PS24/10)](https://www.fca.org.uk/publication/policy/ps24-10.pdf)
- [CBI: Reporting Requirements for Funds](https://www.centralbank.ie/regulation/industry-market-sectors/funds/reporting-requirements)
