# Blockchain Best Practices

<!-- ~300 tokens -->
<!-- Updated 2026-02-08: Initial creation -->

## Verified Patterns

### P-BC01: Always use _validateAndPropose for external facet calls
- **When:** Adding new external functions to facets
- **Pattern:** `function doThing(...) external override { _validateAndPropose(ROLE_MANAGER, fundId, abi.encodeCall(...)); }`
- **Why:** Ensures role check + multisig + proposal system for all state changes

### P-BC02: Use Constants.sol for all magic values
- **When:** Any numeric or string literal in contract code
- **Pattern:** Define in `Constants.sol`, import and reference
- **Why:** Single source of truth, prevents inconsistencies across facets

### P-BC03: Emit events for all state changes
- **When:** Any function that modifies storage
- **Pattern:** `emit EventName(indexed_id, old_value, new_value);`
- **Why:** Audit trail, off-chain indexing, regulatory compliance

### P-BC04: Check entity lifecycle status before operations
- **When:** Any operation on umbrella/fund/class/dealing
- **Pattern:** Check `getEffectiveLifecycleStatus()` not just direct status
- **Why:** Parent entity status cascades to children

### P-BC05: Use custom errors from ISharedErrors.sol
- **When:** Any revert condition
- **Pattern:** `if (condition) revert ErrorName();` — define in ISharedErrors.sol
- **Why:** Gas efficient, consistent error interface, avoids string errors
