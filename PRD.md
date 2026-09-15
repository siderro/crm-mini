# Brevis — co to je a podle čeho to počítá

Interní systém pro řízení studia ŠG. Nahradil starší CRM (archiv v `obsolete/`).

Není to produkt pro zákazníky. Je to nástroj pro jednu malou firmu, který má
odpovídat na tři otázky: **kdo na čem dělá, jestli se to vyplácí a co má přijít.**

---

## Pro koho

| Kdo | Co s tím dělá |
|---|---|
| **Superadmin** (`jakub@svejda-goldmann.cz`) | Vidí všechno, rozdává práva, nastavuje sazby, sleduje peníze |
| **Kolega z domény** | Vidí jen moduly, které mu superadmin zapnul; vykazuje čas na projekty, na které je přiřazený |
| **Kdokoli jiný** | Nedostane se dovnitř vůbec |

Přihlašuje se přes Google. Dovnitř smí jen účty z `@svejda-goldmann.cz`.

---

## Priority, v tomhle pořadí

1. **Srozumitelnost** — stav v lidské řeči, ne holá čísla. „Zbývají 3 dny", ne „3".
2. **Hustota** — co nejvíc informace na obrazovku, žádné prázdné plochy.
3. **Nelhat** — radši mezera než vymyšlené číslo. Co se nedá spočítat, se řekne.
4. **Rychlost** — vykázat práci musí být otázka vteřin, ne minuty.
5. **Levná údržba** — žádné závislosti navíc, žádné vrstvy, které nikdo nepotřebuje.

---

## Doménová pravidla

Tohle je jádro. Kdo tomu nerozumí, nemůže bezpečně sáhnout na peníze v systému.

### Cena projektu není jedno číslo

Jsou to **tři oddělené koše s různou jednotkou**, které se nesčítají:

| Koš | Jednotka | Jak se měří | Proč |
|---|---|---|---|
| **Design** (`est_price`) | hodiny (`est_hours`) | natrackováno / odhad | Je v ní zisk. Když designér přeteče hodiny, zisk mizí. |
| **Project management** (`est_pm`) | peníze | spotřebováno / rozpočet | Je to procento z ceny, pokaždé jiné, proto se zadává jako částka. Hodiny managera **nesmí** vstoupit do designového odhadu. |
| **SLA** (`est_sla`) | peníze za kalendářní měsíc | opakovaný příjem | Hlavně průtok za služby třetích stran. **Stojí mimo ziskovost** — dokud se ty náklady neevidují, započítat ho by znamenalo lhát si do kapsy. |

Dřívější „Celkem odhad" byl součet těch tří. Byl odstraněn, protože nic neznamenal.

### Sazba je náklad, ne prodejní cena

Číslo v Lidech je **kolik nás ten člověk stojí za hodinu**. Ne to, co účtujeme ven.

Dva způsoby zápisu téhož:
- **hodinová** — částka za hodinu přímo
- **měsíční paušál** — částka za měsíc + počet hodin, které za něj má odvést;
  hodinovka se z toho odvodí a všude se ukazuje s `≈`, protože **je to odhad**.
  Když ten člověk odpracuje víc, reálně nás hodina stála míň, a naopak.

Typy se dají u jednoho člověka v čase střídat. Paušál je v datech proto, že bez
něj by nešlo říct, komu se platí fixně — což potřebují Výplaty.

### Zisk až po uzavření

Dokud projekt běží, zbývá práce, která zisk sníží. Průběžná „ziskovost" by tedy
vypadala skvěle na začátku a průběžně klesala — to není informace, to je iluze.

- **běžící projekt** → *spotřebováno X z ceny, zbývá Y*
- **uzavřený projekt** → *výnos, náklad, zisk, marže*

Při uzavření se zadá **skutečně fakturovaná cena** (může se lišit od odhadu)
a čísla se zmrazí do snapshotu.

### Pro bono a interní nemají výnos

Typ projektu je `client` / `probono` / `internal`. U posledních dvou se marže
nepočítá vůbec — ukáže se jen *stálo nás X*. Záporná marže by u nich byla nesmysl.

### Historie se nepřepisuje

Cokoli odvozeného, co se může později změnit, se buď páruje k datu záznamu, nebo
se orazítkuje při zápisu:

| Věc | Jak je chráněná |
|---|---|
| Sazba | Páruje se k **datu výkazu**, ne k dnešku. Zvýšení sazby nezdraží loňskou práci. |
| Typ práce (design / PM) | Ukládá se **natvrdo při zápisu**. Změna role na projektu nepřeklasifikuje minulost. |
| Zisk uzavřeného projektu | **Snapshot** při uzavření. Pozdější změna sazeb s ním nehne. |

---

## Moduly a jak na sebe navazují

```
   Lidé ──── sazby ────────────┐
     │                          │
   práva                        ▼
     │        Projekty ──> Pracovní výkaz ──> hodiny × sazba
     │           │ odhady          │
     ▼           ▼                 ▼
 Přístupy    Příjmy výhled    Ziskovost projektů ─┐
 do projektů  (co přijde)     Ziskovost lidí      │
                              Výkon (kapacita)    │
                                    Výplaty ◄─────┘
```

| Modul | K čemu je |
|---|---|
| **CRM** | Příležitosti před zakázkou: otevřené, zmrazené, vyhrané, prohrané |
| **To-Do** | Rychlý sběr myšlenek vlevo, tikety vpravo, archiv hotového |
| **Projekty** | Odhady, tým, ekonomika, uzavírání. Hlavní přehled řízení. |
| **Pracovní výkaz** | Tracker (hlavní cesta) + ruční zápis + můj výkaz |
| **Výplaty** | Kolik komu za období zaplatit |
| **Příjmy výhled** | Kdy a kolik má přijít — fakturace 20 dní po konci projektu, plus SLA |
| **Ziskovost projektů** | Jak dopadly uzavřené projekty |
| **Ziskovost lidí** | Prodaná hodina proti nákladu |
| **Výkon** | Kolik hodin máme a kolik jich odvedeme |
| **ŠG wiki** | Interní znalostní báze, vlastní markdown |
| **Notes** | Placeholder, zatím nic |
| **Lidé** *(nastavení)* | Práva k modulům a nákladové sazby |
| **Přístupy do projektů** *(nastavení)* | Kdo který projekt vidí a kam smí vykazovat |
| **Testovací data** *(nastavení)* | Vygeneruje nebo smaže dummy data pro testování |

---

## Model přístupů

**Superadmin plyne z konfigurace** (`src/config.js`), ne z dat. Jinak by šel
odkliknout nebo přepsat v databázi.

Ostatní dostávají moduly jednotlivě, s úrovní:
- **`read`** — vidí, needituje
- **`edit`** — vidí a mění

Moduly s penězi mají `superadminOnly` — nedají se nikomu zapnout a nejsou ani
v tabulce práv.

K projektům je druhá, nezávislá vrstva: **`view`** (vidí) a **`report`**
(vidí a smí do něj vykazovat).

### Hlídá to databáze, ne prohlížeč

`canAccess()` a `canEdit()` v prohlížeči jen schovávají tlačítka. Skutečnou
hranicí jsou **RLS politiky v Postgresu** (`supabase/migrations/001_init.sql`),
ověřené skriptem `supabase/tests/rls.sql`. Politiky zajišťují mimo jiné to, že:

- účet mimo doménu nepřečte nic
- **nikdo si nemůže přepsat vlastní práva** (při přihlášení smí posunout jen `last_login`)
- sazby čte jen jejich vlastník a superadmin
- vykazovat jde jen za sebe, jen do projektu s `report`, jen dokud běží
- projekt s výkazy nejde smazat

---

## Testovací data

V Nastavení je generátor, který naplní systém vymyšlenými daty: pět lidí
(e-maily s předponou `test.`), deset projektů v různých stavech, sazby včetně
paušálů, roční historii výkazů, příležitosti, wiki a úkoly.

Běží jako funkce v databázi (`generate_dummy_data`), protože z prohlížeče nejde
zapsat výkaz za někoho jiného — a to je správně, RLS to zakazuje. Funkce je
`security definer`, ale sama si ověří, že ji volá superadmin.

Všechno vygenerované nese příznak `is_dummy`, takže **mazání se nemůže dotknout
opravdových dat** a nemusí znát žádná jména. Uzavřené dummy projekty nemají
snapshot — jejich zisk se dopočítává živě, takže na nich nejde ověřit, že
uzavření čísla zmrazí. To se testuje na opravdovém projektu.

## Vědomá omezení

Tohle nejsou chyby, jsou to rozhodnutí. Když se změní podmínky, změní se i ona.

| Omezení | Proč |
|---|---|
| **Hodiny a projektová data nejsou chráněná před kolegy s právem na Projekty.** Sazby ano, takže mzdy jsou v bezpečí — ale kdo smí číst Projekty, dostane se přes konzoli k výkazům ostatních. | Zatím má právo na Projekty jen superadmin. Až to přestane platit, je to na řešení. |
| **Snapshot při uzavření zapisuje klient.** Kdo smí editovat projekty, může si do něj teoreticky napsat libovolný zisk. | Interní nástroj, okruh lidí je malý a známý. |
| **Odvozená hodinovka z paušálu je odhad.** Platí, jen když ten člověk odpracuje slíbené hodiny. | Přesné rozpouštění by šlo spočítat až po konci měsíce a zpětně měnit čísla projektů. |
| **Kapacitu známe jen u paušálů.** Hodinoví lidé nemají kde mít slíbený počet hodin, takže využití ve Výkonu může přelézt 100 %. | Šlo by přidat pole, zatím není potřeba. |
| **SLA není v ziskovosti.** | Chybí evidence nákladů na služby třetích stran, které pokrývá. |
| **Souběžná editace nemá zámky.** Když dva mění stejný řádek, vyhraje poslední. | Dva lidé na jednom řádku se tu prakticky nestávají. |
| **Aplikace nemá build.** Jede jako čisté ES moduly z CDN. | Míň pohyblivých částí; nasazení je `git push`. |

---

## Co systém vědomě neumí

- fakturaci (co se vystavilo a co je zaplacené) — jen plán, co má přijít
- evidenci nákladů mimo mzdy
- kontakty a firmy — staré CRM je mělo, tohle ne
- notifikace, e-maily, exporty
- mobilní aplikaci (rozložení se skládá, ale nikdo to pořádně neproklikal)
