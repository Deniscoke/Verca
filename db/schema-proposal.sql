-- VERCA — proposed PostgreSQL schema (Phase 3)
-- Not executed by the repo. Review with counsel + chosen host (Neon / Supabase / etc.) before apply.
-- Conventions: UUID PKs, timestamptz, money in integer cents + currency text.

-- Extensions: gen_random_uuid() is built-in on PostgreSQL 13+.
-- Email columns use TEXT; normalize to lowercase in application code.

-- ---------------------------------------------------------------------------
-- users — authentication identity (optional; guests may have no row)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  email_verified_at  TIMESTAMPTZ,
  google_sub         TEXT UNIQUE,
  password_hash      TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'disabled', 'pending_verification')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;

COMMENT ON TABLE users IS 'Login identity only. No therapy or health notes.';
COMMENT ON COLUMN users.google_sub IS 'Google OAuth subject; optional login path.';

-- ---------------------------------------------------------------------------
-- customer_accounts — shop profile; may exist without user (user_id NULL)
-- ---------------------------------------------------------------------------
CREATE TABLE customer_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  primary_email   TEXT,
  display_name    TEXT,
  phone_e164      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_accounts_primary_email
  ON customer_accounts (primary_email)
  WHERE primary_email IS NOT NULL;

COMMENT ON TABLE customer_accounts IS 'E-commerce customer. Loyalty is computed from loyalty_ledger.';
COMMENT ON COLUMN customer_accounts.user_id IS 'NULL until customer registers or links OAuth.';

-- ---------------------------------------------------------------------------
-- products — atelier catalog (no health claims in structured fields)
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  currency          TEXT NOT NULL DEFAULT 'CZK' CHECK (char_length(currency) = 3),
  stripe_price_id   TEXT UNIQUE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  inventory_policy  TEXT NOT NULL DEFAULT 'none'
                    CHECK (inventory_policy IN ('none', 'finite', 'external')),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_note   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_active ON products (is_active) WHERE is_active = true;

COMMENT ON COLUMN products.compliance_note IS 'Internal SKU-level regulatory hints; not for public display by default.';

-- ---------------------------------------------------------------------------
-- orders — guest checkout: customer_account_id NULL + guest_email set
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number               TEXT UNIQUE,
  customer_account_id        UUID REFERENCES customer_accounts (id) ON DELETE SET NULL,
  guest_email                TEXT,
  guest_name                 TEXT,
  status                     TEXT NOT NULL DEFAULT 'pending_payment'
                             CHECK (status IN (
                               'draft',
                               'pending_payment',
                               'paid',
                               'fulfilled',
                               'cancelled',
                               'refunded'
                             )),
  currency                   TEXT NOT NULL DEFAULT 'CZK' CHECK (char_length(currency) = 3),
  subtotal_cents             INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents                  INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents             INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents                INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  shipping_address_json      JSONB,
  billing_address_json       JSONB,
  stripe_checkout_session_id TEXT UNIQUE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_contact_chk CHECK (
    customer_account_id IS NOT NULL OR guest_email IS NOT NULL
  )
);

CREATE INDEX idx_orders_customer ON orders (customer_account_id);
CREATE INDEX idx_orders_guest_email ON orders (guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

COMMENT ON TABLE orders IS 'Commercial orders only. No therapy session notes.';
COMMENT ON CONSTRAINT orders_contact_chk ON orders IS 'Guest checkout uses guest_email; accounts use customer_account_id.';

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  product_id       UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  sku_snapshot     TEXT NOT NULL,
  name_snapshot    TEXT NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  provider              TEXT NOT NULL DEFAULT 'stripe',
  provider_payment_id   TEXT NOT NULL,
  amount_cents          INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency              TEXT NOT NULL CHECK (char_length(currency) = 3),
  status                TEXT NOT NULL
                        CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  raw_provider_status   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX idx_payments_order ON payments (order_id);

COMMENT ON TABLE payments IS 'No card numbers; use Stripe for PCI scope.';

-- ---------------------------------------------------------------------------
-- bookings_reference — neutral scheduling / completion for optional loyalty
-- ---------------------------------------------------------------------------
CREATE TABLE bookings_reference (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_system        TEXT NOT NULL,
  external_id            TEXT NOT NULL,
  customer_account_id    UUID REFERENCES customer_accounts (id) ON DELETE SET NULL,
  session_completed_at   TIMESTAMPTZ,
  meta                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_system, external_id)
);

CREATE INDEX idx_bookings_reference_customer ON bookings_reference (customer_account_id);

COMMENT ON TABLE bookings_reference IS 'Neutral completion events only; no clinical or intimate notes in meta.';
COMMENT ON COLUMN bookings_reference.meta IS 'Non-sensitive keys only, e.g. service_code. No free-text therapy notes.';

-- ---------------------------------------------------------------------------
-- loyalty_ledger — append-only style; idempotency for webhook safety
-- ---------------------------------------------------------------------------
CREATE TABLE loyalty_ledger (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id   UUID NOT NULL REFERENCES customer_accounts (id) ON DELETE RESTRICT,
  delta_points          INTEGER NOT NULL,
  reason                TEXT NOT NULL
                        CHECK (reason IN (
                          'purchase',
                          'redemption',
                          'session_reward',
                          'manual_adjust',
                          'expiry'
                        )),
  reference_type        TEXT,
  reference_id          UUID,
  idempotency_key       TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_ref_pair_chk CHECK (
    (reference_type IS NULL AND reference_id IS NULL)
    OR (reference_type IS NOT NULL AND reference_id IS NOT NULL)
  )
);

CREATE INDEX idx_loyalty_ledger_customer_created ON loyalty_ledger (customer_account_id, created_at DESC);

COMMENT ON TABLE loyalty_ledger IS 'Separate from marketing consent. Points are not client-authoritative.';

-- ---------------------------------------------------------------------------
-- consents — GDPR-oriented; marketing vs loyalty vs terms as separate rows/types
-- ---------------------------------------------------------------------------
CREATE TABLE consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type    TEXT NOT NULL
                  CHECK (subject_type IN ('user', 'customer_account', 'email_only')),
  subject_id      UUID,
  email           TEXT,
  consent_type    TEXT NOT NULL,
  version         TEXT NOT NULL,
  granted         BOOLEAN NOT NULL,
  granted_at      TIMESTAMPTZ,
  withdrawn_at    TIMESTAMPTZ,
  source          TEXT NOT NULL,
  ip_hash         TEXT,
  user_agent_hash TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consents_subject_chk CHECK (
    (subject_type = 'email_only' AND email IS NOT NULL)
    OR (subject_type <> 'email_only' AND subject_id IS NOT NULL)
  )
);

CREATE INDEX idx_consents_subject ON consents (subject_type, subject_id);
CREATE INDEX idx_consents_email ON consents (email) WHERE email IS NOT NULL;
CREATE INDEX idx_consents_type_version ON consents (consent_type, version);

COMMENT ON TABLE consents IS 'Marketing and loyalty program terms are different consent_type values.';
COMMENT ON COLUMN consents.consent_type IS 'Examples: marketing_email, loyalty_program_terms, terms_of_sale, cookies_analytics.';

-- ---------------------------------------------------------------------------
-- webhook_events — idempotent Stripe (and future) processing
-- ---------------------------------------------------------------------------
CREATE TABLE webhook_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           TEXT NOT NULL DEFAULT 'stripe',
  event_id           TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  processing_status  TEXT NOT NULL DEFAULT 'received'
                     CHECK (processing_status IN ('received', 'processed', 'failed')),
  processed_at       TIMESTAMPTZ,
  error_message      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_webhook_events_status ON webhook_events (processing_status, created_at DESC);

COMMENT ON TABLE webhook_events IS 'Store full payloads off-table or encrypted if required; not by default here.';

-- ---------------------------------------------------------------------------
-- audit_log — admin/system actions; redact secrets in application layer
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'admin')),
  actor_id     TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

COMMENT ON TABLE audit_log IS 'No secrets or full card data in payload.';
