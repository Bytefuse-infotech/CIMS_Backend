# coaching-api

Monolithic NestJS backend for the Coaching Institute Management SaaS. Exposes two
API surfaces from one app:

- **`/api/v1`** — tenant surface. Every request scoped to one `tenantId`.
- **`/platform/v1`** — platform surface. Cross-tenant, super-admin only, audited.
- **`/webhooks`** — public, signature-verified (Razorpay). Outside both surfaces.
- **`/health`** — liveness/readiness.

## Stack

Node 18 · NestJS 10 · TypeScript · Mongoose 8 · MongoDB · JWT (two realms) · argon2 · Jest.

## Run locally

```bash
cp .env.example .env          # defaults target local Mongo
docker compose up -d          # starts MongoDB on :27017
npm install
npm run start:dev             # http://localhost:3000
```

Health check: `GET http://localhost:3000/health`.

## Test

```bash
npm test                      # 39 tests, uses mongodb-memory-server (no Docker needed)
```

Suites of note:

- `test/tenant-isolation.spec.ts` — tenant A can never read tenant B; queries with
  no tenant context fail closed; the audited bypass reads across tenants.
- `test/realm-separation.spec.ts` — a platform token is rejected on the tenant
  surface and vice versa (distinct signing secrets).
- `test/platform-surface.spec.ts` — full onboarding: owner logs in → provisions a
  tenant → seeded admin logs into the tenant surface → audit trail → impersonation.
- `test/webhook-idempotency.spec.ts` — a duplicate `payment.captured` webhook never
  double-credits an invoice.
- `src/modules/fees/fee-calc.spec.ts` — installment splitting + invoice status.

## Architecture notes

- **Multi-tenancy** is enforced at the ODM layer by `src/common/tenant.plugin.ts`,
  driven by an `AsyncLocalStorage` context (`src/common/tenant-context.ts`). The
  plugin auto-stamps `tenantId` on writes and auto-filters reads/updates/deletes/
  aggregations. It **fails closed**: a tenant query with no context throws.
- **The bypass** (`runWithBypass`) is the only way to cross tenants and is used
  solely by the platform surface + the webhook. Every use is audited.
  - Gotcha: Mongoose queries inside a context/bypass callback must `.exec()`
    *inside* the callback, or the ALS context is lost across the await.
- **Two JWT realms** never interchange — different secrets + a `realm` discriminator
  checked in each strategy and guard.

## Deferred (per plan — build in their sprints)

Razorpay/FCM/CDN SDK integrations are stubbed behind seams (payment order, webhook
apply, notification dispatch, signed upload URLs) — the data models, idempotency,
and routing are real; only the external SDK calls are pending. 2FA on the platform
realm is reserved (field present, not enforced).
