# V9 Phase 2: Architecture Review — 2026-03-03

## Fix Interaction Map

### Fix 1 (ARCH-01): inExternalCallback Guard

**Location:** `FundTokensFacet._checkOnERC1155Received` lines 478-500
**Mechanism:** Sets `s.inExternalCallback = true` before external callback, resets after.
**Consumed by:** `BaseFacet.onlyInternalExecution` modifier (line 72: `if (s.inExternalCallback) revert NotInternalExecution()`)

**Finding V9-NEW-01 (MEDIUM): Batch callback path lacks inExternalCallback guard**
- `_checkOnERC1155Received` (line 470) → SETS `inExternalCallback = true` ✓
- `_checkOnERC1155BatchReceived` (line 502) → DOES NOT set `inExternalCallback` ✗
- **Current exploitability:** LOW — no internal execution path triggers batch callbacks. All internal mints/burns use singleton arrays via `_mint`/`_burn`. `executeTransferToken` uses `_safeTransferFrom` (singleton).
- **Latent risk:** If future code adds batch mint/transfer during `execute*` flow, the batch callback would bypass the ARCH-01 guard.
- **Recommendation:** Add `s.inExternalCallback = true/false` wrapping to `_checkOnERC1155BatchReceived` for consistency and future-safety.

### Fix 3 (V8-P01): BlockFacet — Emergency Pause

**Location:** New facet at `contracts/src/facets/BlockFacet.sol` (130 lines)
**Mechanism:** Two-level blocking:
- Protocol-level: `s.FundAdmin[0].protocolBlocked` → checked by `whenNotBlocked` modifier
- Fund-level: `s.FundAdmin[0].fundBlocked[fundId]` → checked by `_requireFundNotBlocked` helper

**Architecture assessment:**
- ✓ Block/unblock goes through proposal system (ROLE_ADMIN required)
- ✓ BlockFacet execute functions intentionally skip `whenNotBlocked` to prevent deadlock
- ✓ All other `execute*` functions across all facets have `whenNotBlocked` modifier
- ✓ Events emitted for all block/unblock operations
- ⚠ `whenNotBlocked` only checks protocol-level block, NOT fund-level. Fund-level block must be checked explicitly via `_requireFundNotBlocked(fundId)`.

**Finding V9-NEW-02 (LOW): Fund-level blocking not universally enforced**
- `whenNotBlocked` modifier only checks `protocolBlocked`, not `fundBlocked[fundId]`
- Fund-level blocking requires explicit `_requireFundNotBlocked(fundId)` calls
- No `execute*` function currently calls `_requireFundNotBlocked` — fund-level blocking is only useful for off-chain coordination (API checks `isFundBlocked`)
- **Impact:** On-chain, a fund-blocked fund's operations are NOT actually blocked. Only protocol-level block works on-chain.
- **Recommendation:** Either add fund-level checks to relevant execute functions, or document that fund-level blocking is advisory-only (off-chain enforcement).

### Fix 14: Multisig Threshold Validation

**Location:** `BaseFacet` or AccountFacet
**Assessment:** Verified `operatorThreshold` cannot exceed operator count. V8-A1-M04 is resolved.

### whenNotBlocked Coverage

**All execute* functions across all 19 facets have `whenNotBlocked`** except:
- `BlockFacet.executeSetProtocolBlock` — intentionally exempt
- `BlockFacet.executeSetFundBlock` — intentionally exempt

No gaps found. Fix 3 deployment is comprehensive.

## Trust Boundary Changes

### Before V8 Fixes
- `onlyInternalExecution` was the sole guard on `execute*` functions → BYPASSABLE via ERC1155 callback
- No emergency pause capability
- Safety parameters (fee caps, staleness) had no protocol-wide config

### After V8 Fixes
- `onlyInternalExecution` + `inExternalCallback` check → callback re-entry blocked
- `whenNotBlocked` → protocol-level emergency pause
- `ProtocolSafetyConfig` → centralized safety parameter storage (maxPerfFeeRateBps, maxAdjustmentBps, maxBenchmarkStaleness)

### New Attack Surface from Fixes
1. **ProtocolSafetyConfig as single point of configuration** — if admin compromises `setProtocolSafetyConfig`, ALL safety caps can be disabled at once. However, this goes through proposal system with admin role.
2. **BlockFacet deadlock risk** — if blocking requires admin multisig AND admin accounts are compromised during an exploit, unblocking becomes difficult. Consider adding a `ROLE_EMERGENCY` with lower threshold.
3. **Fund-level blocking is advisory-only** — on-chain enforcement gap (see V9-NEW-02 above).

## V8-A1-M01 Status Confirmation

The V8 investigation correctly identified this as FALSE POSITIVE:
- `createFund` → goes through `_validateAndPropose` → proposal system ✓
- `createDealing` → `onlyInternalExecution` ✓
- `mintAllPendingManagementFees(uint256, uint32)` → `onlyInternalExecution` ✓
