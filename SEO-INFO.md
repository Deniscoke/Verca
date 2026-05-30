# Esencia Viva (web Verca) — SEO informácie pre release

## Branding (FINAL)
- **Značka (web)**: Esencia Viva
- **Zakladateľka / terapeutka**: Verca
- **Pattern**: dual-branding (Goop by Gwyneth Paltrow, Honest by Jessica Alba)
  - Public-facing brand → **Esencia Viva** (logo, title, meta, footer, copyright)
  - Person voice → **Verca** (About sekcia, signatúra „S péčí, Verca", testimonialy, kontakt)

## Doména
- **Kúpená a nasadená**: esenciaviva.cz (cez Vercel)
- **Preview**: verca-omega.vercel.app

## Sociálne siete
- **Facebook**: https://www.facebook.com/share/14cC5gyEwkf/
  - (príprava krátkeho FB handle pre OG tagy)
- **Instagram**: TODO — opýtať sa Vercy
- **Google Business Profile**: TODO — vytvoriť po kúpe domény

## E-shop status
- Bylinný ateliér (`bylinny-atelier.html`) — **skrytý pred releasom**
- Verejne sa zobrazuje "Brzy otevíráme ateliér" / "Ateliér připravujeme"
- Stránka má `<meta name="robots" content="noindex, nofollow">`
- Backend (Stripe checkout, Supabase) zostáva pripravený a funkčný pre testovanie

## Email a kontaktný formulár (Resend)
- **Verejný kontaktný e-mail**: verca@esenciaviva.cz (mailto odkazy, pätička)
- **Formulár → Resend**: endpoint `/api/contact/message` posiela e-mail cez Resend.
  Potrebné Vercel env premenné (Production):
  - `RESEND_API_KEY` — API kľúč z Resendu (`re_…`)
  - `CONTACT_FROM_EMAIL` — odosielateľ, napr. `formular@esenciaviva.cz`
    (doména `esenciaviva.cz` musí byť **overená v Resende cez DNS** — SPF + DKIM)
  - `CONTACT_TO_EMAIL` — kam chodia správy = Verkina schránka
    **(drží sa LEN vo Vercel env, NIKDY nie v repe — osobné PII)**
- `reply_to` = e-mail návštevníka → Verca odpovedá priamo cez „Odpovedať".
- Po pridaní/zmene env premenných je nutný **redeploy**, inak sa neprejavia.
- Bez nastavenia vráti API stav `501 not_configured` (formulár ostáva neaktívny).

## Rezervačný systém (vlastný kalendár — nahradil Calendly)
- **Calendly odstránené** (platené pri viacerých udalostiach). Vlastný systém na Supabase + Resend.
- **DB tabuľky** (projekt „Verca", `mdryspqjpfcumedwtgzf`): `booking_slots` (dostupnosť) + `bookings` (žiadosti, vrátane PII). Schéma vo verzii: `db/booking-system.sql`.
- **API**: `GET /api/booking/availability` (voľné termíny), `POST /api/booking/request` (žiadosť → slot sa hneď zablokuje), `GET/POST /api/booking/decide?token=…` (Verca potvrdí/zamietne).
- **Tok**: klient vyberie termín → slot sa zablokuje (pending) → Verca dostane e-mail s odkazom → potvrdí (confirmed) alebo zamietne (declined → slot sa uvoľní). Klient dostane e-mail o prijatí aj o potvrdení.
- **Env premenné** (Production): rovnaké ako kontaktný formulár — `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` (Verkina schránka) + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (zápis do DB) + `PUBLIC_SITE_URL` (odkazy v e-maile). Bez DB env vráti API `503 not_configured` a web ukáže výzvu napísať cez formulár.
- **Pridať ďalšie termíny**: insert do `booking_slots` (vzor na konci `db/booking-system.sql`). Dostupnosť 2026: štvrtky 14:45 / 16:00 / 18:00.
- **Seed jún 2026**: 4./11./18./25. 6.; obsadené (blocked) 4. 6. 14:45 a 11. 6. 18:00.

## Lokalita (TODO — opýtať sa Vercy)
- Mesto: ?
- Adresa pre Google Maps: ?
- Telefón: ?
- Otváracie hodiny: ?

## Analytika (TODO — vybrať)
- [ ] Vercel Web Analytics (zadarmo, GDPR-friendly)
- [ ] Plausible (~9€/mes)
- [ ] Google Analytics 4 (potrebuje cookie consent banner)

