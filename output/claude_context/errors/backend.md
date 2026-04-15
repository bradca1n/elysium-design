<!-- ~500 tokens -->
# Backend Error Catalog

API and service-layer pitfalls for the Elysium backend (Node.js, Zod, Prisma).

## E-BE01: Missing Zod Validation on Request Input
- **Pattern:** Accepting request body, query params, or path params without schema validation, trusting that callers send correct data.
- **Fix:** Validate ALL input with Zod schemas before processing. Define a schema for every endpoint and call `.parse()` or `.safeParse()` at the handler entry point. Fail fast with clear error messages.
- **Discovered:** 2026-02-08

## E-BE02: Inconsistent Response Format
- **Pattern:** Returning ad-hoc response shapes like `{ result: ... }`, `{ success: true, ... }`, or raw data without a wrapper.
- **Fix:** Always use the standard format. Success: `{ "data": { ... }, "meta": { "requestId": "..." } }`. Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.
- **Discovered:** 2026-02-08

## E-BE03: Missing Rate Limiting on Endpoints
- **Pattern:** Exposing API endpoints without any rate limiting, allowing unlimited requests from any client.
- **Fix:** Apply rate limiting to all endpoints. Use stricter limits on authentication and write endpoints. Configure limits per-route where appropriate.
- **Discovered:** 2026-02-08

## E-BE04: Missing Request IDs for Tracing
- **Pattern:** Processing requests without generating or propagating a request ID, making it impossible to trace a request through logs and downstream services.
- **Fix:** Generate a unique request ID for every incoming request (or accept one from the `X-Request-ID` header). Include it in all log entries, error responses, and downstream calls via the `meta.requestId` field.
- **Discovered:** 2026-02-08

## E-BE05: Not Using Prisma Transactions for Multi-Step Operations
- **Pattern:** Performing multiple related database writes as separate Prisma calls without wrapping them in a transaction, risking partial state on failure.
- **Fix:** Use `prisma.$transaction([...])` or the interactive transaction API `prisma.$transaction(async (tx) => { ... })` for any operation that involves more than one write.
- **Discovered:** 2026-02-08

## E-BE06: Not Sanitizing Output Data
- **Pattern:** Returning raw database records or internal objects directly in API responses, potentially exposing internal IDs, timestamps, or sensitive fields.
- **Fix:** Always map database records to response DTOs. Strip internal fields (internal IDs, audit columns, soft-delete flags) before returning. Use Zod `.transform()` or explicit mapping functions.
- **Discovered:** 2026-02-08
