# Elysium Product Overview

<!-- ~600 tokens -->
**Last Updated:** 2026-02-08

---

## What We Are

A B2B fund administration platform built on a private blockchain using the Diamond Proxy Pattern (EIP-2535). Elysium provides institutional-quality fund accounting, shareholder registry, and order management as on-chain infrastructure.

## Target Market

Institutional fund managers in the $10M-$500M AUM range who are currently:
- Paying $24K-$60K/year for mediocre, semi-manual administration
- Managing funds in Excel (risky, non-compliant)
- Using small admins who cannot offer daily NAV or multi-currency support

Initial focus: crypto-native funds via Haruko PMS integration. Expand to hybrid/TradFi funds later.

## Value Proposition

- **Tokenized fund shares** via ERC1155 -- shareholder register, transfer agency, and settlement in one system
- **Automated processing** -- NAV posting, fee calculation, order execution, cost allocation all rule-driven
- **Transparent audit trail** -- every state change is immutable, timestamped, and queryable at any historical block
- **Multi-currency settlement** -- class denomination currencies, FX rate management, cross-currency dealing

## Key Differentiators

| Differentiator | Why It Matters |
|---|---|
| **Private blockchain** | Controlled access, no MEV/flash loan risk, GDPR-friendly (no PII on-chain) |
| **Diamond proxy (EIP-2535)** | 16 modular facets, upgradeable logic with immutable storage |
| **Near-zero marginal cost** | Adding a fund is configuration, not headcount; breaks the "cost per fund" model |
| **Daily NAV for any fund size** | Automated posting costs the same regardless of frequency or AUM |
| **Dilution model for costs** | Elegantly handles class-specific costs that SS&C Geneva struggles with |
| **On-chain settlement** | Cash fund tokens per currency per umbrella; atomic order execution |

## MVP Configuration

Irish-licensed fund administration entity (CBI, IIA 1995) servicing Cayman-domiciled funds. This is the industry's most common cross-border arrangement.
