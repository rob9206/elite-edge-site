# Apex Power Ops

Internal job pipeline for Apex Power: **public intake → estimate → approval → plan of action → ledger**, with crypto invoice collection via Uniwire.

Single-tenant internal tool for a two-person crew (Foti, Steve) plus a public, no-login estimate request form.

Built with **Next.js (App Router) · TypeScript · Prisma/Postgres · Tailwind · Zod · Vitest**.

---

## Pipeline

```
intake (public) → estimate draft → staff review/edit → approve (Foti) →
plan generated + tasks assigned → ledger entry → invoice issued → payment
callback updates ledger → confirmed releases job to scheduled
```

## Roles

| | Foti (`admin`) | Steve (`crew`) | Customer |
|---|---|---|---|
| Public intake form | ✓ | ✓ | ✓ (no login) |
| View jobs, estimates, **pricing** | ✓ | ✓ (read-only) | — |
| Approve estimate / edit pricing / reassign tasks | ✓ | — | — |
| Start / complete **his own** tasks | ✓ (any) | ✓ (own) | — |
| Issue invoices, close jobs | ✓ | — | — |

> **Decisions baked in** (from the build brief): **no deposit** — invoices are a **manual amount** Foti enters per job (validated > 0). Steve has **full read-only** visibility including pricing, and can still update the status of his own tasks.

## Role division (plan generation)

Tasks are generated from a deterministic per-job-type template, ordered by dependency, and assigned by complexity:

- **1–2 → Steve** (prep, demo, haul, material runs, cleanup, simple installs)
- **3–5 → Foti** (layout, technical sequencing, decisions, dependency hubs)

Hard rule, enforced by `validatePlan` and re-checked on every reassignment: **a Foti task never depends on a Steve task** (Foti is never blocked waiting on Steve). Templates are authored so this holds by construction; the one-click reassign refuses a change that would violate it.

---

## Local setup

```bash
cd ops
cp .env.example .env          # fill in SESSION_SECRET + DATABASE_URL
npm install
npm run db:deploy             # apply migrations to your Postgres
npm run db:seed               # create the foti + steve accounts
npm run dev                   # http://localhost:3000
```

Seed passwords come from `SEED_FOTI_PASSWORD` / `SEED_STEVE_PASSWORD` in `.env`. Sign in at `/login`; customers use `/request`.

### Scripts
| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit suite (no DB needed) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:deploy` / `db:migrate` / `db:seed` / `db:reset` | Prisma |

## Environment

See `.env.example`. Required: `SESSION_SECRET` (≥32 chars), `DATABASE_URL` (Postgres). Validated at startup in `src/lib/env.ts`.

---

## Uniwire payments

All Uniwire calls are **server-side only** and HMAC-signed; `UNIWIRE_API_SECRET` never reaches the client. The gateway sits behind the `PaymentGateway` interface (`src/lib/uniwire`), so the whole app runs and is testable **before real keys exist**:

- `UNIWIRE_MODE=stub` (default) — in-process fake gateway, no network, no keys.
- `UNIWIRE_MODE=live` — real client against `UNIWIRE_API_BASE`, requires `UNIWIRE_API_KEY`, `UNIWIRE_API_SECRET`, `UNIWIRE_PROFILE_ID`.

**Request signing** (`src/lib/uniwire/sign.ts`): payload + `request` (endpoint) + `nonce` → JSON → base64 → HMAC-SHA256(secret) → headers `X-CC-KEY`, `X-CC-PAYLOAD`, `X-CC-SIGNATURE`.

**Invoices**: `POST /v1/invoices/` with a decimal-string USD `amount` (never blank), `kind` = `BTC` (on-chain) or `BTC_LIGHTNING` (bolt11 surfaced for QR/copy), and `passthrough` carrying `{ job_id, estimate_id }`. Invoices are created only when Foti issues one — not pre-created per chain.

**Webhook** `POST /api/webhooks/uniwire` (`src/app/api/webhooks/uniwire/route.ts`):
- Verifies the signature against the **raw** body before trusting it (`X-CC-Webhook-Signature`).
- **Idempotent**: upserts on `uniwire_invoice_id`, status only moves forward — replaying the same confirmation N times changes state exactly once. Every raw body is stored (`payment_callbacks`) for replay/audit.
- Status map: `invoice_pending → payment_pending`, `invoice_confirmed → payment_confirmed`, `invoice_complete → paid`, `invoice_incomplete → flagged for review (no scheduling change)`. **Only confirmed+ releases an approved job to `scheduled`.**

Point Uniwire's webhook at `https://<your-domain>/api/webhooks/uniwire` and set `UNIWIRE_WEBHOOK_SECRET` to the shared secret.

---

## Money & validation

- Money is **integer cents** everywhere in the app and DB; decimal strings exist only at the Uniwire boundary (`src/lib/money.ts`). Percentages are **integer basis points**.
- Every input is validated with **Zod** (`src/lib/validation.ts`).
- The public form and the webhook are **rate-limited** (`src/lib/rate-limit.ts`; in-memory — swap for Upstash/Redis in multi-instance deploys).
- Secrets are server-side only; no PII is logged.

## Estimate engine

Deterministic, **not LLM-guessed** (`src/lib/estimate`). Line items come from a seeded unit-cost table (`catalog.ts`) × measured quantities. The total is **recomputable from the line items alone** (`computeEstimate`). Foti can edit any line, add manual override lines, and adjust contingency/tax before approving.

---

## Deploy (Vercel)

1. Push this repo; import the project in Vercel (root directory `ops` if the repo contains more than this app).
2. Set env vars: `SESSION_SECRET`, `DATABASE_URL`, `UNIWIRE_*`, `UNIWIRE_WEBHOOK_SECRET`.
3. Build command `npm run build` (runs `prisma generate`). Add `prisma migrate deploy` as a deploy/release step (or run it against the DB once).
4. Seed the two staff accounts once: `npm run db:seed` (or a one-off job).
5. Configure the Uniwire webhook URL and switch `UNIWIRE_MODE=live` with real keys.

## Tests & acceptance criteria

`npm test` (28 tests) covers the deterministic core. Mapping to the brief's acceptance criteria:

| # | Criterion | Where |
|---|---|---|
| 1 | Intake creates a draft job, all fields persisted | `actions/intake.ts` |
| 2 | Approval blocked unless Foti | `assertAdmin` in `actions/estimate.ts` |
| 3 | Plan: 1–2 → Steve, 3–5 → Foti, no Steve task precedes a Foti dep | `plan.test.ts`, `plan/engine.ts` |
| 4 | Approval appends ledger + builds the job's ledger view | `actions/estimate.ts`, job page |
| 5 | Issuing an invoice returns address/LN + writes a payment row | `actions/payment.ts` |
| 6 | Replaying a callback 3× → exactly one status change | `payments.test.ts` |
| 7 | `invoice_incomplete` flags and does not reschedule | `payments.test.ts`, `payments/process.ts` |
| 8 | Every task shows complexity/assignee/status; 1-click reassign | job page, `actions/tasks.ts` |

## Out of scope for v1

Scheduling calendar, customer accounts, SMS, invoicing beyond the manual amount, multi-company tenancy, LLM-generated estimates, photo blob storage.
