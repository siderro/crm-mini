# Standardy — jak se sem píše

Doménová pravidla (co se počítá a proč) jsou v `PRD.md`. Tady je, **jak** se to píše.

Většina těchhle pravidel vznikla z něčeho, co se pokazilo. U každého je napsané
proč — pravidlo bez důvodu se stejně dřív nebo později poruší.

---

## Architektura

```
index.html
 └─ src/app.js            přihlášení, kostra, hash router
     ├─ src/session.js    kdo je přihlášený a kam smí
     ├─ src/supabase.js   klient (líný) + unwrap()
     ├─ src/util.js       esc, formátování, guard
     └─ src/modules/
         ├─ registry.js   seznam modulů, které jde rozdávat
         └─ <modul>/
             ├─ index.js     UI a obsluha
             ├─ store.js     čtení a zápis do Supabase
             ├─ model.js     pojmy a čisté funkce (nezná databázi)
             └─ logic.js     výpočty modulu (nezná DOM)
```

**Jeden modul = jedna věc.** Když se do modulu začne cpát druhá agenda, patří
vedle, ne dovnitř.

---

## Kontrakt modulu

```js
export const modul = {
  id: 'moje-vec',          // malá písmena a pomlčky; je to i kus URL a klíč práv
  label: 'Moje věc',       // do navigace a na dlaždici
  desc: 'K čemu to je',    // jeden řádek pod název

  levels: true,            // volitelně: rozlišuje čtení a editaci
  settings: true,          // volitelně: patří do Nastavení, ne do hlavní navigace
  superadminOnly: true,    // volitelně: nedá se nikomu zapnout

  render(mount, subPath, ctx) {},   // povinné; ctx = { email, canEdit }

  tileInfo() {},           // volitelně: { badge, alert } na dlaždici hubu
  renderTile(el) {},       // volitelně: vlastní obsah dlaždice (místo tileInfo)
  renderMini(el) {},       // volitelně: připomínka v hlavičce
};
```

Pravidla, která hlídá `tests/modules.test.js`:

- `tileInfo` a `renderTile` **se vylučují** — hub by nevěděl, co vykreslit
- `superadminOnly` a `levels` se vylučují — co se nedá rozdat, nemá úrovně
- **`people` není v registru.** Bere si z něj `MODULES`; kdyby v něm byl, vznikl
  by kruhový import

### Dlaždice na hubu

`tileInfo()` vrací data, ne HTML: `{ badge: '300k Kč', alert: { text, tone } }`.
- **badge** je šedé číslo v závorce za názvem. Tiché.
- **alert** je řádek dole a ukáže se, **jen když je co říct**. Prázdno znamená
  „nic k řešení" — a to je dobrá zpráva, ne chybějící obsah.
- Když modul nemá data, vrátí `null`. Prázdná dlaždice řekne víc než `(0)`.

`renderTile(el)` je pro dlaždici s ovládáním (stopky). Taková dlaždice **není
jeden velký odkaz** — klik na tlačítko uvnitř odkazu by odnavigoval pryč.

---

## Datová vrstva

**`store.js` mluví se Supabase. Nic jiného.**

```js
import { sb, unwrap } from '../../supabase.js';

export async function getVeci() {
  return unwrap(await sb.from('veci').select('*').order('name'));
}
```

- API je **async**, i kdyby zrovna nemuselo být
- **chyba se vyhazuje**, nikdy se nevrací prázdno místo chyby — `unwrap()` je
  na to; tiché `[]` vypadá jako „nic tu není" a schová výpadek
- **pojmy a čisté funkce patří do `model.js`**, ne do store. Jinak si je nikdo
  nemůže vzít, aniž by přitáhl databázového klienta — a testy je pak neotestují
- store si model naimportuje a znovu vyexportuje, aby volající nemuseli vědět,
  odkud co je

### N+1 dotazy

V localStorage bylo čtení zdarma, v Supabase je to kolo po síti. **Nikdy se
neptej v cyklu.** Načti jednou a páruj v paměti:

```js
const rateOn = await rateResolver(entries.map((e) => e.email));   // jeden dotaz
for (const e of entries) rateOn(e.email, e.date);                 // párování v paměti
```

Stejným způsobem `statsForProjects()` a `memberCountByProject()`. Výpis projektů
dělá **tři dotazy bez ohledu na počet projektů**.

---

## Bezpečnost

### Escapuje se na hranici

Každý text, který nepochází z kódu, jde přes `esc()` — než se dostane do
`innerHTML`. Bez výjimky.

**U `wiki/markdown.js` platí navíc:** escapuje se **první**, značky se vkládají
až potom.

```js
const lines = esc(source).split(/\r?\n/);   // ← tohle pořadí je celá obrana
```

Kdo to prohodí, otevře XSS. Hlídá to `tests/markdown.test.js` — a je to ověřené
tím, že se to schválně rozbilo a testy spadly.

Odkazy v markdownu pouští `safeHref()` jen na `http(s):`, `mailto:`, `#` a `/`.
`javascript:` a `data:` zůstanou textem.

### Prohlížeč nehlídá nic

`canAccess()` a `canEdit()` jen schovávají tlačítka. **Hranicí je RLS.**

Každá nová tabulka dostane ve **stejné migraci**:

```sql
alter table public.moje_vec enable row level security;

create policy moje_vec_select on public.moje_vec
  for select to authenticated using (public.can_read_module('moje-vec'));

create policy moje_vec_write on public.moje_vec
  for all to authenticated
  using (public.can_edit_module('moje-vec'))
  with check (public.can_edit_module('moje-vec'));
```

Pomocné funkce už existují: `current_email()`, `is_domain_user()`,
`is_superadmin()`, `can_read_module()`, `can_edit_module()`, `project_level()`,
`project_is_active()`.

Novou politiku doplň do `supabase/tests/rls.sql`. Test, který se nepíše zároveň
s politikou, se nenapíše nikdy.

---

## Odolnost

**Co plní element, musí umět selhat viditelně.** Po chybě nesmí na obrazovce
zůstat „Načítám…" — to vypadá jako zamrznutí, ne jako problém s připojením.

```js
import { guard } from '../../util.js';

guard(view, () => load(view, filtr));   // chybu vypíše na místo obsahu
```

Poslední záchranná síť je `unhandledrejection` v `app.js` — ukáže pruh s chybou.
Je to pojistka, ne náhrada za `guard`.

Klient Supabase se vytváří **až při prvním použití**. Když vypadne CDN, dostaneš
srozumitelnou hlášku místo bílé stránky — a moduly jde naimportovat v testech.

---

## UI

- **Hustota před efekty.** Žádné animace, žádné stíny navíc, žádné velké prázdné plochy.
- **Stav v lidské řeči.** `zbývají 3 dny`, ne `3`. `mělo skončit před 7 dny`, ne `-7`.
- **Skloňuj.** `1 den` / `3 dny` / `5 dní`, a sedmý pád je jiný než první:
  *před 1 dnem*, *před 7 dny*. Špatný tvar vypadá jako chyba programu.
- **Prázdný stav vždycky něco řekne** a pokud jde, poradí, co dál.
- **Co se nedá spočítat, se přizná.** „Bez sazby", „bez odhadu" — nikdy tichá nula.
- **Nula a nevyplněno nejsou totéž.** Prázdné pole je `null`, ne `0`.
- **Barvy mají význam, ne náladu.** Červená = něco je špatně (přetečeno, po termínu,
  ztráta). Oranžová = blíží se to. Modrá = běží. Šedá = nevíme nebo se neřeší.
- **Ukládá se explicitně tam, kde jde o víc polí** (tlačítko), a při opuštění pole
  tam, kde jde o jednu hodnotu.
- **Hidden interactions ne.** Co má jít udělat, má být vidět — s jedinou výjimkou
  tlačítek na hover u hustých seznamů, kde by jinak zabírala víc místa než obsah.

Styly jsou v jednom `styles.css`, tříděné po modulech, s proměnnými v `:root`.
Žádný CSS framework.

---

## Migrace

Číslované soubory v `supabase/migrations/`.

**Dokud migraci nespustíš, přepisuje se. Jakmile ji spustíš, je zamčená** —
další změna tvaru je nová migrace s `alter table`. Jinak by v repozitáři bylo
něco jiného než v databázi.

Pořadí uvnitř souboru diktuje Postgres, ne čitelnost: tělo SQL funkce se ověřuje
už při vytvoření, takže **tabulky → funkce, které z nich čtou → politiky, které
je volají**.

---

## Testy

`npm test` — vestavěný `node --test`, žádná závislost navíc.

**Testuje se čistý výpočet**, ne DOM. Proto výpočty patří do `logic.js`,
`model.js` nebo `economics.js` — co je zamčené uvnitř render-souboru, se
otestovat nedá.

Co má test pokrýt:
- **hranice** — přelom měsíce a roku, přestupný únor, první a poslední den období
- **dělení nulou** — vrátit `null`, ne `Infinity` nebo `NaN`
- **chybějící data** — člověk bez sazby, projekt bez odhadu; musí se to *říct*, ne spolknout
- **doménová pravidla** — že PM hodiny nejdou do designu, že běžící projekt nemá zisk

Test nesmí záviset na dnešním datu. Čas se předává parametrem, nebo se počítá
relativně k `new Date()` uvnitř testu.

**Ověř, že test umí spadnout.** Rozbij schválně to, co hlídá, a zkontroluj, že
to chytí. Test, který projde vždycky, není test.

Před commitem: `npm test`. Před nasazením větší změny navíc `docs/TESTPLAN.md`.
