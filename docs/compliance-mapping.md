# VERCA — compliance mapping (documents ↔ data model)

**Purpose:** Align public legal document **versions** with internal consent / policy tracking (`consents.version`, `consent_type` in the Phase 3 schema proposal). For lawyer and engineering handoff.

**Not legal advice.** Update this file whenever a document version changes.

---

## 1. Public HTML documents (slug → suggested `consent_type` / reference key)

| Page file | Document code (suggested) | Example `consent_type` / notes |
|-----------|---------------------------|--------------------------------|
| `obchodni-podminky.html` | `OP-DRAFT-0.1` | `terms_of_sale` — acceptance at checkout / account |
| `ochrana-osobnich-udaju.html` | `ZOOU-DRAFT-0.1` | informational + link; not always a “consent”; record **acknowledgement** if required by counsel |
| `cookies.html` | `COOKIES-DRAFT-0.1` | `cookies_analytics`, `cookies_marketing` as separate consents if used |
| `reklamace-a-vraceni.html` | `REK-DRAFT-0.1` | part of consumer information; may pair with `terms_of_sale` |
| `odstoupeni-od-smlouvy.html` | `ODST-DRAFT-0.1` | pre-contractual information; link from checkout |
| `podminky-vernostniho-programu.html` | `VERN-DRAFT-0.1` | `loyalty_program_terms` — **separate from** `marketing_email` |

---

## 2. Separation rules (recap)

- **Guest checkout:** `orders` without `customer_accounts` / `users`; still store `consents` with `subject_type = email_only` where applicable.
- **Google login optional:** `users.google_sub` populated only after OAuth; no requirement to link for purchase.
- **Loyalty vs marketing:** `loyalty_program_terms` ≠ `marketing_email`; UI and DB rows must reflect both independently.
- **Therapy / health:** not stored in commerce `consents` rows for clinical content; if special-category processing exists, separate legal basis and documentation (outside this mapping).

---

## 3. Stripe / payments

- No `consent_type` for “payment success”; payment state lives in `payments` + `webhook_events`.
- Pre-checkout: link to terms + privacy + withdrawal info as required for B2C distance contracts (confirm with counsel).

---

## 4. Version bump checklist

1. Edit HTML `verca-legal-meta` version string.
2. Update this file’s table.
3. Application: when recording new acceptances, use **new** `version` string so old acceptances remain auditable.

---

## 5. Launch blockers (compliance-related)

- Replace all `[placeholders]` in legal HTML with real seller data.
- Add cookie banner + prior blocking of non-essential scripts (if any).
- Align refund / withdrawal timelines with current Czech law and product categories (cosmetics, custom goods).
