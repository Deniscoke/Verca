# VERCA — Phase A: repository inspection & Supabase + Vercel integration plan

**Scope:** inspection and architecture plan only. No Supabase project wiring, no `package.json`, no RLS SQL executed in this phase.

---

## A.1 Goal (Phase A)

Confirm how a **static HTML/CSS/JS** site on Vercel can adopt **Supabase (Postgres + Auth)** safely: secrets and service role only in **Vercel serverless** (`api/`), **strict RLS** on commerce tables, alignment with Phase 3 schema concepts, guest checkout without exposing orders to anonymous clients, optional Google login via Supabase (not mandatory), loyalty and marketing consent separated.

---

## A.2 Current repository state (inspected)

| Area | State |
|------|--------|
| Front-end | Static pages (`index.html`, `bylinny-atelier.html`, legal pages, room pages). No React/Next. |
| Vercel serverless | `api/` with stubs: `health`, `checkout/create-session`, `webhooks/stripe`, `auth/google/callback`, `account/me`, `loyalty/summary`; shared `api/_lib/env.js`, `http.js`. |
| `package.json` | **Absent** — API handlers use Node built-ins only. Later phases add dependencies **for serverless only** (e.g. `@supabase/supabase-js`, `stripe`). |
| Database | `db/schema-proposal.sql` (Phase 3) — **not applied**; no `supabase/migrations` yet. |
| Env template | `.env.example` has `DATABASE_URL`, Stripe, Google OAuth placeholders — Supabase-specific vars not yet listed. |
| Compliance docs | `docs/compliance-mapping.md`, legal HTML; `consent_type` / version concepts documented. |

---

## A.3 Target architecture (honest scaffolding)

```
[Browser — static site]
  ├─ Optional: @supabase/supabase-js with anon key ONLY if needed for:
  │     - signInWithOAuth(Google) redirect
  │     - reading public catalog (products) if exposed via RLS
  │  NEVER: service_role, never order writes from browser
  └─ Checkout / webhooks / admin writes → same-origin fetch to /api/*

[Vercel serverless — api/*]
  ├─ SUPABASE_SERVICE_ROLE_KEY — create orders, apply webhooks, loyalty, consent writes, audit_log
  ├─ SUPABASE_URL + (optional) DB connection string for migrations CLI
  └─ Stripe secrets (Phase F), Google OAuth secrets if not fully delegated to Supabase Auth

[Supabase]
  ├─ auth.users — identities (optional Google)
  ├─ public.* — commerce tables under RLS
  └─ RLS: authenticated users see only their customer_account / orders; anon sees only what is explicitly public
```

---

## A.4 Critical design decision: `public.users` vs Supabase Auth

Phase 3 defines a **`public.users`** table (email, `google_sub`, `password_hash`). With Supabase:

- **Recommended:** Treat **`auth.users`** as the identity store. Avoid duplicating login identity in `public.users` unless you need columns Auth does not provide (then sync via trigger or use `auth.users` metadata sparingly).
- **Map commerce profile:** `customer_accounts.auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL` (add in Phase C migration as adjustment to Phase 3).
- **Optional password login later:** Supabase email/password or magic link — still `auth.users`.
- **Google optional:** Enable Google provider in Supabase dashboard; no obligation to link account to checkout.

**Phase C deliverable:** migration SQL should either **drop** Phase 3 `public.users` in favor of `auth_user_id` on `customer_accounts`, or document a deprecated `public.users` — single path must be chosen to avoid two sources of truth.

---

## A.5 RLS strategy preview (detailed in Phase D)

| Table / concern | Direction |
|-----------------|-----------|
| `products` | `SELECT` for `anon` + `authenticated` where `is_active = true` (if catalog is public); or no anon access — only server reads via service role (simplest for MVP). |
| `orders` | **No broad anon read.** Guest must not query by email from client. Server creates/updates with service role; customer views order via **signed server response** or magic link flow. |
| `order_items`, `payments` | Same as orders — tied to order ownership checks or service-only. |
| `customer_accounts` | `SELECT`/`UPDATE` where `auth_user_id = auth.uid()`. |
| `loyalty_ledger` | `SELECT` where account belongs to `auth.uid()`; **inserts** via service role (webhook/cron) only. |
| `consents` | `SELECT`/`INSERT` for rows where subject links to caller’s account or email verified flow — **tight policy**; marketing vs loyalty types enforced in app + CHECK or enum extension. |
| `webhook_events`, `audit_log` | **Service role only** (no policies for `anon`/`authenticated`, or deny all). |

---

## A.6 Guest checkout (no therapy data)

1. Client calls `POST /api/checkout/create-session` with cart payload (product ids + quantities only; **prices validated server-side** against DB).
2. Server creates `orders` row (`pending_payment`, `guest_email`, `customer_account_id` NULL) using **service role**.
3. Stripe Checkout Session carries `client_reference_id` = internal order id (opaque).
4. Webhook updates `payments`, `orders.status`; loyalty ledger updated server-side with idempotency.
5. **Order status for guest:** email receipt + link with **unguessable token** (stored hashed on order or separate `order_access_tokens` table) — implement in Phase F/G, not in browser Supabase queries.

---

## A.7 Phases B–H — planned files & intent (not executed in A)

| Phase | Intent | Expected new/changed paths (preview) |
|-------|--------|--------------------------------------|
| **B** | Supabase server helpers | `api/_lib/supabase-admin.js` (service client), `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` optional), `package.json` at repo root for Vercel deps |
| **C** | Migrations | `supabase/migrations/YYYYMMDDHHMM_schema.sql` — Phase 3 tables + `auth_user_id` adjustment; extensions if needed |
| **D** | RLS | Same or follow-up migration `..._rls.sql` — `ENABLE ROW LEVEL SECURITY`, policies, `GRANT` audit |
| **E** | Auth readiness | Supabase Auth URL config, optional minimal client snippet for OAuth only, `api/auth/*` alignment or redirect to Supabase hosted flow |
| **F** | Orders / Stripe | Flesh out `api/checkout/create-session.js`, `api/webhooks/stripe.js` with service client |
| **G** | Consent + loyalty | Server endpoints or webhook hooks writing `consents`, `loyalty_ledger` with `idempotency_key` |
| **H** | Docs | `docs/supabase-setup.md` — Vercel env, CLI migrate, local `vercel dev`, security checklist |

---

## A.8 Risks (Phase A)

| Risk | Mitigation (later phases) |
|------|---------------------------|
| Duplicating `auth.users` and `public.users` | Choose single identity model in Phase C. |
| Accidental `service_role` in static HTML | Code review + grep CI; only `api/` imports service client. |
| RLS too permissive on `orders` | Default deny; guest access only via server + token. |
| Supabase Realtime exposing rows | Disable Realtime on sensitive tables or never subscribe from client for orders. |

---

## A.9 Phase A — deliverables summary

| Item | Status |
|------|--------|
| Repo inspected | Done |
| Integration plan documented | This file |
| Code / SQL / env changes | **None** in Phase A (per “plan only”) |

---

## A.10 Blockers before Phase B

1. **Decision:** Confirm dropping or repurposing Phase 3 `public.users` in favor of `auth.users` + `customer_accounts.auth_user_id`.
2. **Supabase project** created (URL + keys) — operator action outside repo.
3. **Legal:** cookie/consent banner before loading any Supabase client in browser (if anon key used on front).

---

## A.11 Recommended next step

**Phase B:** Add root `package.json` with `@supabase/supabase-js`, implement `api/_lib/supabase-admin.js` (lazy init, throws if service key missing), extend `.env.example`, keep static pages unchanged.
