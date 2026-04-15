# Avalanche Subnet Full Deployment Plan

**Date:** 2026-03-03
**Target:** Elysium Avalanche Subnet (Chain ID: 2201)
**Type:** Fresh deployment (new diamond, old one orphaned)

## Pre-Flight Checklist

### Verified Automatically
- [x] RPC endpoint responsive (chain ID 2201)
- [x] All 21 facets compile, zero errors
- [x] All facets under EIP-170 limit (24,576 bytes) — largest is `FeeManagementFacet` at 21,446B
- [x] Gemforge build complete — `IDiamondProxy` has 281 functions, 189 errors, 90 events
- [x] `gemforge.deployments.json` cleared to `{}` for fresh deploy
- [x] Deprecated scripts deleted (`ComprehensivePostDeploy.s.sol`, `PostDeploySetup.s.sol`)
- [x] testnet.json updated — `perfFeeCalculator` (address) replaced with `perfFee` (selector-based config)
- [x] DiamondSetup.s.sol updated — reads `perfFee` config, maps `"standard"` → selector `0xbd5b958a`

### Wallet Balances (Anvil defaults, prefunded on Elysium subnet)
| Role | Address | Balance |
|------|---------|---------|
| Deployer (#0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | ~999,985 tokens |
| Manager (#1)  | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | ~999,994 tokens |
| Admin (#2)    | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | ~999,987 tokens |
| Investor (#3) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | ~400,000 tokens |
| NAV Upd (#5)  | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | ~1,000,030 tokens |

### Facets Being Deployed (21 custom + 3 core)

**Core (Diamond standard):**
DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet

**Custom (21 facets):**
| # | Facet | Size | Function |
|---|-------|------|----------|
| 1 | AccountFacet | 22,338B | Account CRUD, permissions, proposals |
| 2 | AdminViewCallsFacet | 13,912B | Admin-only view functions |
| 3 | BlockFacet | 2,781B | Emergency pause (protocol + fund level) |
| 4 | ClassAdjustmentFacet | 9,377B | Share class splits/merges/adjustments |
| 5 | EligibilityFacet | 12,966B | KYC/accreditation eligibility rules |
| 6 | FeeManagementFacet | 21,446B | Management & performance fee operations |
| 7 | FundLifecycleFacet | 12,615B | Fund activation, retirement, status |
| 8 | FundManagementFacet | 16,258B | Fund CRUD, class creation, dealing |
| 9 | FundManagementValidationFacet | 3,184B | Input validation for fund operations |
| 10 | FundTokensFacet | 18,125B | ERC-1155 token operations |
| 11 | FXManagementFacet | 6,320B | FX rate management, currency ops |
| 12 | ManagerViewCallsFacet | 7,163B | Manager-only view functions |
| 13 | NavManagementFacet | 10,824B | NAV updates, price chain |
| 14 | OrderManagementFacet | 8,917B | Order submission, cancellation |
| 15 | OrderProcessingFacet | 19,085B | Order execution, dealing processing |
| 16 | OrderValidationFacet | 6,470B | Order validation rules |
| 17 | PerfFeeStandardFacet | 3,666B | HWM performance fee calculator |
| 18 | SettlementFacet | 6,309B | Cash settlement operations |
| 19 | UmbrellaManagementFacet | 11,108B | Umbrella CRUD, onramp/offramp |
| 20 | ViewCalls2Facet | 17,132B | Public view functions (batch 2) |
| 21 | ViewCallsFacet | 20,310B | Public view functions (batch 1) |

---

## Step 1: Deploy Diamond via Gemforge

```bash
cd contracts

# Set deployer private key (Anvil account #0)
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy — deploys DiamondProxy + all 21 facets + InitDiamond.init()
yarn dlx gemforge deploy avalanche_testnet
```

**What happens:**
1. Gemforge deploys `DiamondProxy` with deployer as owner
2. Deploys all 21 custom facets as standalone contracts
3. Performs diamond cut to register all function selectors
4. Calls `InitDiamond.init()` via delegatecall which:
   - Registers 5 currencies (USD, EUR, GBP, CHF, JPY)
   - Creates default "Elysium" umbrella (ID=1) with USD activated
   - Initializes FundTokens storage (owner = deployer)
5. Writes addresses to `gemforge.deployments.json`

**Verify:**
```bash
# Check deployments file has all contracts
cat gemforge.deployments.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
contracts=d.get('avalanche_testnet',{}).get('contracts',[])
print(f'Contracts deployed: {len(contracts)}')
for c in contracts:
    print(f'  {c[\"name\"]}: {c[\"onChain\"][\"address\"]}')
"
```

Expected: 25 contracts (DiamondProxy + 3 core + 21 custom)
Plus `InitDiamond` contract = 26 total entries.

---

## Step 2: Verify Diamond Is Alive

```bash
# Set RPC for cast commands
export RPC_URL='https://testnet-apparentco-z3e61.avax-test.network/ext/bc/2KxfLfaNiGJgoD4zpG2VGLzxsMGnzMiMJFsEDHRxdKHPUZ7v4/rpc?token=21141fbf67b8d3edfd1f9c090518857e36e6587da98feb46ecd97b5ea9c4b250'

# Get diamond address from deployments
export DIAMOND=$(node -e "const d=require('./gemforge.deployments.json'); const c=d.avalanche_testnet.contracts.find(x=>x.name==='DiamondProxy'); console.log(c.onChain.address)")
echo "Diamond: $DIAMOND"

# Check owner (should be deployer)
cast call $DIAMOND "owner()(address)" --rpc-url $RPC_URL

# Check facets count via DiamondLoupe
cast call $DIAMOND "facets()((address,bytes4[])[])" --rpc-url $RPC_URL 2>&1 | head -5

# Check nextUmbrellaId (should be 2 — umbrella 1 created by InitDiamond)
cast call $DIAMOND "nextUmbrellaId()(uint16)" --rpc-url $RPC_URL
```

---

## Step 3: Run DiamondSetup (Post-Deploy Configuration)

```bash
# Still in contracts/ directory
forge script script/DiamondSetup.s.sol \
  --rpc-url $RPC_URL \
  --broadcast -vv \
  --gas-estimate-multiplier 200 \
  --skip-simulation \
  --slow \
  --sig "run(string)" -- "script/setup-configs/testnet.json"
```

**Why these flags:**
- `--skip-simulation`: AccountFacet uses `block.number` in address generation — simulation block numbers differ from broadcast, causing address mismatches
- `--slow`: Sends one tx at a time, ensuring block numbers increment predictably
- `--gas-estimate-multiplier 200`: 2x gas buffer for complex transactions

**What the 8 phases do:**

| Phase | Action | Tx From |
|-------|--------|---------|
| 1 | Set admin wallet + NAV updater wallet | Deployer |
| 2 | Create accounts for admin, NAV updater, manager, investor | Deployer |
| 3 | Promote admin account, set NAV updater account | Deployer |
| 4 | Create "Main Umbrella" (ID=2), create Fund 1 + Fund 2 | Admin |
| 5 | Set manager permissions on both funds | Admin |
| 6 | Set investor attributes (KYC/accredited/QP), onramp 1M USD tokens | Admin |
| 7 | Create classes with perf fee config + eligibility + crystallisation | Manager |
| 8 | Verification — checks all state is correct | (view calls) |

**Phase 7 class creation details:**

| Fund | Class | MgmtFee | PerfFee | Notice | Lock | Crystallisation | Eligibility |
|------|-------|---------|---------|--------|------|-----------------|-------------|
| Fund 1 | Class A | 100 bps | None | 0 | 0 | - | - |
| Fund 1 | Class B | 200 bps | Standard 20% HWM | 1 day | 7 days | 1 year | KYC required |
| Fund 1 | Class C | 150 bps | None | 0 | 0 | - | Accredited required |
| Fund 2 | Class A | 100 bps | None | 0 | 0 | - | - |

**Performance fee config mapping:**
- `perfFee.type: "standard"` → selector `0xbd5b958a` (`calcStandardPerfFee(uint256,uint256[])`)
- `perfFee.feeRateBps` / `hurdleFundId` / `fixedHurdleRateBps` / `maxFeeBps` → ABI-encoded as `perfFeeParams`
- No `perfFee` field → `bytes4(0)` + empty bytes (no performance fee)

**Note on umbrella:** InitDiamond creates "Elysium" umbrella at ID=1. The testnet.json config creates "Main Umbrella" at ID=2. Funds are created under umbrella 2. Umbrella 1 remains empty but exists with USD activated.

---

## Step 4: Verify Full Setup

```bash
# Verify accounts
cast call $DIAMOND "isAdmin(address)(bool)" "0x90F79bf6EB2c4f870365E785982E1f101E93b906" --rpc-url $RPC_URL
# Expected: true

cast call $DIAMOND "isNavUpdater(address)(bool)" "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" --rpc-url $RPC_URL
# Expected: true

# Verify umbrella 2 exists
cast call $DIAMOND "nextUmbrellaId()(uint16)" --rpc-url $RPC_URL
# Expected: 3 (means umbrellas 1 and 2 exist)

# Verify funds in umbrella 2
cast call $DIAMOND "getUmbrellaFundMembers(uint16)(uint16[])" 2 --rpc-url $RPC_URL
# Expected: [1, 2] (two funds)

# Verify Class B has performance fee configured
# Get Fund 1 class IDs, then check class info
# Fund 1 ID: TokenIdUtils.createTokenId(2, 1, 0, 0) = (2 << 48) | (1 << 32) = 562949957615616
# Class B = class index 2: TokenIdUtils.createClassTokenId(fundId, 2) = fundId | (2 << 16) = 562949957746688
FUND1_ID=$(python3 -c "print((2 << 48) | (1 << 32))")
CLASS_B_ID=$(python3 -c "print((2 << 48) | (1 << 32) | (2 << 16))")
echo "Fund 1 ID: $FUND1_ID"
echo "Class B ID: $CLASS_B_ID"

# Check Class B has perfFeeSelector set
cast call $DIAMOND "classes(uint256)(uint160,uint32,uint16,bytes4,uint32,uint32,uint16)" $CLASS_B_ID --rpc-url $RPC_URL
# Expected: perfFeeSelector (4th return) = 0xbd5b958a

# Verify investor has tokens (cash token for umbrella 2, USD)
CASH_TOKEN=$(python3 -c "print((2 << 48) | (840 << 16))")
echo "Cash token ID: $CASH_TOKEN"

# Get investor account address first
cast call $DIAMOND "getAccounts(address)(address[])" "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" --rpc-url $RPC_URL
# Then check balance with the returned account address
```

---

## Step 5: Save Diamond Address for Frontend/API

After successful deployment and verification:

```bash
echo "Diamond Proxy: $DIAMOND"
echo "Chain ID: 2201"
echo "RPC: $RPC_URL"
```

Update any frontend/API configuration that references the diamond address.

---

## Post-Deployment: Optional Configuration

These features are available but NOT configured by DiamondSetup. Apply manually post-deploy if needed:

| Feature | Function | Called By |
|---------|----------|-----------|
| Dealing schedules | `setDealingSchedule(account, fundId, timestamps[])` | Manager |
| NAV updates | `updateNav(account, fundId, newNav, navTimestamp)` | NAV Updater |
| Protocol safety limits | `setProtocolSafetyConfig(account, fundId, ...)` | Admin |
| FX rates | `updateFXRates(account, rates[], rateTimestamp)` | NAV Updater |
| Subscription rules | `setClassSubscriptionRules(account, classId, min, ...)` | Manager |
| Max fund capacity | `setMaxCapacity(account, fundId, maxCapacity)` | Manager |
| Risk adjustor | `setRiskAdjustor(account, classId, selector, params)` | Manager |
| Emergency pause | `blockProtocol()` / `blockFund(fundId)` | Admin |
| Fund activation | `activateFund(account, fundId)` | Admin (after NAV set) |

---

## Troubleshooting

### "AccountNotFound" during DiamondSetup
Phase 2 creates accounts but if `--skip-simulation` is not used, the generated account addresses won't match between simulation and broadcast. Always use `--skip-simulation --slow`.

### "InsufficientPermission"
The broadcasting wallet must match the account's owner wallet. Check that the private key in testnet.json matches the address.

### DiamondSetup idempotency
The script is idempotent — safe to re-run. It checks for existing accounts, funds, classes before creating. If it fails mid-way, just re-run.

### "Unknown perfFee type"
The `perfFee.type` field in testnet.json must be `"standard"` (maps to `PerfFeeStandardFacet`). Other calculator types require adding support to `_parsePerfFeeConfig()` in DiamondSetup.s.sol.

### Gemforge upgrade (adding new facets later)
```bash
yarn dlx gemforge build    # picks up new/modified facets
yarn dlx gemforge deploy avalanche_testnet  # only deploys changed facets
```

---

## Config Reference

| File | Purpose |
|------|---------|
| `gemforge.config.cjs` | Build + deploy config (networks, wallets, targets) |
| `gemforge.deployments.json` | Deployed contract addresses (auto-generated) |
| `script/setup-configs/testnet.json` | Post-deploy setup config (roles, funds, classes, perfFee) |
| `script/DiamondSetup.s.sol` | Config-driven post-deploy script (8 phases) |
| `script/ScriptBase.s.sol` | Shared helpers for scripts |
| `src/init/InitDiamond.sol` | First-deploy initialization (currencies, umbrella) |
| `foundry.toml` | Foundry compiler config |

## testnet.json Config Schema

```jsonc
{
  "target": "avalanche_testnet",           // gemforge target name
  "deployer": { "privateKey": "0x..." },   // diamond owner
  "roles": {
    "admin":      { "address": "0x...", "privateKey": "0x..." },
    "navUpdater": { "address": "0x...", "privateKey": "0x..." },
    "manager":    { "address": "0x...", "privateKey": "0x..." }
  },
  "investors": [{
    "address": "0x...",
    "name": "Investor 1",
    "kycVerified": true,
    "accreditedInvestor": true,
    "qualifiedPurchaser": true,
    "jurisdiction": "US",              // ISO 3166-1 alpha-2
    "investorType": 1,                 // 0=default, 1+=custom
    "tags": ["VI"],                    // 2-char tag codes
    "fundAmount": "1000000000000000000000000"  // wei (1M * 1e18)
  }],
  "umbrella": { "name": "Main Umbrella" },
  "funds": [{
    "name": "Fund 1",
    "classes": [{
      "name": "Class A",
      "mgmtFeeRate": 100,             // basis points (100 = 1%)
      "perfFee": {                     // OPTIONAL — omit for no perf fee
        "type": "standard",           // maps to PerfFeeStandardFacet
        "feeRateBps": 2000,           // 20% of gains above HWM
        "hurdleFundId": 0,            // 0 = no fund-based hurdle
        "fixedHurdleRateBps": 0,      // 0 = no fixed hurdle rate
        "maxFeeBps": 0                // 0 = no cap
      },
      "noticePeriod": 0,              // seconds (0 = none)
      "lockPeriod": 0,                // seconds (0 = none)
      "crystallisationPeriod": 0,     // OPTIONAL — seconds (0 = disabled)
      "eligibility": {                // OPTIONAL — omit for no restrictions
        "requiresKYC": false,
        "requiresAccredited": false,
        "requiresQualifiedPurchaser": false,
        "allowedInvestorTypes": [],
        "allowedJurisdictions": [],
        "requiredTags": []
      }
    }]
  }]
}
```
