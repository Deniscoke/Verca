# Esencia Viva (web Verca) — SEO informácie pre release

## Branding (FINAL)
- **Značka (web)**: Esencia Viva
- **Zakladateľka / terapeutka**: Verca
- **Pattern**: dual-branding (Goop by Gwyneth Paltrow, Honest by Jessica Alba)
  - Public-facing brand → **Esencia Viva** (logo, title, meta, footer, copyright)
  - Person voice → **Verca** (About sekcia, signatúra „S péčí, Verca", testimonialy, kontakt)

## Doména
- **Plánovaná**: esenciaviva.cz (kúpa 15. mája 2026)
- **Aktuálna (preview)**: verca-omega.vercel.app

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

## Email
- Aktuálny default: hello@verca.care (z .env)
- **Po release**: nastaviť na esenciaviva.cz email (napr. verca@esenciaviva.cz alebo hello@esenciaviva.cz)

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

