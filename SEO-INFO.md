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

## Calendly
- **POZOR**: aktuálne URL `denis-mitrovi/new-meeting` je vývojársky účet
- **Pred release**: nahradiť skutočným Verkiným Calendly URL
- Súbor: `kontakt.html`, riadok ~9: `<meta name="verca:calendly" content="...">`

## Lokalita (TODO — opýtať sa Vercy)
- Mesto: ?
- Adresa pre Google Maps: ?
- Telefón: ?
- Otváracie hodiny: ?

## Analytika (TODO — vybrať)
- [ ] Vercel Web Analytics (zadarmo, GDPR-friendly)
- [ ] Plausible (~9€/mes)
- [ ] Google Analytics 4 (potrebuje cookie consent banner)

