# Entity Model

<!-- ~800 tokens -->
**Last Updated:** 2026-02-08

---

## Hierarchy

```
Platform (Elysium)
└── Umbrella Fund (grouping, ID starts at 1)
    ├── Cash Fund Tokens (one per currency per umbrella, for settlement)
    └── Fund (the product/customer unit, numbered per umbrella)
        └── Share Class (investor-facing, currency-specific, numbered per fund starting at 2)
            └── Dealing (NAV point in time, numbered per class starting at 1)
```

---

## Entity Details

| Entity | ID Pattern | Business Meaning | Key Fields |
|---|---|---|---|
| **Umbrella Fund** | `[umbrella, 0, 0, 0]` | Grouping container. Maps to Cayman SPC or fund family. | Default: ELYSIUM_UMBRELLA_ID = 1 |
| **Cash Fund Token** | `[umbrella, 0, currencyISO, 0]` | Settlement token per currency per umbrella. | One per currency (USD=840, EUR=978, GBP=826, etc.) |
| **Fund** | `[umbrella, fund, 0, 0]` | Customer unit. Each fund = independent fund manager. Fund isolation is critical. | `manager`, `nav`, `navUpdatedAt`, `reportingCurrency`, `maxCapacity` |
| **Share Class** | `[umbrella, fund, class, 0]` | Investor-facing. Different fee structures, currencies, eligibility. Class 1 = fee class (reserved). User classes start at 2. | `mgmtFeeRate`, `perfFeeCalculator`, `noticePeriod`, `lockPeriod`, `denominationCurrency` |
| **Dealing** | `[umbrella, fund, class, dealing]` | NAV point in time. Represents shares minted at a specific price. Enables series accounting for performance fees. | `dilutionRatio` (per-dealing HWM tracking) |

---

## Token ID Encoding (uint256, lower 64 bits)

```
[Umbrella 16b] [Fund 16b] [Class 16b] [Dealing 16b]
  bits 48-63    bits 32-47  bits 16-31   bits 0-15
```

Key utilities in `TokenIdUtils.sol`:
- `createTokenId(umbrella, fund, class, dealing)` -- construct from parts
- `toDealingTokenId(classTokenId, dealingNum)` -- set dealing bits
- `toFundTokenId(tokenId)` -- zero out class+dealing bits
- `toClassTokenId(tokenId)` -- zero out dealing bits
- `createCashFundTokenId(umbrellaId, currencyISO)` -- cash token for settlement

---

## Critical Semantics

**`nextDealingId`**: Starts at 0. `createDealing()` pre-increments then uses the value. So `nextDealingId` equals the **last created dealing ID**, not the next one. Iterate: `for (d = 1; d <= nextDealingId; d++)`.

**Fund isolation**: Funds in different umbrellas must never share state or tokens. Investor money must never commingle between fund managers.

**Effective lifecycle status**: `max(fundStatus, classStatus)` -- most restrictive wins. ACTIVE < RETIRED < CLOSED.

---

## Shared Storage Struct

`BaseInfo` is used for funds, classes, cash tokens, and dealings:
- `name` (string)
- `totalSupply` (uint128)
- `createdAt` (uint32)
- `dilutionRatio` (uint128)
