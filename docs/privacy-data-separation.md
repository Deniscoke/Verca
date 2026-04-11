# VERCA — privacy & data separation (commerce vs sensitive context)

**Status:** engineering and privacy-by-design guidance for **lawyer review** (Czech Republic + EU). Not legal advice.

---

## 1. Two domains

| Domain | Purpose | Typical legal framing (confirm with counsel) |
|--------|---------|-----------------------------------------------|
| **A — Commerce & account** | Orders, payments, shipping, optional account, loyalty mechanics, marketing **consent records** | E-contract, consumer law, GDPR (contract / legitimate interests where applicable) |
| **B — Sensitive / therapy context** | Anything that could reveal health, intimate body practices, or therapeutic notes | GDPR **Article 9** special categories may apply; higher bar for processing and documentation |

**Rule:** Schema in `db/schema-proposal.sql` implements **domain A only**. Domain B must not reuse the same tables for clinical or intimate notes.

---

## 2. What belongs in commerce tables (`users`, `customer_accounts`, `orders`, …)

- Identity needed to sell and deliver: name, email, address, phone for shipping.
- Order lines, prices, tax/shipping snapshots.
- Payment references from Stripe (ids, amounts, status) — not full payment method details.
- Loyalty points ledger keyed to `customer_accounts` with **neutral** references (order id, booking completion id).
- Consent rows: what was accepted, which version, when — for GDPR accountability.

---

## 3. What must NOT go into commerce tables

- Diagnoses, symptoms, treatment plans, pelvic-floor specifics, or any **free-text therapy session notes** tied to shop identity.
- Intimate photographs or measurements collected in a therapeutic context.
- Combining therapy notes with `customer_account_id` in the same row as marketing preferences **without** explicit legal basis and DPA design.

If product copy on the public site describes wellness generically, that is **marketing content**, not special-category data about an identifiable individual.

---

## 4. Session-based loyalty (neutral events only)

Allowed in **commerce** schema:

- `bookings_reference.session_completed_at` populated when your scheduling process marks completion.
- `loyalty_ledger.reason = session_reward` with `reference_type = 'booking_reference'` and `reference_id` pointing to `bookings_reference.id`.

**Not allowed** in those rows:

- Narrative notes (“client discussed …”).
- Health outcomes or body-specific details.

If a future system stores clinical notes, use:

- **Separate database or schema** with stricter access controls, **or**
- A dedicated application with role-based access and **no** foreign key from `orders` to clinical tables.

---

## 5. Loyalty vs marketing consent

| Mechanism | Consent? |
|-----------|----------|
| **Earning/redeeming points** tied to purchases or neutral session completion | Usually contractual / program terms — record `consent_type = loyalty_program_terms` or equivalent at enrollment. |
| **Email/SMS campaigns, newsletters** | **Separate** `consent_type = marketing_email` (opt-in where required). |

Do not treat account creation as marketing consent. Do not block guest checkout on marketing opt-in.

---

## 6. Guest checkout

- `orders` with `guest_email` and NULL `customer_account_id` is valid.
- If the same person later registers, **merge strategy** is a business/legal decision: link orders by verified email, create `customer_accounts`, backfill `customer_account_id` in application code with audit entries.

---

## 7. Google OAuth (optional)

- `users.google_sub` links OAuth identity; `customer_accounts.user_id` links shop profile.
- Avoid pulling unnecessary scopes from Google; store only what you need for login and account recovery.

---

## 8. Retention & erasure (operational, not automated here)

Document in privacy policy (Phase 4):

- How long orders/invoices are kept (often statutory for accounting).
- How loyalty and consent history are kept for disputes.
- How erasure requests interact with legal retention (GDPR Article 17(3)(b)).

Engineering: prefer **soft-delete** flags on `users` / `customer_accounts` where full delete is blocked by law.

---

## 9. Processors (Stripe, hosting, email)

Maintain a **processor list** in the public privacy policy with purposes and locations. Subprocessors of Stripe follow Stripe’s DPA.

---

## 10. Checklist before launch

- [ ] Counsel confirms Article 9 relevance for any health-adjacent processing.
- [ ] No therapy notes in commerce DB verified by schema review + app code review.
- [ ] Marketing vs loyalty consents distinguished in UI and `consents` rows.
- [ ] Webhook and audit logging avoid card numbers and unnecessary special-category data.
