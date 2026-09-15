# Ruční průchod aplikací

Co nejde otestovat automaticky: jestli to v prohlížeči opravdu funguje a dává
smysl. Automatické testy (`npm test`) hlídají výpočty, `supabase/tests/rls.sql`
hlídá práva v databázi — tenhle seznam hlídá zbytek.

**Kdy projít:** před nasazením větší změny, po zásahu do modulu, nebo když se
delší dobu nic neověřovalo. Trvá to zhruba 45 minut.

**Jak číst:** u každého kroku je psané, co se má stát. Když se stane něco
jiného, je to nález — zapiš ho i s tím, co jsi udělal předtím.

---

## 0. Než začneš

- [ ] `npm test` — všechno zelené
- [ ] `supabase/tests/rls.sql` v SQL editoru → skončí `VŠECHNY TESTY PROŠLY`
- [ ] Aplikace běží na http://localhost:5173/ a jsi přihlášený

---

## 1. Kostra a přihlášení

| | Krok | Co se má stát |
|---|---|---|
| 1.1 | Odhlásit se | Přihlašovací obrazovka |
| 1.2 | Přihlásit se Googlem | Hub s dlaždicemi |
| 1.3 | Vypnout wifi a dát F5 | Hláška **„Nejde se připojit"** s tlačítkem, ne bílá stránka ani zamrzlé „Načítám…", výsledek:napsdalo to Nejde se připojit
TypeError: Failed to fetch |
| 1.4 | Zapnout wifi, Zkusit znovu | Aplikace naběhne |
| 1.5 | Rozepsat cokoli (třeba novou OPP), přepnout na jiný tab Chromu a zpět | **Rozepsané zůstane.** Tohle se dřív mazalo |
| 1.6 | Zadat do adresy `#/neexistuje` | „Neznámý modul" s odkazem zpět, ne prázdno |

---

## 2. Hub a dlaždice

| | Krok | Co se má stát |
|---|---|---|
| 2.1 | Otevřít hub | Dlaždice mají šedá čísla v závorce za názvem |
| 2.2 | Dlaždice Pracovní výkaz | Velké stopky a tlačítko **Spustit** |
| 2.3 | Projekt po termínu nebo přes hodiny | Dlaždice Projekty má **červený** řádek dole |
| 2.4 | Když nic nehoří | Řádek dole chybí úplně, dlaždice není vyšší |
| 2.5 | Nastavení (vpravo nahoře) | Dlaždice **Lidé** a **Přístupy do projektů** |

---

## 3. Tracker (hlavní cesta vykazování)

| | Krok | Co se má stát |
|---|---|---|
| 3.1 | Na hubu **Spustit** | Čas tiká, modře, stav „měří se" |
| 3.2 | Odejít do CRM | V hlavičce **malá pilulka** s tikajícím časem |
| 3.3 | F5 | Stopky běží dál, čas navazuje |
| 3.4 | V hlavičce **Pauza** | Čas zamrzne, tečka zešedne |
| 3.5 | **Pokračovat** | Navazuje, nezačíná od nuly |
| 3.6 | **Stop** | Přesměruje do Pracovního výkazu, nahoře modrý panel s naměřeným časem |
| 3.7 | Odejít na hub bez uložení | Dlaždice i hlavička hlásí **„čeká na uložení"** |
| 3.8 | Doplnit projekt, typ práce, popis → **Uložit výkaz** | Panel zmizí, výkaz je ve výpisu pod ním |
| 3.9 | Spustit, hned Stop, **Zahodit** | Zeptá se, kolik času zahazuješ; po potvrzení je pryč |
| 3.10 | Spustit a po pár sekundách Stop → Uložit | Projde, uloží se 0,01 h — **nesmí to odmítnout** |

---

## 4. Pracovní výkaz

| | Krok | Co se má stát |
|---|---|---|
| 4.1 | Záložka **Zadat ručně** | Datum předvyplněné na dnešek |
| 4.2 | Tlačítko **Včera** | Datum se posune o den, seznam pod formulářem se přepne |
| 4.3 | Uložit výkaz | Hodiny a popis se vyprázdní, **projekt a datum zůstanou** |
| 4.4 | Změnit projekt | Typ práce se předvyplní podle role na tom projektu |
| 4.5 | Uložit s prázdnými hodinami | Hláška, ne tiché nic |
| 4.6 | Záložka **Můj výkaz** | Výchozí filtr *Tento měsíc*, nahoře součet hodin a částka |
| 4.7 | Přepnout na *Minulý měsíc* | Jiná data, součet se přepočítá |
| 4.8 | `✎` u řádku | Řádek se změní na formulář včetně typu práce |
| 4.9 | Upravit hodiny → Uložit | Nová hodnota, součet nahoře sedí |
| 4.10 | `×` | Zeptá se, pak smaže |

---

## 5. CRM

| | Krok | Co se má stát |
|---|---|---|
| 5.1 | Prázdné CRM | „Zatím žádné příležitosti", ne prázdná tabulka |
| 5.2 | **+ Nová OPP** | Řádek se založí a rovnou rozbalí |
| 5.3 | Vyplnit projekt a EST hodnotu → **Uložit změny** | `Upraveno` se posune na dnešek, suma nahoře se přepočítá |
| 5.4 | Kliknout na jiný řádek | První panel se zavře — otevřený je vždycky jen jeden |
| 5.5 | **Zmrazit** | Zůstane v Pipeline, ale odečte se z „Otevřené" |
| 5.6 | **Vyhráno** | Zmizí z Pipeline, objeví se v archivu |
| 5.7 | V archivu **Vrátit do pipeline** | Vrátí se zpátky |
| 5.8 | Smazat | Zeptá se, pak zmizí |

---

## 6. To-Do

| | Krok | Co se má stát |
|---|---|---|
| 6.1 | Do sběru napsat tři řádky → **Odložit** | Vzniknou **tři** položky, pole se vyprázdní |
| 6.2 | Kliknout na text odložené položky | Změní se na input (levý sloupec edituje klikem) |
| 6.3 | Přepsat a kliknout jinam | Uloží se |
| 6.4 | `→` | Přeskočí doprava mezi tikety |
| 6.5 | Najet myší na tiket | Teprve teď se objeví `✎` a `×` |
| 6.6 | Stáří tiketu | Nový ukazuje `0 h`, starší `3 d` |
| 6.7 | Odškrtnout tiket | Zůstane dole **přeškrtnutý** se štítkem „hotovo" |
| 6.8 | Odškrtnout zpět | Vrátí se mezi tikety |
| 6.9 | Záložka **Archiv** | Výchozí filtr *Tento týden* |
| 6.10 | Filtr *Dnes* | Dnešní položka tam je — a je i v *Tento týden* (je to rozsah, ne přihrádka) |

---

## 7. ŠG wiki

| | Krok | Co se má stát |
|---|---|---|
| 7.1 | Prázdná wiki | Vlevo „Žádné stránky", vpravo „Vyber stránku vlevo" |
| 7.2 | **+ Nová stránka** | Založí se a otevře |
| 7.3 | **Upravit** → název + markdown (nadpis, seznam, odkaz, `**tučně**`) | |
| 7.4 | **Hotovo** | Markdown je vyrenderovaný, ne jako zdroj |
| 7.5 | Přejmenovat stránku | Název vlevo se změní hned |
| 7.6 | Do textu napsat `<script>alert(1)</script>` a dát Hotovo | **Vypíše se jako text, nic se nespustí** |
| 7.7 | Napsat `[odkaz](javascript:alert(1))` | Zůstane textem, není z toho odkaz |
| 7.8 | Velmi dlouhý název | Vlevo se ořízne, sloupec se nerozbije |
| 7.9 | Smazat stránku | Zeptá se, pak zmizí |

---

## 8. Projekty

| | Krok | Co se má stát |
|---|---|---|
| 8.1 | **+ Nový projekt**, vyplnit vše včetně typu a SLA | |
| 8.2 | V Týmu přidat sebe jako Designer → **Založit projekt** | Otevře se detail |
| 8.3 | Přehled | Měrka termínu i hodin, v Ceně `+ PM …` a `3× SLA = …` |
| 8.4 | Projekt s koncem v minulosti | Červeně **„mělo skončit před X dny"** |
| 8.5 | Nastavit EST hodiny na 3 a vykázat 4 h designu | Červeně `4 / 3 h · přeteklo o 1 h` |
| 8.6 | Vykázat 2 h jako **Project management** | Designová měrka se nezmění, PM měrka ano |
| 8.7 | Detail → **Ekonomika** | „spotřebováno … zbývá …", **nikde slovo zisk** |
| 8.8 | Detail → **Výkazy** | Sazba k datu výkazu, náklad, sloupec Typ |
| 8.9 | Člověku bez sazby vykázat hodiny | Řádek „bez sazby" a poznámka dole, ne tiché nic |
| 8.10 | **Upravit** → změnit cenu → Uložit | Čísla se přepočítají |
| 8.11 | Změnit roli člena z Designer na Manager | **Staré výkazy se nepřeklasifikují** (sloupec Typ zůstane) |
| 8.12 | Smazat projekt, který má výkazy | **Musí to odmítnout** (chyba z databáze), historie času nemá mizet |

---

## 9. Uzavření projektu a ziskovost

| | Krok | Co se má stát |
|---|---|---|
| 9.1 | Detail → **Uzavřít projekt** | Zeptá se na skutečně fakturovanou cenu |
| 9.2 | Potvrdit | Projekt zmizí z Běžících, štítek „uzavřený" |
| 9.3 | **Ziskovost projektů** | Je tam, s výnosem, nákladem, ziskem a marží |
| 9.4 | Nastavení → Lidé → zpětně **zvýšit sazbu** člověka, který na něm dělal | |
| 9.5 | Zpět do Ziskovosti | **Zisk se nezměnil** — čísla jsou zmrazená |
| 9.6 | Pracovní výkaz → Zadat ručně | Uzavřený projekt **není** v nabídce |
| 9.7 | Projekt typu **Pro bono** uzavřít | Žádná marže, jen „stálo nás X" — nikde záporný zisk |
| 9.8 | Detail uzavřeného → **Otevřít znovu** | Zeptá se, pak se vrátí mezi běžící a čísla se počítají živě |

---

## 10. Peněžní moduly

| | Krok | Co se má stát |
|---|---|---|
| 10.1 | **Výplaty** | Výchozí *Tento měsíc*, nahoře souhrn |
| 10.2 | Člověku nastavit paušál 80 000 / 160 h | Ve Výplatách částka 80 000 bez ohledu na hodiny |
| 10.3 | Témuž člověku vykázat 200 h | Sloupec **Reálně** ukáže ≈ 400 Kč/h, ne 500 |
| 10.4 | Filtr *Tento rok* | Paušál × počet měsíců od ledna |
| 10.5 | **Příjmy výhled** | Karty po měsících, faktura 20 dní po konci projektu |
| 10.6 | Pod čarou v kartě | `3× SLA = …` |
| 10.7 | Projekt s propadlým termínem fakturace | Blok **„Po termínu fakturace"** červeně nahoře |
| 10.8 | Projekt bez odhadu konce | Je v bloku „Bez odhadu konce", ne tiše pryč |
| 10.9 | **Ziskovost lidí** | Nejlepší nahoře; poznámka pod tabulkou o neoceněných a interních hodinách |
| 10.10 | Přepnout na **V čase** | Měsíce místo lidí, součty sedí |
| 10.11 | **Výkon** | Kapacita = součet paušálů, využití, klientské vs. interní |

---

## 11. Dva účty — tohle je to podstatné

Potřebuješ druhý účet na `@svejda-goldmann.cz` a druhý prohlížeč (nebo anonymní okno).

| | Krok | Co se má stát |
|---|---|---|
| 11.1 | Kolega se přihlásí | **Čekárna** — žádný modul, vysvětlení, koho má požádat |
| 11.2 | Ty: Nastavení → Lidé → je v seznamu | Přibyl řádek s dnešním datem |
| 11.3 | Zapnout mu **CRM na čtení**, on F5 | Vidí CRM. **Needituje** — žádné „+ Nová OPP", panely jsou jen ke čtení |
| 11.4 | Přepnout na **editace**, F5 | Teď edituje |
| 11.5 | Přiřadit ho na projekt jako **vykazuje** | |
| 11.6 | On: Pracovní výkaz | Projekt je v nabídce, vykáže hodiny |
| 11.7 | Ty: detail projektu → Výkazy | Jeho výkaz je vidět, se sazbou |
| 11.8 | On: Můj výkaz | **Vidí jen svoje výkazy**, ne tvoje |
| 11.9 | On zadá do adresy `#/payroll` | **Odmítne ho to.** Totéž `#/staff`, `#/profit`, `#/people` |
| 11.10 | On: hub | Dlaždice Výplaty, Příjmy, Ziskovost ani Lidé tam nejsou |
| 11.11 | Ty: odebrat mu CRM, on F5 | CRM je pryč |
| 11.12 | Odebrat mu všechno, on F5 | Zpátky v čekárně |

**Když kterýkoli bod 11.8–11.10 selže, je to bezpečnostní nález, ne kosmetika.**

---

## 12. Testovací data

| | Krok | Co se má stát |
|---|---|---|
| 12.1 | Nastavení → **Testovací data** | Řekne, že v systému nic testovacího není |
| 12.2 | **Vygenerovat testovací data** | Chvíli to trvá, pak výčet: lidí, projektů, výkazů… |
| 12.3 | Lidé | Pět nových s předponou `test.`, dva na paušálu |
| 12.4 | Projekty | Deset projektů, mezi nimi jeden po termínu a jeden s přetečenými hodinami |
| 12.5 | Výkon | Dvanáct karet s hodinami kolem 110 h na osobu za měsíc |
| 12.6 | Ziskovost lidí | Všichni mají prodáno, náklad i marži |
| 12.7 | **Vygenerovat znovu** | Počty zůstanou podobné, **nezdvojnásobí se** |
| 12.8 | **Smazat testovací data** | Potvrzení, pak výčet smazaného |
| 12.9 | Lidé | `test.*` jsou pryč, **ty a David zůstali** |
| 12.10 | Tvoje vlastní výkazy a projekty | Zůstaly nedotčené |

**Krok 12.9 a 12.10 je to podstatné** — ověřuje, že mazání nesáhlo na opravdová data.

---

## Co tenhle seznam nepokrývá

- **Hodiny a projektová data před kolegou s právem na Projekty.** Sazby chrání
  RLS, ale kdo smí číst Projekty, dostane se přes konzoli i k výkazům ostatních.
  Vědomé, zapsané v `PRD.md`.
- **Mobil.** Rozložení se skládá pod sebe, ale nikdo to pořádně neproklikal.
- **Souběžná editace.** Když dva mění stejný řádek, vyhraje poslední. Bez varování.
