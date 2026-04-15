# Backend Best Practices

<!-- ~250 tokens -->
<!-- Updated 2026-02-08: Initial creation -->

## Verified Patterns

### P-BE01: Validate all input with Zod at handler boundary
- **When:** Every API handler function
- **Pattern:** `const validated = Schema.parse(event.body);` at top of handler
- **Why:** Fail fast, clear errors, type-safe downstream

### P-BE02: Wrap multi-step DB operations in Prisma transactions
- **When:** Multiple related database writes
- **Pattern:** `await prisma.$transaction([op1, op2, op3])`
- **Why:** Atomicity — partial writes leave inconsistent state

### P-BE03: Return consistent response format
- **When:** Every API response
- **Pattern:** Success: `{ data: {...}, meta: { requestId } }` / Error: `{ error: { code, message, details } }`
- **Why:** Frontend can rely on consistent shape

### P-BE04: Use Middy middleware pipeline for cross-cutting concerns
- **When:** Adding auth, validation, error handling to handlers
- **Pattern:** `withMiddlewares(handler)` from `src/middleware/createHandler.ts`
- **Why:** Consistent middleware chain, DRY
