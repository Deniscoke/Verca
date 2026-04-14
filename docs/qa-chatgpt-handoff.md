# QA → ChatGPT → prompt pre Cursor

Tento dokument slúži na dva kroky: **(1)** zaznamenať QA (manuálne alebo po deployi), **(2)** v ChatGPT z neho nechať vygenerovať **jeden súvislý prompt** pre asistenta v Cursore.

---

## Ako to použiť (skrátene)

1. Vyplň sekciu **„QA záznam“** nižšie (riadky v tabuľke alebo JSON blok).
2. V ChatGPT najprv vlož blok **„Inštrukcia pre ChatGPT“**, potom **„Systémový kontext projektu“** a potom svoj **vyplnený QA záznam**.
3. Od ChatGPT chceš **iba jeden výstup**: markdown kódový blok s názvom `cursor-prompt` — ten skopíruješ do nového chatu v Cursore ako používateľskú správu.

---

## Inštrukcia pre ChatGPT (celý blok skopíruj ako prvý)

```
Si nástroj na transformáciu QA záznamu na jeden prompt pre kódovacieho asistenta (Cursor).

VSTUP: dostaneš (1) krátky systémový kontext projektu VERCA, (2) štruktúrovaný QA záznam (tabuľka alebo JSON) s nálezmi, závažnosťou a krokmi na reprodukciu.

ÚLOHA: Vygeneruj JEDNU používateľskú správu pre asistenta, ktorá:
- je v slovenčine alebo češtine (podľa jazyka QA);
- na začiatku má 2–3 vety kontextu (čo je projekt, čo sa práve testovalo);
- zoznam úloh zoradí podľa závažnosti: P0 (blokuje / právnické / bezpečnosť) → P1 → P2;
- ku každej úlohe uvedie: presné očakávanie vs. skutočnosť, kroky reprodukcie, ak známe súbory/stránky (napr. index.html, auth-callback.html), navrhni ich cesty;
- explicitne uvedie čo je mimo rozsahu (ak QA niečo nerieši);
- na konci uvedie „Definícia hotovo“: zrozumiteľné akceptačné kritériá.

FORMÁT ODPOVEDE (presne):
- Najprv krátke zhrnutie (max 5 viet) pre človeka.
- Potom JEDEN markdown fenced blok s jazykom markdown a „pseudo-filename“ v hlavičke: ```cursor-prompt
  (vnútri bloku je čistý text promptu pre Cursor, bez ďalších vnorených blokov kódu ak sa dá vyhnúť)

Nepridávaj vlastné QA nálezy, ktoré nie sú vo vstupe. Ak je vstup nejasný, v zhrnutí uveď 1–3 otázky na doplnenie a v bloku cursor-prompt stále urob rozumný plán s predpokladmi označenými ako „PREDPOKLAD:“.
```

---

## Systémový kontext projektu (doplň URL po deployi)

- **Projekt:** VERCA — marketing / rezervačný web (statické HTML + JS, Supabase podľa `docs/`).
- **Hlavná stránka:** `index.html` (navigácia, sekcie, GSAP kotvy, scroll-spy v inline skripte).
- **Auth / shop:** `auth-callback.html`, `js/verca-shop-config.js` (podľa aktuálnej štruktúry repo).
- **Deploy:** často Vercel; po merge na `main` overiť produkčnú URL (doplň sem):

**Produkčná / staging URL na test:** `___________________________`

**Build / commit (voliteľné):** `___________________________`

---

## QA záznam — šablóna (tabuľka)

| ID | Oblast | Závažnosť (P0/P1/P2) | Kroky na reprodukciu | Očakávané správanie | Skutočnosť | Prostredie (prehliadač, zariadenie) |
|----|--------|----------------------|----------------------|---------------------|------------|-------------------------------------|
| QA-001 | | | | | | |

**Poznámky / screenshoty (linky):**

-

---

## QA záznam — strojovo čitateľný variant (JSON, voliteľné)

ChatGPT zvládne aj tento formát; môžeš ho generovať z tabuľky.

```json
{
  "project": "VERCA",
  "environment": { "url": "", "browser": "", "viewport": "" },
  "findings": [
    {
      "id": "QA-001",
      "area": "",
      "severity": "P1",
      "steps": [],
      "expected": "",
      "actual": ""
    }
  ]
}
```

---

## Príklad vyplneného behu (môžeš zmazať alebo nahradiť vlastným)

| ID | Oblast | Závažnosť | Kroky na reprodukciu | Očakávané správanie | Skutočnosť | Prostredie |
|----|--------|-----------|----------------------|---------------------|------------|-------------|
| QA-NAV-01 | Hlavná navigácia — zvýraznenie sekcie pri scrollovaní | P1 | Otvor `index.html`; klikni „O mně“; počkaj na dokončenie scrollu; sleduj horné menu. | Podčiarknutie / `is-active` zodpovedá sekcii „O mně“, nie inej položke. | (Pred opravou) zvýraznený bol nesprávny odkaz (napr. Ateliér). Po oprave: zladiť s kotvou `NAV_ANCHOR_GAP` a `getBoundingClientRect` pre pozície sekcií. | Desktop Chrome |

**Stav po úprave kódu (pre referenciu QA):** v `index.html` je scroll-spy v `initNav()` zosúladený s `initAnchors()` cez `NAV_ANCHOR_GAP` a dokumentové Y cez `sectionDocTop`.

---

## Návrh ďalších oblastí na QA (checklist — neškrtaj, len dopĺňaj výsledok)

- [ ] Vstupná brána (`verca-entry-gate`) — zatvorenie, focus, scroll
- [ ] Kotvy v menu a mobilnom draweri
- [ ] `reduce-motion` / `verca-lite` — či sa stránka dá ovládať a čítať
- [ ] Kontakt / prechod na `kontakt.html`
- [ ] OAuth návrat (`auth-callback.html`) — happy path a chybové hlášky
- [ ] Mobilné menu (hamburger, `aria-expanded`)
- [ ] Lighthouse alebo základná a11y (kontrast, alt texty) — voliteľné

Po vyplnení tabuľky vždy spusť workflow: **inštrukcia pre ChatGPT → kontext → QA záznam → skopíruj `cursor-prompt` do Cursoru**.
