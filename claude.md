# Brevis

Interní systém pro řízení studia ŠG. Projekty, výkazy práce, ziskovost, peníze.

**Než na něco sáhneš, přečti si:**
- `PRD.md` — co systém je a **podle jakých pravidel počítá peníze**
- `STANDARDS.md` — jak se sem píše kód

Ta dvě pravidla z PRD, která se nejčastěji poruší omylem: **cena projektu se
nesčítá ze tří košů** (design v hodinách, PM v penězích, SLA mimo ziskovost)
a **zisk se počítá až u uzavřeného projektu**.

## Zásobník

Vanilla JS (ES moduly), žádný build, žádný framework. Supabase (Postgres + RLS),
přihlášení přes Google. Nasazeno na GitHub Pages.

## Jak se tu pracuje

- **Nejdřív pochopit, co už existuje**, pak teprve měnit.
- **Malé úpravy před přepisy.** Architekturu zachovat, pokud není silný důvod.
- **Žádné knihovny navíc**, dokud to není jasně odůvodněné.
- **Používat, co už tu je** — vzory, pomocné funkce, styly.
- **Nevymýšlet UX.** Radši doslovné a viditelné než chytré a skryté.
- Držet to **husté, praktické a rychlé na přečtení**.

### Nový modul

1. `supabase/migrations/00X_….sql` — tabulka **i s RLS** v jedné migraci
2. Řekneš mi, že jsi migraci spustil → **od té chvíle je zamčená**, další změna
   tvaru je nová migrace s `alter table`
3. `store.js` (databáze) → `model.js` / `logic.js` (čistý výpočet) → `index.js` (UI)
4. Zapsat do `src/modules/registry.js`
5. Testy na výpočet, řádek do `supabase/tests/rls.sql`, oddíl do `docs/TESTPLAN.md`

### Před commitem

```
npm test
```

Před nasazením větší změny navíc projít `docs/TESTPLAN.md` (~45 min).

## Vývoj

Dev server se spouští sám při startu Claude (hook v `.claude/settings.local.json`),
běží na http://localhost:5173/. Když neběží, `npm run dev`.

## Bezpečnost

- **Kontroly v prohlížeči jsou kosmetika.** Skutečnou hranicí je RLS v databázi.
  Nová tabulka bez politiky je díra.
- **Escapovat na hranici** — `esc()` na každý cizí text. Ve `wiki/markdown.js`
  se escapuje *první*, značky se vkládají až potom; prohodit to znamená XSS.
- Nečíst `.env`. Nevypisovat tajemství. Nehardcodovat přihlašovací údaje.
  (Anon klíč v `src/config.js` je publishable a je v pořádku, že je v repu —
  chrání ho RLS, ne utajení.)
- U destruktivních zásahů do dat se nejdřív zeptat.

## Jak odpovídat

- Stručně.
- Napsat, co se změnilo.
- Napsat, co si mám ověřit ručně.
- Nevysvětlovat věci, na které jsem se neptal.
