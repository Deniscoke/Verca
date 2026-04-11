# VERCA — security & operations (draft)

This document supports engineering and **lawyer review** of processes. It is **not** a guarantee of compliance; operational and legal obligations depend on your setup, contracts, and jurisdiction (Czech Republic + EU).

---

## 1. Secret handling

| Rule | Detail |
|------|--------|
| **Never in the browser** | Do not put Stripe secret keys, webhook secrets, Google client secrets, DB passwords, or admin credentials in static HTML, inline scripts, or public JS bundles. |
| **Vercel** | Store secrets in **Vercel → Project → Settings → Environment Variables**. Use separate values for Preview vs Production where appropriate. |
| **Local** | Use a local `.env` file (gitignored). Start from `.env.example` (placeholders only). |
| **Rotation** | Plan rotation for any leaked or departing-staff scenario: Stripe keys, webhook signing secret, OAuth client secret, DB credentials, JWT signing secret. |
| **Principle of least privilege** | DB users for the app should not have destructive admin rights unless required for migrations (often a separate migration role). |

---

## 2. Stripe webhooks

| Rule | Detail |
|------|--------|
| **Verify signature** | Use Stripe’s signing secret (`STRIPE_WEBHOOK_SECRET`) and the official SDK/helper with the **raw** request body. Do not trust JSON parsed before verification. |
| **Idempotency** | Store processed event IDs (e.g. in `webhook_events`) and skip duplicates. Payment and order state must survive retries. |
| **Source of truth** | Final payment and order status come from **webhooks + server-side reconciliation**, not from client query parameters alone after redirect. |
| **SCA / 3-D Secure** | Use Checkout or Payment Element flows that handle authentication; still confirm outcome via webhook. |

Implementation stub: `api/webhooks/stripe.js` (not active until configured).

---

## 3. Authentication boundaries

| Concern | Guidance |
|---------|----------|
| **Sessions** | Prefer **httpOnly, Secure, SameSite** cookies for session tokens; avoid storing long-lived secrets in `localStorage`. |
| **Google login** | Must remain **optional**; support guest checkout without OAuth. |
| **Callbacks** | OAuth callback handlers must run **only** on the server, validate `state`, and exchange codes with client secret server-side. |
| **CSRF** | For cookie-based sessions on mutating routes, use CSRF tokens or SameSite cookies + strict origin checks as appropriate to your flow. |

Stubs: `api/auth/google/callback.js`, `api/account/me.js`.

---

## 4. Sensitive data separation (shop vs health context)

| Store in **e-commerce / account** tables | Do **not** store there |
|-------------------------------------------|-------------------------|
| Order lines, amounts, shipping contact, consent IDs for purchase/marketing (as designed) | Therapy notes, intimate health details, diagnosis-like data |
| Neutral loyalty triggers, e.g. `session_completed` / external reference ID | Clinical narratives tied to shop user ID |

If health-related processing exists under GDPR, it may need **separate legal basis, retention, and DPA** with processors — align with legal counsel.

---

## 5. Rate limiting & abuse

Serverless endpoints should be protected before production:

- **Stripe checkout creation**: per-IP and/or per-session limits to reduce spam session creation.
- **Webhooks**: allow only Stripe IPs or rely on signature verification (primary control).
- **Auth endpoints**: strict rate limits and lockout policies as appropriate.

Implement via Vercel Firewall, edge middleware, or upstream WAF — product choice is a business decision.

---

## 6. Logging & audit

| Do | Avoid |
|----|--------|
| Log structured events with correlation IDs for checkout, webhook receipt, auth success/failure | Logging full card numbers, full webhook payloads with PII, passwords, or session secrets |
| Retain **audit_log** (see future schema) for security-relevant actions | Indefinite retention without a policy — align retention with GDPR and business need |

---

## 7. Incident handling (basics)

1. **Detect**: monitoring on 5xx spikes, webhook failures, auth anomalies.
2. **Contain**: rotate compromised secrets, disable affected keys in Stripe/Google dashboards.
3. **Assess**: scope of data exposure; GDPR breach notification may be required — **consult legal counsel**.
4. **Recover**: restore from backup if needed; replay failed webhooks from Stripe dashboard if safe.
5. **Document**: short internal post-incident note and remediation.

---

## 8. Dependency & supply chain

When `package.json` is introduced for Stripe SDK or DB clients:

- Pin major versions and review changelogs for security releases.
- Run `npm audit` (or equivalent) in CI before deploy.

---

## 9. Related files

- `.env.example` — variable names only (no real values).
- `api/` — serverless stubs; no secrets in repo.
