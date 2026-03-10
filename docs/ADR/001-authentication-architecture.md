# ADR-001: Authentication Architecture

> Date: 2026-02-20
> Status: Proposed

---

## Context

Elysium has three distinct user populations, each accessing a separate platform:

| Population | Platform | App |
|------------|----------|-----|
| Investors | Investor portal | Expo / Next.js |
| Fund managers | Manager dashboard | Next.js |
| Admins | Internal tooling | Next.js |

In practice these populations have **minimal overlap** — the same human is unlikely to hold roles across more than one platform. The backend uses Cerbos for ABAC authorization, which requires a well-formed principal (identity + attributes) on every request. Identity is handled via AWS Cognito.

The team evaluated four options for how to structure Cognito user pools and cross-platform identity correlation.

---

## Authentication Provider Selection

### Background: Privy

The initial implementation used **Privy** as the authentication and wallet layer. Privy's core value proposition is embedded wallets — creating and managing on-chain wallets on behalf of users, abstracting key management, and providing social-login-to-wallet flows. It also handles traditional auth (email/password, OAuth) as a secondary capability.

### Why we moved away from Privy

Elysium manages wallets for its users directly. We provision and control the wallet infrastructure ourselves, rather than delegating it to a third-party embedded wallet provider. This means Privy's primary capability — the on-chain infrastructure — provides zero value to us, and we were paying for wallet management we weren't using. Continuing with Privy would mean coupling our auth layer to an on-chain abstraction service that is architecturally irrelevant to our stack.

### Options evaluated

| Provider | Reason rejected |
|----------|-----------------|
| **Privy** | Value proposition is embedded wallets + on-chain infra. We have decided to manage the user wallets ourselves as the user never has actual access to it. Unnecessary vendor, unnecessary cost. |
| **Auth0** | Feature-rich but an additional external vendor with high migration coupling. No native AWS integration; would sit alongside rather than inside our existing AWS infra. |
| **Clerk** | Same concerns as Auth0. Strong DX but vendor lock-in is high and it adds nothing that Cognito cannot provide. |
| **AWS Cognito** | ✓ **Selected.** Does everything required (JWT issuance, MFA, user pools, OAuth flows, social login). Native to AWS — integrates cleanly with the Lambda, API Gateway, and Secrets Manager infrastructure already in place. No additional vendor. |

### Decision

**AWS Cognito** is the authentication provider for all three platforms. It issues JWTs that are validated in the Lambda middleware layer. Cognito's JWT claims form the basis of Cerbos principal construction.

Privy to be removed from the stack. Auth0 and Clerk were considered but rejected on grounds of unnecessary vendor dependency and lack of native AWS integration.

---

## Pool Structure Options Considered

| Consideration | Option 1: Pool per platform + User mapping | Option 2: Auth0/Clerk federation | Option 3: One pool, app-level passwords | Option 4: Pool per platform, separate entities |
|---|---|---|---|---|
| Cross-platform correlation | Yes, via User mapping table | Yes, natively | Yes, same Cognito user | No — entities are independent |
| KYC/AML | Once, via shared User | Once, via shared identity | Once, same user | Per entity — risk of duplication |
| Credential independence | ✓ Separate passwords | ✓ Separate per connection | ✗ One Cognito password, PIN is secondary | ✓ Separate passwords |
| Email reuse across platforms | ✓ Different pools, same email allowed | ✓ Handled natively | ✗ One email per pool | ✓ Different pools |
| Vendor lock-in | Medium — Cognito only | High — Auth0/Clerk + Cognito or replacement | Medium — Cognito only | Medium — Cognito only |
| Migration cost (swap auth provider) | Medium — 3 pools to migrate, User mapping stays | High — federated identity is deeply coupled to provider | Medium — app passwords also need migrating | Low — pools are thin, entities are independent |
| Cerbos/ABAC compatibility | Clean — principal built from User + AccessRecord | Clean — principal built from federated identity | Clean — same as Option 1 | Cleanest — principal built directly from entity |
| Population overlap handling | Handled via shared User | Handled natively | Handled, same user | Not handled — blind to overlap |
| Audit trail across platforms | ✓ Via shared User | ✓ Native | ✓ Same user | ✗ No correlation possible |
| Schema complexity | Medium — User + UserIdentity mapping | Low in DB, complex in auth config | Medium — User + secondary credential storage | Lowest — just three entity types |
| Operational complexity | Medium — 3 pools | High — external vendor + configuration | Low — 1 pool | Medium — 3 pools |
| Onboarding UX | Separate signup per platform | Can be unified or separate | Single signup, platform access granted | Separate signup per platform |
| Account recovery | Per pool, but User ties them together | Unified recovery | Single recovery | Fully independent per platform |
| Future auth methods | Possible but per-pool effort | Easiest — provider handles it | Awkward — app passwords complicate SSO | Possible but per-pool effort |
| How hard to change this decision later | Medium — mapping table helps decouple | Hard — federation is deeply structural | Hard — app passwords are bespoke infrastructure | Easy if no overlap needed, painful if overlap emerges |

---

## Decision

**Option 4: One Cognito user pool per platform, with fully independent entity types.**

Three Cognito pools (Investor, Manager, Admin). Each pool authenticates its own population independently. The Cerbos principal is constructed directly from the platform entity — no shared User model, no cross-platform mapping table.

### Rationale

- The three populations have minimal real-world overlap, making the correlation machinery of Options 1–2 unnecessary complexity for V1.
- Option 4 yields the simplest DB schema and the cleanest Cerbos principal construction.
- Migration cost is lowest — pools are thin wrappers; swapping auth provider later does not require unwinding a mapping layer.
- Option 2 (Auth0/Clerk) was ruled out due to additional vendor dependency and high migration coupling. It would be the right choice if unified onboarding UX were a hard requirement from day one.
- Option 3 was ruled out because a single pool prohibits email reuse across platforms and the app-level password layer adds bespoke infrastructure with no clear benefit.

---

## Login Options

Cognito supports multiple credential types per pool. The following table captures which options are available, their applicability per platform, and the current stance.

| Method | Mechanism | Investor | Manager | Admin | Notes |
|--------|-----------|----------|---------|-------|-------|
| **Email + password** | Cognito built-in user pool auth | ✓ Default | ✓ Default | ✓ Default | Standard credential flow. Password policy configurable per pool. MFA can be required or optional. |
| **Social — Google** | Cognito Hosted UI + OAuth 2.0 federation | ✓ Optional | ✗ | ✗ | Investor-facing only; manager/admin accounts are provisioned, not self-registered via social. |
| **Social — Apple** | Cognito Hosted UI + Sign in with Apple | ✓ Optional | ✗ | ✗ | Required for iOS App Store compliance if social login is offered at all. |
| **Passwordless — magic link** | Custom auth challenge Lambda trigger | ✓ Optional | ✓ Optional | ✗ | Email-based one-time link. Requires `CUSTOM_AUTH` flow and a Define/Create/Verify challenge Lambda trio. |
| **Passwordless — OTP (email/SMS)** | Custom auth challenge Lambda trigger or Cognito native OTP | ✓ Optional | ✓ Optional | ✗ | 6-digit code delivered via email or SMS. SMS incurs SNS cost. |
| **Passkeys / WebAuthn** | Cognito passkey support (GA 2024) | ✓ Future | ✓ Future | ✓ Future | Cognito now supports passkeys natively. Strongest phishing resistance; recommended for future hardening. |

### Per-platform defaults (V1)

- **Investor pool**: Email + password enabled by default. Social (Google, Apple) can be enabled at launch with minimal config. Passwordless is deferred to V2.
- **Manager pool**: Email + password only. Manager accounts are admin-provisioned; self-service social login is not appropriate. Passwordless OTP can be offered as a step-up or recovery option.
- **Admin pool**: Email + password with mandatory MFA (TOTP). No social login. No passwordless. Passkeys are the preferred upgrade path when available across the team's devices.

### Implementation notes

- Social federation is configured at the pool level via Cognito Identity Providers. The Hosted UI handles the redirect flows; the app receives a standard Cognito JWT after federation — no provider-specific token handling required in application code.
- Passwordless custom auth requires three Lambda functions per pool (`DefineAuthChallenge`, `CreateAuthChallenge`, `VerifyAuthChallengeResponse`). These are self-contained and do not affect the rest of the middleware stack.
- All login methods produce the same JWT structure. Cerbos principal construction is unaffected by which credential type was used.

---

## Consequences

**Positive:**
- Lowest schema complexity — no User, UserIdentity, or AccessRecord join tables required at auth layer.
- Cerbos principal construction is trivial: JWT claims map directly onto the entity type.
- Each pool can evolve independently (different MFA policies, password rules, social login configuration per platform).
- Easiest to reason about for auditors — each platform is a hermetically sealed auth domain.

**Negative / Accepted tradeoffs:**
- No native cross-platform audit trail. Activity by the same human on two platforms cannot be correlated without a future linking step.
- KYC/AML verification is per entity. If a human is ever both an investor and a manager, KYC would need to be completed twice. This is accepted as out of scope for V1 given the low probability of overlap.
- If population overlap materialises in production, retrofitting correlation is non-trivial — it would require introducing something close to Option 1's mapping table at that point.

---

## Open Questions & Future Escape Hatches

### KYC/AML overlap risk
The primary risk of Option 4 is duplicate KYC checks if a human holds roles on multiple platforms. Two mitigations are available without building full correlation machinery now:

1. **Accept it as out of scope** — document that KYC is per-platform and handle duplication manually if it arises.
2. **Soft link via optional `personId`** — add a nullable `personId` field to each entity type. Leave it unpopulated by default. If cross-platform identity ever needs to be asserted (e.g. for KYC deduplication), populate it without changing the auth architecture.

The soft-link approach is preferred as a hedge: it costs a single nullable column per entity table and imposes no operational burden until needed.

### Future auth methods
Passkeys, SSO, and magic links are all achievable per-pool without architectural change. OAuth federation (e.g. "log in with Google") is straightforward in Cognito on a per-pool basis. If a single sign-on experience across all three platforms is ever required, revisit Option 2 at that point.

### Revisit trigger
This decision should be revisited if:
- A meaningful number of users hold roles on more than one platform.
- Regulatory requirements mandate a single KYC check per human across all platforms.
- A unified onboarding or account recovery UX is required across platforms.
