# CRM Mini — Reference

## Popis projektu

Lehký osobní CRM pro sledování obchodních příležitostí, kontaktů a firem.
Vanilla JavaScript, bez frameworku. Backend: Supabase (PostgreSQL + Auth + RLS).

**Hlavní účel:**
- sledovat otevřené obchodní příležitosti (deals)
- udržovat kontakty viditelné a čerstvé
- propojovat kontakty, firmy a dealy
- zaznamenávat co bylo s kým probráno
- ukazovat kdy jsem s kým naposledy mluvil a o jakém projektu

---

## Struktura projektu

```
crm-mini/
├── index.html                  # Vstupní bod, načítá Supabase CDN + app.js
├── styles.css                  # Veškeré styly
├── CLAUDE.md                   # Instrukce pro AI
├── UX-UI-RULES.md              # Pravidla UI/UX
├── src/
│   ├── app.js                  # Router, navigace, init
│   ├── config.js               # Supabase URL + anon key
│   ├── supabase.js             # Supabase klient + auth helpery
│   ├── ui/
│   │   ├── auth.js             # Přihlašovací obrazovka (Google OAuth)
│   │   ├── contacts.js         # Seznam kontaktů
│   │   ├── contactDetail.js    # Detail kontaktu + aktivita
│   │   ├── contactForm.js      # Formulář kontaktu (nový/edit)
│   │   ├── companies.js        # Seznam firem (inline CRUD)
│   │   ├── companyDetail.js    # Detail firmy
│   │   ├── companyForm.js      # Formulář firmy
│   │   ├── deals.js            # Seznam dealů podle stavu
│   │   ├── dealDetail.js       # Detail dealu
│   │   └── dealForm.js         # Formulář dealu
│   └── utils/
│       ├── time.js             # timeAgo() — relativní čas
│       ├── debounce.js         # debounce() pro vyhledávání
│       ├── csv.js              # Export kontaktů do CSV
│       └── undo.js             # deleteWithUndo() — smazání s undo
└── supabase/
    ├── schema.sql              # Základní schéma DB + RLS
    ├── migration_deals.sql     # Migrace: deals rozšíření
    └── migration_v3_comprehensive.sql  # Migrace: deal_id na activities, company_contacts tabulka
```

---

## Databáze

### Tabulky

#### companies
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | Automaticky generované |
| user_id | uuid FK → auth.users | Vlastník záznamu |
| name | text NOT NULL | Název firmy |
| email | text | Email firmy |
| ico | text | IČO |
| web | text | Web URL |
| notes | text | Poznámky |
| created_at | timestamptz | Datum vytvoření |
| updated_at | timestamptz | Datum úpravy (auto trigger) |

#### contacts
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | Automaticky generované |
| user_id | uuid FK → auth.users | Vlastník záznamu |
| first_name | text NOT NULL | Jméno |
| last_name | text NOT NULL | Příjmení |
| email | text | Email |
| phone | text | Telefon |
| notes | text | Poznámky |
| company_id | uuid FK → companies | Vazba na firmu (volitelné) |
| created_at | timestamptz | Datum vytvoření |
| updated_at | timestamptz | Datum úpravy (auto trigger) |

#### deals
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | Automaticky generované |
| user_id | uuid FK → auth.users | Vlastník záznamu |
| title | text NOT NULL | Název dealu |
| amount | numeric(12,2) | Hodnota v Kč |
| status | text NOT NULL | Stav (viz níže) |
| expected_close | date | Očekávané uzavření |
| contact_id | uuid FK → contacts | Hlavní kontakt |
| company_id | uuid FK → companies | Firma |
| notes | text | Poznámky |
| previous_status | text | Stav před zmrazením |
| created_at | timestamptz | Datum vytvoření |
| updated_at | timestamptz | Datum úpravy (auto trigger) |

**Stavy dealu:**
- `OPP` — příležitost (open)
- `proposal_sent` — odeslán návrh (open)
- `negotiation` — vyjednávání (open)
- `frozen` — zmrazený (pozastaven)
- `won_wip` — vyhráno, probíhá práce
- `won_done` — vyhráno, hotovo
- `lost` — prohrán

**Otevřené stavy** (OPEN_STATUSES): `OPP`, `proposal_sent`, `negotiation`

#### activities
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | Automaticky generované |
| user_id | uuid FK → auth.users | Vlastník záznamu |
| contact_id | uuid FK → contacts | Na kterém kontaktu |
| type | text | Typ: note, call, email, meeting (default: note) |
| content | text NOT NULL | Obsah aktivity |
| deal_id | uuid FK → deals | Přiřazený projekt/deal (volitelné) |
| created_at | timestamptz | Datum vytvoření |

#### company_contacts (join tabulka)
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | Automaticky generované |
| company_id | uuid FK → companies | Firma |
| contact_id | uuid FK → contacts | Kontakt |
| role | text | Role kontaktu ve firmě (volitelné) |
| created_at | timestamptz | Datum vytvoření |
| UNIQUE | (company_id, contact_id) | Unikátní dvojice |

### Vztahy mezi tabulkami

```
companies ←──── contacts (company_id)
companies ←──── deals (company_id)
contacts  ←──── deals (contact_id)
contacts  ←──── activities (contact_id)
deals     ←──── activities (deal_id)
companies ←──→ contacts (přes company_contacts M:N)
```

### Row Level Security (RLS)

Všechny tabulky mají zapnuté RLS. Uživatel vidí pouze své záznamy:
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

Tabulka `company_contacts` ověřuje přes existenci kontaktu vlastněného uživatelem.

### Triggery

Funkce `update_updated_at()` — automaticky nastavuje `updated_at = now()` při UPDATE na tabulkách: companies, contacts, deals.

### Indexy

- `idx_companies_user_id` — companies(user_id)
- `idx_contacts_user_id` — contacts(user_id)
- `idx_contacts_company_id` — contacts(company_id)
- `idx_contacts_last_name` — contacts(user_id, last_name)
- `idx_contacts_email` — contacts(user_id, email)
- `idx_activities_user_id` — activities(user_id)
- `idx_activities_contact` — activities(contact_id, created_at DESC)
- `idx_activities_deal_id` — activities(deal_id, created_at DESC)
- `idx_deals_user_id` — deals(user_id)
- `idx_deals_contact_id` — deals(contact_id)
- `idx_deals_company_id` — deals(company_id)
- `idx_deals_status` — deals(user_id, status)
- `idx_company_contacts_company` — company_contacts(company_id)
- `idx_company_contacts_contact` — company_contacts(contact_id)

---

## Autentizace

- Google OAuth přes Supabase Auth
- `signInWithGoogle()` — otevře OAuth dialog
- `signOut()` — odhlášení
- `getUser()` — vrátí aktuálního uživatele
- `onAuthChange(callback)` — sleduje změny auth stavu
- Po přihlášení se přesměruje na seznam kontaktů
- Nepřihlášený uživatel vidí pouze login obrazovku

---

## Routing

Hash-based routing v `src/app.js`. Funkce `parseHash()` rozebere hash na části, `route()` vyhodnotí a zavolá příslušný renderer.

| Route | Modul | Obrazovka |
|-------|-------|-----------|
| `#/` nebo `#/contacts` | contacts.js | Seznam kontaktů |
| `#/contacts/new` | contactForm.js | Nový kontakt |
| `#/contacts/:id` | contactDetail.js | Detail kontaktu |
| `#/contacts/:id/edit` | contactForm.js | Editace kontaktu |
| `#/companies` | companies.js | Seznam firem |
| `#/companies/:id` | companyDetail.js | Detail firmy |
| `#/companies/:id/edit` | companyForm.js | Editace firmy |
| `#/deals` | deals.js | Seznam dealů |
| `#/deals/new` | dealForm.js | Nový deal |
| `#/deals/:id` | dealDetail.js | Detail dealu |
| `#/deals/:id/edit` | dealForm.js | Editace dealu |

Navigace: sticky header s odkazem na Deals (s celkovou hodnotou v tis. Kč), Contacts, Companies. Vpravo: email uživatele + Sign out.

---

## Obrazovky a funkce

### Login (auth.js)
- Tlačítko "Sign in with Google"
- Po přihlášení redirect na kontakty

### Seznam kontaktů (contacts.js)
- **Vyhledávání** — debounced (350ms), hledá v jménu, emailu, telefonu, firmě
- **Filtr** — všechny / s emailem / s telefonem / s firmou
- **Řazení** — příjmení, email, telefon, datum přidání (ASC/DESC klik na hlavičku)
- **Seskupení** — "Open Deals" (kontakty napojené na otevřené dealy) a "Ostatní"
- **Tabulka** — jméno, email, telefon, firma, datum přidání
- **Akce** — nový kontakt, export CSV, klik na řádek → detail
- **CSV export** — stáhne soubor `contacts_YYYY-MM-DD.csv` s BOM pro Excel

### Detail kontaktu (contactDetail.js)
- Metadata řádek: email · telefon · firma · upd X ago · add X ago
- Poznámky (pokud existují)
- **Aktivita:**
  - Formulář pro přidání nové (textarea + výběr projektu z otevřených dealů)
  - Timeline aktivit seřazená od nejnovější
  - Každá aktivita: badge projektu, čas, Edit link, Delete link
  - **Edit** — inline editace (textarea + dropdown, Save/Cancel)
  - **Delete** — smaže s možností undo (10s toast)
- Akce: Edit kontakt, Delete kontakt (s undo)

### Formulář kontaktu (contactForm.js)
- Pole: Jméno*, Příjmení*, Email, Telefon, Firma (dropdown), Poznámky
- Validace: jméno povinné, email formát
- Tlačítko "Add timestamp" — vloží datum DD.MM.YYYY do poznámek na pozici kurzoru
- Po uložení přesměruje na detail

### Seznam firem (companies.js)
- **Inline formulář** — přidání/editace firmy přímo v seznamu (toggle tlačítkem)
- **Seskupení** — "Open Deals" (firmy s otevřenými dealy) a "Ostatní"
- **Tabulka** — název, oficiální název, email, web, IČO, počet kontaktů, otevřené dealy
- **Akce** — edit (inline), delete (s undo), klik na řádek → detail

### Detail firmy (companyDetail.js)
- Metadata: oficiální název, email, web, IČO, timestampy
- Poznámky
- **Kontakty** — seznam kontaktů napojených na firmu (klik → detail kontaktu)
- **Dealy** — seznam dealů firmy se stavem a částkou (klik → detail dealu)
- Akce: Edit, Delete (s undo)

### Formulář firmy (companyForm.js)
- Pole: Název*, Oficiální název, Email, IČO, Web, Poznámky
- Validace: název povinný, email formát, URL formát

### Seznam dealů (deals.js)
- **Inline formulář** — přidání/editace dealu
- **Skupiny** — Open (OPP + Proposal + Negotiation), Frozen, Won(WIP), Won, Lost
- **Statistiky** — celková hodnota otevřených, zmrazených
- **Tabulka** — název, stav, hodnota (textový progress bar █░), dny od vytvoření/úpravy
- **Progress bar** — unicode bloky, 10 znaků, poměr k maximu
- **Akce** — edit (inline), delete, freeze/unfreeze, klik na řádek → detail
- **Freeze/Unfreeze** — zmrazí deal (uloží předchozí stav), unfreeze vrátí zpět

### Detail dealu (dealDetail.js)
- Metadata: částka, stav (badge), očekávané uzavření, kontakt, firma, timestampy
- **Freeze/Unfreeze tlačítka** (barevná)
- **Aktivita** — timeline aktivit z kontaktu + přímo z dealu (read-only, bez přidávání)
- Akce: Edit, Delete (s undo)

### Formulář dealu (dealForm.js)
- Pole: Název*, Částka, Stav*, Očekávané uzavření, Kontakt (dropdown), Firma (dropdown), Poznámky
- Po uložení přesměruje na detail

---

## Utility funkce

### timeAgo(dateStr) — `src/utils/time.js`
Formátuje datum na relativní čas:
- < 1 min → "just now"
- < 60 min → "5m ago"
- < 24 h → "3h ago"
- < 30 d → "7d ago"
- jinak → lokalizované datum

### debounce(fn, ms) — `src/utils/debounce.js`
Debounce pro vyhledávání. Výchozí 300ms, kontakty používají 350ms.

### exportCSV(contacts, companies) — `src/utils/csv.js`
Export kontaktů do CSV souboru. Sloupce: First Name, Last Name, Email, Phone, Company, Notes, Created. Soubor s BOM pro kompatibilitu s Excel.

### deleteWithUndo(table, row, label, onDelete, onRestore) — `src/utils/undo.js`
1. Načte čistý řádek z DB (bez joinů)
2. Okamžitě smaže z DB
3. Zavolá `onDelete()` callback
4. Zobrazí plovoucí undo toast (10s)
5. Pokud uživatel klikne Undo → re-insert + `onRestore()`
6. Po 10s toast zmizí

---

## Architektura a vzory

### Renderování
- Každý modul má funkci `renderXxx(container, id?)`
- `container.innerHTML = template literal` — plný re-render
- Žádný virtuální DOM, žádný framework
- Po vykreslení HTML se připojí event listenery přes `querySelector`

### Data flow
- Supabase JS client (`sb`) volá REST API
- Dotazy: `sb.from('table').select().eq().order()`
- Paralelní dotazy přes `Promise.all()`
- RLS automaticky filtruje na `user_id`

### State management
- Globální: `currentUser` v app.js
- Per-modul: lokální proměnné (sort, search, filter v contacts.js)
- Žádný store, žádný framework state

### Escapování
- `esc(s)` — HTML escape přes `textContent` → `innerHTML`
- `escapeAttr(s)` — escape pro HTML atributy (&, ", ', <, >)
- Definovány lokálně v každém modulu kde jsou potřeba

### Error handling
- Try/catch kolem DB operací
- Chyba → `container.innerHTML = error div` nebo `alert()`
- Validační chyby pod inputy (.field-error)

---

## Styly a design systém

### Principy
- Monospace font (Roboto Mono, 13px) všude
- Všechny nadpisy stejná velikost jako body text
- Hierarchie pouze přes barvu, tučnost, shade
- Desktop-first, vysoká hustota informací
- Preferovány linky před tlačítky
- Nebezpečné akce = červené linky

### CSS proměnné
```css
--bg: #f8f9fa          /* pozadí */
--surface: #ffffff     /* karty, povrchy */
--border: #e2e8f0      /* ohraničení */
--text: #1a202c        /* hlavní text */
--text-secondary: #64748b  /* sekundární text */
--primary: #3b82f6     /* modrá — primární akce */
--danger: #ef4444      /* červená — nebezpečné akce */
--success: #22c55e     /* zelená */
--radius: 8px          /* zaoblení rohů */
```

### Klíčové CSS třídy
- `.btn`, `.btn-primary`, `.btn-danger`, `.btn-secondary` — tlačítka
- `.btn-back` — zpět odkaz (bez borderu)
- `.btn-freeze` — cyan tlačítko pro freeze
- `.input` — všechny inputy/textareas/selecty
- `.card` — bílý box s ohraničením a stínem
- `.data-table` — tabulka se záhlavím a klikatelnými řádky
- `.clickable-row` — řádek s hover efektem
- `.actions-cell` — flex kontejner pro akční linky
- `.danger-link` — červený odkaz pro delete akce
- `.status-badge` + `.status-{stav}` — barevné badgy stavů
- `.activity-item` — aktivita s levým borderem
- `.activity-project-badge` — modrý badge projektu
- `.compact-meta` — kompaktní řádek metadat s `·` oddělovačem
- `.badge` — počítadlo v šedém kruhu
- `.undo-toast` — plovoucí tmavý toast s undo linkem
- `.detail-page` — max-width 900px
- `.form-page` — max-width 700px

### Responsive
- `@media (max-width: 640px)` — jednosloupecké formuláře, zabalená navigace, skrytý email uživatele

---

## Lokální vývoj

```bash
python3 -m http.server 5173
# nebo
npx serve -l 5173
```

Otevřít `http://localhost:5173/`

Redirect URL pro OAuth musí obsahovat localhost origin (nastaveno v Supabase dashboard).

---

## Nasazení

- Push na GitHub main branch
- GitHub Pages servíruje z rootu repozitáře
