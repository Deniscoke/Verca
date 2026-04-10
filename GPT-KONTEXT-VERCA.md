# VERCA — kontext projektu (pre GPT a konzultácie)

**Ako to použiť:** Pri novej konverzácii v ChatGPT (alebo inom LLM) napíš napr. *„Mám statický web Verca, priložím súbor GPT-KONTEXT-VERCA.md z repa — drž sa ho pri úpravách.“* a skopíruj obsah tohto súboru alebo ho pripoj ako prílohu. Tento text je zdroj pravdy o štruktúre, súboroch a správaní stránok.

---

## Čo je projekt

**Verca — Gentle Natural Care** (na webe prezentované ako *jemná přírodní péče*): péče o pánevní dno, tělo, aromaterapie, bylinný ateliér. Tón: klid, důvěra, příroda, „přítomnost“ — vizuálne teplé farby (krémová, terakota, med/zlato pri fascia/experience).

- **Jazyk obsahu stránok:** čeština (`lang="cs"`).
- **Formát:** statické HTML + externé CSS/JS, **bez** npm/build/bundlera (žiadny `package.json` v koreni).

---

## Mapa stránok (HTML vstupy)

| Súbor | Účel |
|--------|------|
| `index.html` | Hlavná dlhá landing stránka (väčšina CSS inline v `<style>`, GSAP animácie, hero video, WebGL „ocean“, bloom canvas). |
| `kontakt.html` | Kontakt + WebGL pozadie (`verca-room-gl.js`). |
| `bylinny-atelier.html` | Bylinný ateliér — orby, particles.js, sacred pattern (`verca-atelier.css`, `verca-atelier-particles.js`). |
| `alchymie-vuni.html`, `esence-zeny.html`, `tajemstvi-panevniho-dna.html` | Podstránky „prostorů“ / služieb — rovnaký room layout + WebGL ako kontakt. |

Všetky uvedené stránky majú **prechody medzi stránkami** (`verca-page-transition.js`) a zdieľaný **ambient audio** (`verca-ambient.js`), ak je na stránke prítomný `<audio id="verca-ambient-audio">`.

---

## Kľúčové súbory (kde čo meniť)

```
VERCA/
├── index.html                 ← hlavná stránka, design tokeny :root, sekcie, väčšina CSS
├── kontakt.html
├── bylinny-atelier.html
├── alchymie-vuni.html
├── esence-zeny.html
├── tajemstvi-panevniho-dna.html
├── GPT-KONTEXT-VERCA.md       ← tento súbor
├── css/
│   ├── verca-transitions.css  ← overlay prechodov, témy default/atelier/room
│   ├── verca-room.css         ← layout kontakt + miestnosti + #glcanvas
│   └── verca-atelier.css      ← bylinný ateliér, particles container, orby
├── js/
│   ├── verca-perf-boot.js     ← hneď po <body>: reduce-motion + verca-lite
│   ├── verca-page-transition.js
│   ├── verca-ambient.js
│   ├── verca-ocean.js         ← WebGL ocean (len index, ak sa načíta)
│   ├── verca-room-gl.js       ← WebGL pozadie room/kontakt
│   └── verca-atelier-particles.js
├── images/                    ← hero poster/video, about, atď.
├── audio/                     ← background-meditation.mp3 (ambient)
├── script.js                  ← NEPATRÍ k produkčnému webu (Motion demo, nepripojené)
├── scroll-animation-with-grid-motion/   ← starší demo priečinok
└── third-party/               ← experimenty / staré demo (napr. ambient-background)
```

---

## Poradie skriptov (dôležité pre chyby typu „nefunguje prechod / audio“)

Na stránkach s prechodom je **prvé** v `<body>`:

1. `js/verca-perf-boot.js` — musí byť pred ostatným, aby sa `verca-lite` / `reduce-motion` nastavili skoro.
2. `js/verca-page-transition.js`
3. Ďalej štruktúra stránky, potom často `verca-ambient.js` (na `index.html` môže byť `defer`).

**Index navyše:** GSAP 3 + ScrollTrigger z CDN (`defer`), inline logika volá `initHero`, podmienene vkladá `verca-ocean.js`.

---

## Výkon a mobil (`verca-lite` + `reduce-motion`)

**`js/verca-perf-boot.js`** na `<html>` pridá:

- **`reduce-motion`** — ak `prefers-reduced-motion: reduce`.
- **`verca-lite`** — ak narrow viewport **(max-width: 768px)** ALEBO `navigator.connection.saveData` ALEBO `effectiveType` je `2g` / `slow-2g`.

**Pri `verca-lite` na indexe (stručne):** bez načítania WebGL ocean skriptu, hero často statický obrázok namiesto videa, menej náročné efekty (žiadny backdrop-filter na hero obsahu podľa úprav, zjednodušené vrstvy). **Bloom** a **ocean** canvas sú skryté / neinicializované podľa inline podmienok v `index.html` a súvisiacich CSS pravidiel.

**Pri `verca-lite` na podstránkach:**

- `verca-room-gl.js` — skončí hneď, `body` dostane `no-webgl` (statický fallback z CSS).
- `verca-atelier-particles.js` — vôbec nespustí particles; v CSS je `#particles-js` skrytý a orby bez animácie.

**Fonty (index):** Fraunces, Nunito Sans, Kalam — Google Fonts s `subset=latin,latin-ext`. **Preload** hero obrázka pre úzke displeje: `images/IMG_0964.JPG`.

---

## Koordinácia ambientu a prechodu stránok

- `verca-page-transition.js` pred navigáciou nastaví v `sessionStorage` kľúč **`vercaAmbientSkipResume`** (aby cieľová stránka **nehneď** znova nespúšťala autoplay po fade — používateľský zámer).
- `verca-ambient.js` tento kľúč číta, po spracovaní ho maže; stav prehrávania a čas drží v `sessionStorage` (`vercaAmbientOn`, `vercaAmbientTime`).
- Interné odkazy nesmú „kradnúť“ prvý gesture len kvôli audio — logika je upravená tak, aby neblokovala bežné kliky na navigáciu.

---

## Prechody — témy farieb

`themeForPath` v `verca-page-transition.js`: cesty obsahujúce `bylinny-atelier` → téma **atelier**; `kontakt`, `esence`, `tajemstvi`, `alchymie` → **room**; inak **default**. Overlay používa triedy z `css/verca-transitions.css`.

---

## Hlavné assety (index)

- **Hero video:** `images/verca-hero-boomerang.mp4` (poster / fallback obrázok `images/IMG_0964.JPG`). Načítanie videa sa rieši až keď nie je lite a nie je reduce-motion (funkcia `initHeroVideoLoad` v inline skripte).
- **About:** `images/verca-about.png`.
- Sekcia **experience** môže mať posvätnú geometriu na pozadí (bez veľkej fotky — podľa poslednej úpravy v HTML).

---

## Dizajn tokeny (`index.html` — `:root`)

Kľúčové farby: `--cream`, `--terracotta*`, `--forest*`, fascia/experience **med / medová** (`--fascia-honey`, `--fascia-bronze`, …). Písmo: `--font-display` (Fraunces), `--font-body` (Nunito Sans), akcent Kalam. Zlatý rez ako `--phi` pre medzery a šírku prose.

---

## Čo **nie** je súčasťou produkčného webu

- **`script.js`** v koreni — Motion/ESM demo, selektory nezodpovedajú `index.html`, **nie je** linknutý.
- **`scroll-animation-with-grid-motion/`** a **`third-party/`** — referenčné / experimentálne.

---

## Poznámky pre úpravy

- Po zmene skriptov skontrolovať **mobil + desktop** a **prechod medzi dvoma stránkami** + ambient.
- Footer rok na indexe: aktuálne **© 2026** (pri ročnej údržbe aktualizovať).
- Lighthouse / reálne zariadenie: overiť hero autoplay na desktope a lite režim na telefóne.

---

## Jednovetné zhrnutie

**Verca je viacstránkový statický web v češtine s prechodmi, zdieľaným ambientom, GSAP 3 na indexe, WebGL oceanom (len „plný“ režim na indexe) a WebGL/particles na podstránkach; na mobile a pomalých sieťach `verca-lite` vypína najťažšie efekty.**

---

*Tento súbor slúži na konzultácie a kontinuitu práce — pri väčších zmenách architektúry ho prosím aktualizuj.*
