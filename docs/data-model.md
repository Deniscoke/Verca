# VERCA — data model (proposal, Phase 3)

**Status:** design / migration-ready proposal. **No database is wired** in this repository yet.

**Assumptions:** PostgreSQL (e.g. Neon, Supabase Postgres, RDS). UUID primary keys, `timestamptz`, amounts in minor units (`*_cents`) with ISO currency codes.

---

## 1. Design principles

| Principle | Application |
|-----------|-------------|
| **Guest checkout** | `orders` may have `customer_account_id` NULL; identity for fulfillment uses `guest_email` / snapshot columns on the order. |
| **Optional Google login** | `users` rows exist only when an account is created; `users.google_sub` is nullable and unique when set. |
| **Shop vs therapy** | All tables in this document are **commerce / operations**. No clinical notes, diagnoses, or intimate therapy content. See `privacy-data-separation.md`. |
| **Loyalty vs marketing** | `loyalty_ledger` is mechanical; `consents` rows distinguish `marketing_*` from `loyalty_program_terms` acceptance where needed. |
| **GDPR / minimal** | Store only fields needed for orders, tax, shipping, support, and auditable consents; document retention in policy (not enforced in SQL here). |
| **Auditable** | `audit_log` and `webhook_events` support traceability without logging full card data or raw webhook bodies by default. |

---

## 2. Entity overview

```
users ────────┬────< customer_accounts (1 : 0..1 for linked shop profile)
              │
customer_accounts ──┬────< orders
                    ├────< loyalty_ledger
                    └────< consents (optional linkage)

products ──────< order_items >── orders
orders ────────< payments
orders ────────(optional FK)── bookings_reference

webhook_events  (global, Stripe idempotency)
audit_log       (global)
```

---

## 3. Table summaries

### `users`

Authentication identity (password and/or OAuth). **Not every buyer has a row.**

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `email` | Unique login identifier (normalized lowercase). |
| `email_verified_at` | When email ownership was confirmed. |
| `google_sub` | Google `sub` claim; unique when present. |
| `password_hash` | Nullable if OAuth-only. |
| `status` | `active`, `disabled`, etc. |
| `created_at`, `updated_at`, `last_login_at` | Operational |

### `customer_accounts`

Shop customer record: loyalty balance is **derived from `loyalty_ledger`**, not stored as authoritative total (optional cached column can be added later with care).

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `user_id` | Nullable FK → `users`; NULL = no login (pure guest profile never created) or pre-link state per product rules. |
| `primary_email` | Canonical email for matching pre-login orders (optional business use). |
| `display_name`, `phone_e164` | Minimal contact; encrypt phone at rest if policy requires (DB or app layer). |
| `created_at`, `updated_at` | Audit |

**Guest checkout without account:** no `customer_accounts` row required; `orders.guest_email` holds fulfillment contact.

### `products`

Catalog line for atelier SKUs.

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `sku` | Unique business key |
| `name`, `description` | Display (Czech copy can live here or in CMS later) |
| `price_cents`, `currency` | **Display/reference**; **authoritative price** for checkout must still be validated server-side against this or Stripe Price IDs. |
| `stripe_price_id` | Optional link to Stripe Price |
| `is_active`, `inventory_policy` | e.g. `none`, `finite` + separate inventory table later |
| `metadata` | `jsonb` for non-sensitive attributes (scent family, size) — no health claims |
| `compliance_note` | Internal text: regulatory hints (cosmetics vs other); not shown to customer by default |

### `orders`

Commercial order header.

| Column | Purpose |
|--------|---------|
| `id` | PK (expose opaque `order_number` to customers if desired) |
| `customer_account_id` | Nullable |
| `guest_email`, `guest_name` | Required path for guest checkout when `customer_account_id` IS NULL |
| `status` | `draft`, `pending_payment`, `paid`, `fulfilled`, `cancelled`, `refunded` (tune enum in migration) |
| `currency` | ISO 4217 |
| `subtotal_cents`, `tax_cents`, `shipping_cents`, `total_cents` | Snapshots at purchase time |
| `shipping_address_json`, `billing_address_json` | Structured snapshots (minimize PII in logs) |
| `stripe_checkout_session_id` | Optional link for reconciliation |
| `created_at`, `updated_at` | |

**Constraint (application-enforced):** either `customer_account_id` IS NOT NULL OR `guest_email` IS NOT NULL.

### `order_items`

| Column | Purpose |
|--------|---------|
| `order_id`, `product_id` | FKs |
| `sku_snapshot`, `name_snapshot` | Immutable line description at time of order |
| `quantity`, `unit_price_cents`, `line_total_cents` | |

### `payments`

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `order_id` | FK |
| `provider` | e.g. `stripe` |
| `provider_payment_id` | PaymentIntent or Charge id |
| `amount_cents`, `currency` | |
| `status` | `pending`, `succeeded`, `failed`, `refunded` |
| `raw_provider_status` | Short string for support |
| `created_at`, `updated_at` | |

No full PAN/CVV; Stripe handles card data.

### `loyalty_ledger`

Append-only style ledger (prefer **no updates**; adjustments as new rows).

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `customer_account_id` | FK — **policy:** guests typically earn only after account link or forfeit points (business decision) |
| `delta_points` | Positive earn, negative redeem |
| `reason` | `purchase`, `redemption`, `session_reward`, `manual_adjust`, `expiry` |
| `reference_type`, `reference_id` | Polymorphic: e.g. `order` + UUID; `booking_event` + id |
| `idempotency_key` | UNIQUE — prevents double credit from webhook retries |
| `created_at` | |

**Session rewards:** `reason = session_reward` only with neutral `bookings_reference` / event id — no medical payload.

### `bookings_reference`

Neutral operational bridge between **booking/scheduling** and **loyalty** (or analytics).

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `external_system` | e.g. `manual`, `calcom`, future provider |
| `external_id` | Id in that system |
| `customer_account_id` | Nullable if only email known — then link via separate process |
| `session_completed_at` | When completion was recorded |
| `meta` | `jsonb` — **only** non-sensitive keys (e.g. `service_code: "massage_60"`), no free-text notes |

### `consents`

Granular consent records for GDPR traceability.

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `subject_type` | `user`, `customer_account`, `email_only` (guest pre-account) |
| `subject_id` | UUID or nullable when `email_only` |
| `email` | Denormalized for guest marketing opt-in before account |
| `consent_type` | e.g. `marketing_email`, `cookies_analytics`, `terms_of_sale`, `loyalty_program_terms` |
| `version` | Policy version string |
| `granted` | boolean |
| `granted_at`, `withdrawn_at` | |
| `source` | `web_form`, `checkout`, `account_settings` |
| `ip_hash`, `user_agent_hash` | Optional proof; hash only per DPA |

Marketing consent is **separate** from accepting loyalty program rules (separate `consent_type` rows).

### `webhook_events`

Stripe (and future) idempotency.

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `provider` | `stripe` |
| `event_id` | UNIQUE — provider’s event id |
| `event_type` | |
| `processed_at` | |
| `processing_status` | `received`, `processed`, `failed` |
| `error_message` | Short, no full payload |

Store full payloads only if legal/ops requires — prefer separate encrypted blob storage with TTL.

### `audit_log`

Security and admin actions.

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `actor_type` | `system`, `user`, `admin` |
| `actor_id` | Nullable UUID / text |
| `action` | e.g. `order.refund`, `product.update`, `user.disable` |
| `entity_type`, `entity_id` | |
| `payload` | `jsonb` — redacted, no secrets |
| `created_at` | |

---

## 4. Indexes & constraints (see SQL)

- Foreign keys with `ON DELETE` strategy per table (RESTRICT for orders; soft-delete products preferred).
- Unique `(provider, event_id)` on `webhook_events`.
- Unique `idempotency_key` on `loyalty_ledger` where not null.

---

## 5. Out of scope (this schema)

- **Therapy / health records:** separate domain; see `privacy-data-separation.md`.
- **Newsletter provider sync** (Mailchimp, etc.): only consent flags here; sync is integration layer.
- **Inventory reservations:** add `inventory_reservations` or stock table in a later migration.

---

## 6. Recommended next steps (implementation)

1. Choose hosted Postgres and migration tool (e.g. `sqitch`, `flyway`, or Supabase migrations).
2. Phase 4: legal pages aligned with `consent_type` versions.
3. Phase 6: map Stripe webhook events → `payments` + `orders.status` + `loyalty_ledger` with idempotency.
