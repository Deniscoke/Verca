# VERCA — Project Context for LLM

> **How to use:** Paste this file at the start of a new ChatGPT / Claude / LLM conversation.
> It is the single source of truth about the project's architecture, files, and conventions.
> Last updated: 2026-04-11 (Stripe Checkout + webhook přidány).

---

## 1  Identity

```yaml
name:        "Verca — Jemná přírodní péče"
domain:      pelvic-floor therapy, bodywork, aromatherapy, herbal atelier
lang:        cs (Czech)
tone:        calm, warm, nature, trust, "presence"
palette:     cream → terracotta → forest/sage → wine/charcoal
deploy:      Vercel (auto-deploy on push to main)
vercel_url:  https://verca-omega.vercel.app   # site origin; PUBLIC_SITE_URL v .env bez /index.html
repo:        github.com/Deniscoke/Verca.git
build:       Vercel spustí `npm install` kvůli `stripe` v api/*; žádný bundler frontendu
```

---

## 2  File tree (production-relevant only)

```
VERCA/
│
├── index.html                          ← main landing (3 100+ lines, ALL CSS inline in <style>, GSAP anims, hero video, WebGL ocean, bloom canvas)
├── kontakt.html                        ← contact page + WebGL room bg
├── bylinny-atelier.html                ← herbal atelier, particles, sacred pattern
├── alchymie-vuni.html                  ← sub-page "Alchymie vůní"
├── esence-zeny.html                    ← sub-page "Esence ženy"
├── tajemstvi-panevniho-dna.html        ← sub-page "Tajemství pánevního dna"
│
├── css/
│   ├── verca-transitions.css           ← page-transition overlay themes (default / atelier / room)
│   ├── verca-room.css                  ← room/contact layout + #glcanvas
│   └── verca-atelier.css               ← atelier layout, particles, orbs
│
├── js/
│   ├── verca-perf-boot.js              ← FIRST script after <body>: sets .reduce-motion / .verca-lite on <html>
│   ├── verca-page-transition.js        ← cross-page fade (default / atelier / room themes)
│   ├── verca-ambient.js                ← shared background audio across pages (sessionStorage state)
│   ├── verca-ocean.js                  ← WebGL raymarched ocean (index only, full-mode only)
│   ├── verca-room-gl.js                ← WebGL room background (contact + sub-pages)
│   ├── verca-atelier-particles.js      ← atelier particle system
│   ├── verca-ui-scroll-effects.js      ← GSAP ScrollTo wheel smoothing + reveal pack (adapted from Juxtopposed demo)
│   └── verca-shop-config.js            ← /api/public-config + Stripe test tlačítko na ateliéru
│
├── images/                             ← hero video/poster, about portrait, section photos
│   ├── verca-hero-main.mov             ← primary hero video (QuickTime)
│   ├── verca-hero-boomerang.mp4        ← MP4 fallback
│   ├── IMG_0964.JPG                    ← hero poster / mobile preload
│   └── (other JPG/PNG assets)
│
├── audio/background-meditation.mp3     ← ambient loop
│
├── third-party/                        ← reference demos, NOT linked in production
│   ├── 10-simple-yet-cool-popular-effects-in-modern-ui-ft-gsap-color-blending-etc/
│   ├── ambient-background/
│   ├── ambient-particles.js
│   └── various LICENSE files
│
├── scroll-animation-with-grid-motion/  ← older reference demo, NOT linked
├── Context/                            ← design reference screenshots (PNG)
├── package.json                        ← závislost `stripe` pro serverless
├── package-lock.json
├── auth-callback.html                  ← návrat OAuth (Supabase)
├── api/                                ← Vercel Node functions
│   ├── public-config.js
│   ├── checkout/create-session.js      ← Stripe Checkout Session
│   ├── webhooks/stripe.js
│   └── …
├── GPT-KONTEXT-VERCA.md                ← THIS FILE
├── script.js                           ← EMPTY, not linked anywhere
└── style.css                           ← EMPTY, not linked anywhere
```

---

## 3  index.html — section order & IDs

```
#home          section.hero.hero--ocean     ← hero video/poster + WebGL ocean behind
#trust         div.trust                    ← trust strip (stats)
#philosophy    section.philosophy           ← quote + approach text + figure
#prostory      section.prostory             ← 4 cards linking to sub-pages
#services      section.services             ← 3 service cards (pelvic floor / aroma / atelier)
#experience    section.experience           ← "Co můžete čekat" — 3-step timeline in a card panel
(no id)        section.testimonials         ← 3 testimonials
#products      section.products             ← product showcase
#about         section.about                ← portrait + bio
#faq           section.faq                  ← accordion
#contact       section.contact              ← CTA block
               footer.footer                ← links + copyright
```

---

## 4  Design tokens (`:root` in index.html `<style>`)

```css
/* Core palette */
--cream:          #F5F3EF;      --cream-deep:     #EBE8E1;
--parchment:      #E5E2DA;      --parchment-dark: #D8D4CA;
--terracotta:     #B86447;      --terracotta-mid: #C97B5C;
--forest:         #2C3830;      --forest-mid:     #3D4A42;
--wine:           #3a3128;      --wine-mid:       #463c32;       --wine-deep: #241e19;
--charcoal:       #1A1816;
--text:           #2A2622;      --text-soft:      #5C564E;       --text-muted: #8A847C;

/* Typography */
--font-display:   'Fraunces';   /* serif headings */
--font-body:      'Nunito Sans';/* body */
--font-accent:    'Kalam';      /* handwritten accents */

/* Layout — golden-ratio based */
--phi: 1.618;  --max-w: 1200px;  --px: clamp(22px, 4.5vw, 56px);
--section-y: clamp(5.5rem, 12vw, 10rem);  --section-y-lg: clamp(6.5rem, 14vw, 12rem);
--gap-phi: clamp(1.125rem, 3.2vw, 2.618rem);
```

---

## 5  Performance tiers

| Class on `<html>` | When | Effect |
|-|-|-|
| `.reduce-motion` | `prefers-reduced-motion: reduce` | No GSAP anims, no bloom, no ocean parallax |
| `.verca-lite` | viewport ≤ 768 px OR save-data OR slow net | No WebGL ocean, no hero video autoload, no backdrop-filter, simpler reveals |

Set by `js/verca-perf-boot.js` synchronously before any rendering.

---

## 6  Script loading order (index.html)

```
1. js/verca-perf-boot.js          ← sync, first after <body>
2. js/verca-page-transition.js    ← sync
3. js/verca-ambient.js            ← defer
4. js/verca-ocean.js              ← dynamically injected (only if NOT verca-lite)
5. gsap.min.js                    ← CDN, defer
6. ScrollTrigger.min.js           ← CDN, defer
7. ScrollToPlugin.min.js          ← CDN, defer
8. js/verca-ui-scroll-effects.js  ← defer (exports vercaJuxtInitReveals + vercaJuxtSmoothWheel)
9. inline <script>                ← boot(): initNav, initJuxtSmoothWheel, initMagnetic, initHero,
                                     initReveals (→ vercaJuxtInitReveals), initHeroDayTrack,
                                     initProducts, initAbout, initFaq, initAnchors,
                                     initKontaktTransition
10. inline bloom canvas script    ← click-flower effect
```

---

## 7  Glass UI layer (WebGL ocean mode)

When `html:not(.verca-lite):not(.reduce-motion)`:
- `body` is `transparent`, WebGL ocean canvas visible behind.
- Every section gets semi-transparent `rgba(…)` background + `backdrop-filter: blur()`.
- Sections blend smoothly via gradient overlaps (negative margins, extended padding).

When `.verca-lite`: sections have **opaque** solid backgrounds, no blur.

---

## 8  Scroll & animation system

| Feature | Source |
|-|-|
| Wheel inertia (GSAP ScrollTo) | `verca-ui-scroll-effects.js → vercaJuxtSmoothWheel` (desktop, non-lite, non-touch) |
| Scroll reveals (fade+translate, reverse on scroll up) | `verca-ui-scroll-effects.js → vercaJuxtInitReveals` (toggleActions: `play none none reverse`) |
| Anchor click | GSAP `scrollTo` when wheel-smooth active, else native `scrollTo({behavior:'smooth'})` |
| Hero parallax | Inline GSAP — blob drift, video y-shift on scroll |
| Day/night track | `heroDayTrackFill` width = scroll progress, label cycles through Úsvit→Noc→Hlubina |
| Ocean sun arc | `verca-ocean.js` — `uS` uniform driven by scroll position |

---

## 9  Cross-page transitions & ambient audio

- **`verca-page-transition.js`** creates `#verca-transition` overlay, fades in before navigating, fades out on arrival.
- Theme chosen by path: `bylinny-atelier` → atelier, `kontakt/esence/tajemstvi/alchymie` → room, else → default.
- **`verca-ambient.js`** persists playback state + timestamp in `sessionStorage` (`vercaAmbientOn`, `vercaAmbientTime`). Key `vercaAmbientSkipResume` prevents auto-resume during page transition.
- Toggle button in nav: `#verca-ambient-toggle`.

---

## 10  Sub-pages pattern

All sub-pages (`kontakt.html`, `esence-zeny.html`, `tajemstvi-panevniho-dna.html`, `alchymie-vuni.html`) share:
- `css/verca-room.css` (centered content, `#glcanvas` full-bleed behind)
- `js/verca-room-gl.js` (WebGL — skips on verca-lite, adds `.no-webgl` for CSS fallback)
- Page-transition + ambient scripts

`bylinny-atelier.html` uses `css/verca-atelier.css` + `js/verca-atelier-particles.js` instead.

---

## 11  Key conventions

1. **No build step.** Edit files directly; push to `main` → Vercel deploys.
2. **CSS is inline** in index.html `<style>` (~2 000 lines). Sub-pages link external CSS.
3. **Fonts:** Google Fonts — Cormorant Garamond, Plus Jakarta Sans, Caveat (`subset=latin,latin-ext`).
4. **Images:** JPG/PNG in `images/`, hero videos MOV + MP4, lazy-loaded where applicable.
5. **Footer year:** `© 2026` — update annually.
6. **Sections use gradient overlaps** + negative margins for seamless transitions (no wave/fascia dividers).
7. **`third-party/`** and **`scroll-animation-with-grid-motion/`** are reference only — not linked in any HTML.

---

## 12  How to edit safely

```
1. Read this context file first.
2. Most visual changes → edit inline <style> in index.html.
3. Animation / scroll behaviour → js/verca-ui-scroll-effects.js or inline <script> in index.html.
4. After changes: test desktop (full mode) + mobile (verca-lite) + page transitions + ambient audio.
5. git add -A && git commit -m "..." && git push origin main   (auto-deploys to Vercel)
```

---

## 13  Pokračování práce (uloženo 2026-04-11)

### Co už je hotové (shrnutí)

- **Fáze 2–4:** `SECURITY.md`, `.env.example`, `api/` kostra; `docs/data-model.md`, `db/schema-proposal.sql`, právní HTML (`obchodni-podminky.html` atd.), `docs/compliance-mapping.md`, odkazy v patičce.
- **Supabase plán:** `docs/supabase-phase-a.md` (architektura; `public.users` vs `auth.users` — rozhodnout při migraci).
- **Env / nasazení:** `PUBLIC_SITE_URL` a související URL směřují na **`https://verca-omega.vercel.app`** (v `.env.example` + `GPT-KONTEXT`); lokální `.env` je v `.gitignore`.
- **E-shop UI (ateliér):** `/api/public-config`, sekce „E-shop a účet“ na `bylinny-atelier.html`, `auth-callback.html` pro návrat OAuth, `js/verca-shop-config.js`.
- **Stripe:** `package.json` + `stripe`; `POST /api/checkout/create-session` (allowlist `STRIPE_ALLOWED_PRICE_IDS` / `STRIPE_TEST_PRICE_ID`); `POST /api/webhooks/stripe` (podpis, raw body); tlačítko **Test platba (Stripe)**. **Objednávky do DB zatím neukládáme** — až Supabase + idempotence `webhook_events`.

### Kam příště — Supabase **anon key** (uživatel zatím nenašel)

1. Přihlásit se na [supabase.com](https://supabase.com) → otevřít **projekt**.
2. Dole vlevo **Project Settings** (ozubené kolo), nebo v novějším UI sekce **Settings** / **Configuration**.
3. Menu **API** (někdy „Data API“).
4. Blok **Project URL** = `SUPABASE_URL`.
5. Blok **Project API keys** — klíč označený jako **`anon`** a **`public`** (dlouhý JWT řetězec) = **`SUPABASE_ANON_KEY`**.  
   - **`service_role`** je tajný → jen Vercel serverless / `.env` server, nikdy do prohlížeče.
6. **Authentication → URL Configuration:** přidat redirect např. `https://verca-omega.vercel.app/auth-callback.html`.

Stejné hodnoty zkopírovat do **Vercel → Project → Settings → Environment Variables**.

### Otevřené kroky po získání klíčů

- Aplikovat SQL migraci z `db/schema-proposal.sql` (nebo upravit podle `auth.users`), zapnout **RLS**.
- Webhook Stripe doplnit o zápis `orders` / `payments` / `webhook_events`.
- Volitelně: `PUBLIC_GOOGLE_LOGIN_ENABLED=true` + Google provider v Supabase.

---

*Update this file when architecture changes significantly.*
