# Competitors & Fund Administration Software

<!-- ~1500 tokens -->
**Last Updated:** 2026-02-08

---

## Industry Structure

### NAV Frequency by Fund Type

| Fund Type | NAV Frequency | Admin Approach |
|---|---|---|
| UCITS (EU retail) | Daily (regulatory) | Automated, large admin firms |
| US mutual fund (1940 Act) | Daily (regulatory) | Automated, large shops |
| Hedge fund | Monthly/quarterly | Semi-manual, smaller admins |
| Private equity | Quarterly | Very manual, spreadsheet-heavy |
| Small/boutique | Monthly/quarterly | Excel + email + PDF |

### Admin Tiers & Pricing

| Tier | Annual Min | AUM Floor | Typical Setup |
|---|---|---|---|
| Small/boutique | $9K-$18K | Any | 2-5 people, Excel + basic software |
| Mid-size | ~$24K | $20M-$50M | Mid-tier accounting package |
| Large (State Street, BNY, Citco) | $60K+ | $250M+ | Enterprise platforms, automated feeds |

Fee structure: 2-4 basis points of AUM plus monthly minimums. Market size: ~$7.5B (2025), growing at 7.5% CAGR to $12.5B by 2032.

### Why Small Funds Cannot Use Large Admins

- **Cost**: A $20M fund earning $300K gross cannot afford $60K+ admin fees
- **Economics for admins**: Onboarding $20M costs the same as $500M, but 25x less revenue
- **Onboarding**: 3-6 months setup, significant fees
- **Rigidity**: Enterprise systems are configured not customized
- **Service quality**: Low-AUM clients get junior analysts, late NAV, slow error resolution

---

## Major Software Platforms

### SS&C Geneva ("Gold Standard" for Hedge Funds)

- **Users**: 8/10 prime brokers, 17/20 top fund admins
- **Cost**: ~$50K-$200K+/year licensing plus implementation
- **Strength**: Multi-asset, multi-currency, real-time P&L
- **Key module**: Geneva World Investor -- class/investor-level cost allocation
- **Weakness**: Class-specific cost allocation (non-proportional shared costs) is difficult natively; third-party tools like RyanEyes fill the gap
- **Unique**: "Knowledge date" feature -- run reports with data as known on a specific date vs. current
- **Architecture**: 25+ year old platform with layers of acquisitions

### BNY Eagle

- Buy-side / institutional managers, $10B+ AUM
- Investment accounting, data management, regulatory reporting
- $27T+ assets on platform; more a manager's tool than an admin's tool

### InvestOne (FIS/SunGard)

- Mutual fund admins, custodian banks
- $10T+ assets, 42,000+ funds
- Workhorse of traditional mutual fund world, less common in alternatives

### Typical Workflow

```
Manager's desk          Admin's desk           Custodian
+--------------+    +------------------+    +-------------+
| Bloomberg    |    | Geneva           |    | BNY/SST     |
| PORT / AIM   |--->| (portfolio acct) |<---| (custody,   |
|              |    |                  |    |  settlement) |
| or Geneva    |    | Geneva World     |    |             |
| (shadow NAV) |    | Investor         |    |             |
+--------------+    +------------------+    +-------------+
```

---

## Blockchain-Based Competitors (2025-2026)

| Competitor | Scale | Notes |
|---|---|---|
| **Securitize** | $1B+ on-chain | DS Protocol, backed by BlackRock ($47M). Direct competitor. |
| **Tokeny** | $28B+ tokenized | Majority-owned by Apex Group. Enterprise tokenization. |
| **JPMorgan Kinexys** | Institutional | Tokenized collateral and settlement. |
| **BlackRock / Franklin Templeton** | Active | Launched tokenized money market funds. |
| **Broadridge** | Enterprise DLT | Fund settlement via distributed ledger. |

Tokenized AUM grew from $4B (start 2025) to $8.6B (Nov 2025).

---

## Elysium's Competitive Position

**Target market**: Thousands of funds in the $10M-$500M range that are underserved.

**Key advantages**:
1. **Near-zero marginal cost per fund** -- adding a fund is configuration, not headcount
2. **Built-in audit trail** -- every state change is immutable, timestamped, queryable
3. **Daily NAV for any fund size** -- automated posting costs the same regardless of frequency
4. **Class-specific cost allocation is configuration** -- not a 3-month admin setup project

**What we do not replace**: Offchain NAV calculation, regulatory/custodial relationships, manager data input.

**Strategic positioning**: Institutional-quality infrastructure for the underserved mid-market. Not competing with State Street/BNY (they refuse to serve our target). Democratizing access to what previously required $250M+ AUM.
