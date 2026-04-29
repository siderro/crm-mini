# PRD — CRM Mini

## Co to je

Lehký sdílený CRM pro malý tým lidí, kteří potřebují mít přehled o kontaktech, firmách a obchodních příležitostech. Není to enterprise nástroj — je to rychlý, přehledný pracovní deník pro lidi co řeší B2B obchod, konzulting a síťování.

---

## Pro koho

### Persona: Konzultant / Freelancer

- Pracuje s desítkami kontaktů a firem
- Řeší více obchodních příležitostí najednou
- Potřebuje vědět: s kým jsem naposledy mluvil, o čem, a jaký je stav dealu
- Nechce složitý CRM — chce rychlý přehled a zápis
- Pracuje na desktopu, v prohlížeči
- Sdílí data s 2–5 kolegy — všichni vidí všechno

### Kontext použití

- **B2B obchod** — sledování pipeline, nabídek, stavu jednání
- **Freelance/konzulting** — přehled klientů, projektů, co bylo domluveno
- **Síťování/vztahy** — udržování přehledu o lidech, firmách, historii komunikace

---

## Hlavní user flows

### 1. Přihlášení

1. Uživatel otevře appku
2. Vidí login obrazovku
3. Klikne "Sign in with Google"
4. Proběhne OAuth
5. Přesměrován na seznam kontaktů

### 2. Správa kontaktů

1. Uživatel vidí seznam kontaktů rozdělený na "Open Deals" a "Ostatní"
2. Může vyhledávat (jméno, email, poznámky), filtrovat (s emailem / telefonem / firmou), řadit
3. Klikne na kontakt → detail s metadaty a historií aktivit
4. Na detailu může přidat aktivitu (poznámku) s přiřazením k projektu/dealu
5. Může kontakt editovat nebo smazat (s undo)

### 3. Správa dealů

1. Uživatel vidí dealy seskupené podle stavu: Open → Frozen → Won(WIP) → Won → Lost
2. V headeru vidí celkovou hodnotu otevřených dealů
3. Může přidat nový deal (inline formulář) s názvem, částkou, stavem, kontaktem, firmou
4. Může deal zmrazit (Freeze) — uloží předchozí stav, dá do Frozen
5. Může deal rozmrazit (Unfreeze) — vrátí do předchozího stavu
6. Klik na deal → detail s metadaty a timeline aktivit z kontaktu i dealu

### 4. Správa firem

1. Uživatel vidí firmy seskupené na "Open Deals" a "Ostatní"
2. Může přidat/editovat firmu inline formulářem
3. Klik na firmu → detail s kontakty, dealy, metadaty
4. Může firmu smazat (s undo)

### 5. Inbox (rychlé poznámky)

1. Uživatel otevře Inbox
2. Vidí volný textový blok (textarea)
3. Může psát cokoliv, přidat timestamp tlačítkem
4. Klikne Save → uloží se do DB

### 6. Zápis aktivity ke kontaktu

1. Na detailu kontaktu uživatel napíše poznámku do textarea
2. Volitelně vybere projekt/deal z dropdownu
3. Klikne Add
4. Aktivita se objeví v timeline (nejnovější nahoře)
5. Může ji editovat inline nebo smazat s undo

---

## User stories (Gherkin)

### Kontakty

```gherkin
Given jsem přihlášený uživatel
When otevřu seznam kontaktů
Then vidím všechny kontakty rozdělené na "Open Deals" a "Ostatní"
  And u každého vidím jméno, email, telefon, firmu, datum přidání
```

```gherkin
Given jsem na seznamu kontaktů
When zadám text do vyhledávání
Then seznam se filtruje podle jména, emailu a poznámek (s debounce 350ms)
```

```gherkin
Given jsem na detailu kontaktu
When napíšu poznámku a kliknu Add
Then aktivita se uloží a zobrazí v timeline s časem
```

```gherkin
Given jsem na detailu kontaktu
When kliknu Delete na aktivitě
Then aktivita zmizí a zobrazí se undo toast (10s na vrácení)
```

### Dealy

```gherkin
Given jsem na seznamu dealů
When vidím skupinu Open
Then dealy jsou seřazené podle posledního updatu
  And u každého vidím název, stav, hodnotu s progress barem, dny od vytvoření/úpravy
```

```gherkin
Given mám otevřený deal ve stavu OPP
When kliknu Freeze
Then deal se přesune do skupiny Frozen
  And jeho předchozí stav se uloží pro pozdější Unfreeze
```

```gherkin
Given mám zmrazený deal
When kliknu Unfreeze
Then deal se vrátí do předchozího stavu (OPP/Proposal/Negotiation)
```

### Firmy

```gherkin
Given jsem na seznamu firem
When kliknu na firmu
Then vidím detail s kontakty, dealy, metadaty a poznámkami
```

```gherkin
Given jsem na detailu firmy
When kliknu na kontakt v seznamu
Then přejdu na detail toho kontaktu
```

### Smazání s undo

```gherkin
Given smažu jakýkoliv záznam (kontakt, firmu, deal, aktivitu)
When se zobrazí undo toast
Then mám 10 sekund na kliknutí Undo pro obnovení záznamu
```

### Inbox

```gherkin
Given jsem v Inboxu
When napíšu text a kliknu Save
Then obsah se uloží a zobrazí se potvrzení "Saved ✓"
```

```gherkin
Given jsem v Inboxu
When kliknu "Add timestamp"
Then na pozici kurzoru se vloží dnešní datum ve formátu DD.MM.YYYY
```

---

## MVP checklist + acceptance criteria

MVP = aktuální stav appky. Všechny body níže jsou implementovány.

| # | Feature | Acceptance criteria | Status |
|---|---------|-------------------|--------|
| 1 | Google OAuth login | Uživatel se přihlásí přes Google, vidí svá data | DONE |
| 2 | Seznam kontaktů | Tabulka s vyhledáváním, filtrováním, řazením, seskupením dle dealů | DONE |
| 3 | Detail kontaktu | Metadata, poznámky, timeline aktivit s CRUD | DONE |
| 4 | Formulář kontaktu | Vytvoření/editace s validací, timestamp do poznámek | DONE |
| 5 | Seznam firem | Tabulka seskupená dle dealů, inline formulář, počet kontaktů | DONE |
| 6 | Detail firmy | Metadata, seznam kontaktů (M:N), seznam dealů | DONE |
| 7 | Formulář firmy | Vytvoření/editace s validací | DONE |
| 8 | Seznam dealů | Skupiny dle stavu, celková hodnota, progress bar, freeze/unfreeze | DONE |
| 9 | Detail dealu | Metadata, freeze/unfreeze, timeline aktivit z kontaktu + dealu | DONE |
| 10 | Formulář dealu | Vytvoření/editace, napojení na kontakt a firmu | DONE |
| 11 | Inbox | Volný textový blok per uživatel, timestamp, uložení | DONE |
| 12 | CSV export kontaktů | Stažení souboru s BOM pro Excel | DONE |
| 13 | Delete s undo | Smazání s 10s undo toastem, re-insert při undo | DONE |
| 14 | RLS (Row Level Security) | Každý uživatel vidí jen svá data | DONE |

---

## Tech stack + Non-negotiables

### Tech stack

| Vrstva | Technologie |
|--------|------------|
| Frontend | Vanilla JavaScript (ES modules), žádný framework |
| Styling | Plain CSS, Roboto Mono font |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Google OAuth přes Supabase Auth |
| Security | Row Level Security na všech tabulkách |
| Hosting | GitHub Pages (statický deploy) |
| Verzování | Git + GitHub |

### Non-negotiables

- **Žádný framework** — vanilla JS, žádný React/Vue/Svelte
- **Žádný build step** — ES modules přímo v prohlížeči, žádný bundler
- **Monospace font všude** — žádná typografická škála, hierarchie jen přes barvu/tučnost
- **Vysoká informační hustota** — žádné prázdné plochy, dekorativní karty, velké nadpisy
- **Explicitní UI** — žádné hover-only akce, žádné skryté interakce
- **Desktop-first** — mobilní layout je sekundární
- **Terminálový look** — appka má vypadat jako pracovní nástroj, ne jako marketingový produkt
- **Jednoduchost** — žádné přidávání knihoven bez jasného důvodu

---

## Out of scope

Tyto věci CRM Mini záměrně neřeší:

- **Email integrace** — žádné napojení na Gmail, Outlook, žádné odesílání emailů z appky
- **Kalendář integrace** — žádná synchronizace s Google Calendar
- **Automatizace / workflow** — žádné automatické emaily, remindery, pipeline automaty
- **Reporting / grafy** — žádné dashboardy, charty, analytika
- **Mobilní nativní app** — stačí web v prohlížeči
- **Multi-tenant / role** — žádné role, oprávnění, admin panel
- **Import dat** — žádný hromadný import z jiných CRM
- **API pro třetí strany** — žádné veřejné API
- **Notifikace** — žádné push notifikace, emailové upozornění

---

## Success metrics

| Metrika | Jak poznat úspěch |
|---------|------------------|
| **Pravidelné používání** | Appku otevírám denně/týdně jako hlavní přehled kontaktů a dealů |
| **Úplnost dat** | Všechny relevantní kontakty, firmy a dealy jsou v appce — nic důležitého nechybí |
| **Rychlost práce** | Najdu co potřebuju do pár sekund, zápis aktivity trvá pod 10s |
| **Nahrazení alternativ** | Přestal jsem používat Excel/poznámky/jiné nástroje pro tracking dealů |
| **Adopce týmem** | Ostatní uživatelé appku aktivně používají, ne jen já |
