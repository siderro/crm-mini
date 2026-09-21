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

### Náklady mimo mzdy jsou firemní, ne projektové

Nájem, software, pojištění, oprava auta — to firmu stojí peníze bez ohledu na
to, na čem zrovna dělá. **Do ziskovosti projektu proto nevstupují.** Kdyby se
rozpouštěly na projekty nějakým klíčem, byl by ten klíč vymyšlený a zisk by
přestal být měřitelný.

Žijí ve svém modulu a sčítají se až ve výhledu, proti očekávaným příjmům.
Dva tvary:

- **pravidelné** — každý měsíc, nebo jednou za rok v daném měsíci; mají
  platnost od–do, aby vypovězené předplatné nefigurovalo ve výhledu navěky
- **jednorázové** — nebagatelní výdaj s očekávaným datem

Roční položka spadne do svého měsíce **celá**. Dvanáctina se ukazuje jen
v souhrnu jako průměr — ve výhledu by rozpuštění na dvanáctiny zakrylo, že
v březnu opravdu odejde 24 000 najednou.

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
 Přístupy   Finance výhled    Ziskovost projektů ─┐
 do projektů      ▲           Ziskovost lidí      │
                  │           Výkon (kapacita)    │
               Náklady              Výplaty ◄─────┘
          (firemní, ne projektové)

 Finance výhled bere odhady z Projektů, položky z Nákladů
 a paušály ze sazeb. Zdroje se dají jednotlivě vypnout.
```

| Modul | K čemu je |
|---|---|
| **Pracovní výkaz** | Tracker (hlavní cesta) + ruční zápis + můj výkaz |
| **To-Do** | Rychlý sběr myšlenek vlevo, tikety vpravo, archiv hotového |
| **Projekty** | Odhady, tým, ekonomika, uzavírání. Hlavní přehled řízení. |
| **CRM** | Příležitosti před zakázkou: otevřené, zmrazené, vyhrané, prohrané |
| **Náklady** | Pravidelné a jednorázové výdaje mimo mzdy |
| **Výplaty** | Kolik komu za období zaplatit |
| **Finance výhled** | Co přijde a co odejde po měsících; zdroje se zapínají checkboxy |
| **Ziskovost projektů** | Jak dopadly uzavřené projekty |
| **Ziskovost lidí** | Prodaná hodina proti nákladu |
| **Výkon** | Kolik hodin máme a kolik jich odvedeme |
| **ŠG wiki** | Interní znalostní báze, vlastní markdown |
| **Lidé** *(nastavení)* | Role, práva k modulům a nákladové sazby |
| **Přístupy do projektů** *(nastavení)* | Kdo který projekt vidí a kam smí vykazovat |
| **Testovací data** *(nastavení)* | Vygeneruje nebo smaže dummy data pro testování |

---

## Model přístupů

Otázka „na co má tenhle člověk právo" se rozpadá na **tři nezávislé osy**.
Míchat je do jedné je nejčastější chyba, protože role zní jako jedna věc.

| Osa | Otázka | Kde se vynucuje |
|---|---|---|
| **Moduly** | které obrazovky vidím | `app_users.modules`, mapa `{ modul: read \| edit }` |
| **Řádky** | které záznamy uvnitř modulu vidím | hodnost role v RLS |
| **Mazání** | smím ničit historii | restriktivní politiky v RLS |

### Superadmin stojí mimo data

**Plyne z konfigurace** (`src/config.js` + `is_superadmin()` v migraci), ne
z tabulky. Je to jediné právo, které nejde získat zápisem do databáze — kdyby
plynulo z `role`, stačilo by přepsat řádek.

Je to **seznam**, ne jeden e-mail. Jeden účet by znamenal, že jeho ztrátou už
nikdo nikdy nikomu nepřidělí práva.

### Role

`designer` < `manager` < `admin` < `superadmin`. Role dělá dvě věci najednou:

**Je to předloha modulů.** Výběr role **zapíše** odpovídající mapu do
`app_users.modules` (`src/modules/access/roles.js`). Materializuje se schválně:
živé pravidlo by znamenalo seznam „role → moduly" dvakrát — v JS pro UI a v SQL
pro RLS — a dvě kopie téže pravdy se rozejdou. Takhle je „co tenhle člověk
vidí" odpověditelné pohledem na jeden řádek.

Cena: změna předlohy se nepropíše zpětně. Proto Lidé píšou u upravené mapy
**„(upraveno)"** a nabídnou *Srovnat s rolí*. Viditelné, ne kouzelné.

**Je to hodnost.** Podle ní RLS rozhoduje, které řádky člověk uvidí:

| | Výkazy | Projekty | Wiki |
|---|---|---|---|
| **designer** | jen svoje | jen ty, kde je přiřazený | podle `min_role` stránky |
| **manager** a výš | všechny | všechny | " |

Hodnost platí **živě** — na rozdíl od předlohy. Je to bezpečnostní hranice,
takže se nesmí materializovat.

Designér schválně nedostává modul **Projekty**. Ne kvůli tajemství: ekonomika
projektu se sčítá ze *všech* výkazů na něm, a když mu RLS cizí výkazy odřízne,
viděl by tiše podhodnocenou spotřebu. Číslo, které vypadá platně a není, je
horší než žádné.

### Peníze rolí neplynou

Moduly s penězi mají `superadminOnly` — nedají se nikomu zapnout, nejsou
v tabulce práv a **nerozdává je ani role `admin`**. Kdo má admina, může
všechno krom peněz a krom mazání.

### Mazání není třetí úroveň

`read`/`edit` zůstávají dvě. Mazání projektů, lidí a wiki stránek je omezené
na superadmina **restriktivní** politikou — permisivní politiky se v Postgresu
slučují přes OR, takže užší `for delete` vedle `for all` by neomezila nic.
CRM a To-Do omezené nejsou; smazaná příležitost není ztráta historie.

### Projekty mají vlastní vrstvu

Nezávisle na všem výše: **`view`** (vidí) a **`report`** (vidí a smí do něj
vykazovat).

### Hlídá to databáze, ne prohlížeč

`canAccess()` a `canEdit()` v prohlížeči jen schovávají tlačítka. Skutečnou
hranicí jsou **RLS politiky v Postgresu** (`supabase/migrations/001_init.sql` a `004_roles.sql`),
ověřené skriptem `supabase/tests/rls.sql`. Politiky zajišťují mimo jiné to, že:

- účet mimo doménu nepřečte nic
- **nikdo si nemůže přepsat vlastní práva ani vlastní roli** (při přihlášení smí
  posunout jen `last_login`)
- sazby čte jen jejich vlastník a superadmin
- vykazovat jde jen za sebe, jen do projektu s `report`, jen dokud běží
- projekt s výkazy nejde smazat

---

## Testovací data

V Nastavení je generátor, který naplní systém vymyšlenými daty: pět lidí
s rolemi (e-maily s předponou `test.`), deset projektů v různých stavech, sazby
včetně paušálů, roční historii výkazů, pravidelné i jednorázové náklady,
příležitosti, wiki a úkoly.

Běží jako funkce v databázi (`generate_dummy_data`), protože z prohlížeče nejde
zapsat výkaz za někoho jiného — a to je správně, RLS to zakazuje. Funkce je
`security definer`, ale sama si ověří, že ji volá superadmin.

Všechno vygenerované nese příznak `is_dummy`, takže **mazání se nemůže dotknout
opravdových dat** a nemusí znát žádná jména.

**Snapshoty uzavřených projektů dopočítá až klient**, toutéž funkcí, kterou
používá opravdové uzavření. Šlo by to v SQL, ale znamenalo by to mít pravidla
o penězích ve dvou jazycích — a jakmile se rozejdou, testovací data začnou
„dokazovat" něco jiného, než co dělá aplikace.

Pravidlo, které drží daň za generátor na uzdě: **plní se jen to, bez čeho modul
nejde posoudit, ne každý sloupec.** Každá nová tabulka znamená větev ve třech
funkcích, a protože jsou v zamčené migraci, i novou migraci.

## Vědomá omezení

Tohle nejsou chyby, jsou to rozhodnutí. Když se změní podmínky, změní se i ona.

| Omezení | Proč |
|---|---|
| **Manažer a výš vidí výkazy všech.** Designér vidí jen svoje, ale od manažera nahoru je ta hranice pryč. | Řídit kapacitu a ziskovost bez cizích hodin nejde. Mzdy v bezpečí zůstávají: `rates` čte jen vlastník a superadmin, takže manažerovi se náklad ukáže jako „bez sazby“, ne jako nula. |
| **Snapshot při uzavření zapisuje klient.** Kdo smí editovat projekty, může si do něj teoreticky napsat libovolný zisk. | Interní nástroj, okruh lidí je malý a známý. |
| **Odvozená hodinovka z paušálu je odhad.** Platí, jen když ten člověk odpracuje slíbené hodiny. | Přesné rozpouštění by šlo spočítat až po konci měsíce a zpětně měnit čísla projektů. |
| **Kapacitu známe jen u paušálů.** Hodinoví lidé nemají kde mít slíbený počet hodin, takže využití ve Výkonu může přelézt 100 %. | Šlo by přidat pole, zatím není potřeba. |
| **SLA není v ziskovosti.** | Náklady se sice evidují (modul Náklady), ale nepárují se k projektu — nejde říct, kolik z nich pokrývá které SLA. |
| **Souběžná editace nemá zámky.** Když dva mění stejný řádek, vyhraje poslední. | Dva lidé na jednom řádku se tu prakticky nestávají. |
| **Aplikace nemá build.** Jede jako čisté ES moduly z CDN. | Míň pohyblivých částí; nasazení je `git push`. |

---

## Co systém vědomě neumí

- fakturaci (co se vystavilo a co je zaplacené) — jen plán, co má přijít
- kontakty a firmy — staré CRM je mělo, tohle ne
- notifikace, e-maily, exporty
- mobilní aplikaci (rozložení se skládá, ale nikdo to pořádně neproklikal)
