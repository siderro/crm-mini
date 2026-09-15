-- Generátor testovacích dat.
--
-- PROČ V DATABÁZI A NE V PROHLÍŽEČI:
-- RLS správně zakazuje zapsat výkaz za někoho jiného (`email = current_email()`).
-- Generátor ale musí vykázat práci pěti vymyšleným lidem, takže nemůže běžet
-- pod přihlášeným uživatelem. Řeší to `security definer` funkce — běží pod
-- vlastníkem databáze, ale hned na začátku si sama ověří, že ji volá superadmin.
-- Politiky na tabulkách tím zůstávají nedotčené.
--
-- JAK SE POZNÁ, CO JE TESTOVACÍ:
-- Příznak `is_dummy` na tabulkách, které nemají vlastníka (lidé, projekty,
-- příležitosti, wiki, to-do). Všechno ostatní se pozná přes cizí klíč na ně.
-- Mazání se tak nikdy nemůže dotknout opravdových dat — a nemusí znát
-- žádná konkrétní jména.

-- ── Příznak testovacích dat ──

alter table public.app_users  add column if not exists is_dummy boolean not null default false;
alter table public.projects   add column if not exists is_dummy boolean not null default false;
alter table public.crm_opps   add column if not exists is_dummy boolean not null default false;
alter table public.wiki_pages add column if not exists is_dummy boolean not null default false;
alter table public.todo_items add column if not exists is_dummy boolean not null default false;

create index if not exists app_users_dummy_idx  on public.app_users (is_dummy) where is_dummy;
create index if not exists projects_dummy_idx   on public.projects (is_dummy) where is_dummy;


-- ══════════════════════════════════════════════════════════════
-- Smazání
-- ══════════════════════════════════════════════════════════════

create or replace function public.delete_dummy_data()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  smazano jsonb := '{}'::jsonb;
  pocet int;
begin
  if not public.is_superadmin() then
    raise exception 'Testovací data smí mazat jen superadmin';
  end if;

  -- Pořadí je dané cizími klíči. Výkazy musí jít první: projekt s výkazy
  -- databáze smazat nedovolí (on delete restrict) — a je to tak správně.
  delete from public.timesheet
   where project_id in (select id from public.projects where is_dummy)
      or email in (select email from public.app_users where is_dummy);
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('vykazy', pocet);

  delete from public.project_members
   where project_id in (select id from public.projects where is_dummy)
      or email in (select email from public.app_users where is_dummy);
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('prirazeni', pocet);

  delete from public.rates where email in (select email from public.app_users where is_dummy);
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('sazby', pocet);

  delete from public.todo_items where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('ukoly', pocet);

  delete from public.crm_opps where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('prilezitosti', pocet);

  delete from public.wiki_pages where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('stranky', pocet);

  delete from public.projects where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('projekty', pocet);

  -- Opravdoví lidé nemají is_dummy, takže se jich to nedotkne.
  delete from public.app_users where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('lide', pocet);

  return smazano;
end $$;


-- ══════════════════════════════════════════════════════════════
-- Přehled, co je vygenerované
-- ══════════════════════════════════════════════════════════════

create or replace function public.dummy_data_stats()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Přehled testovacích dat vidí jen superadmin';
  end if;

  return jsonb_build_object(
    'lide',         (select count(*) from public.app_users where is_dummy),
    'projekty',     (select count(*) from public.projects where is_dummy),
    'sazby',        (select count(*) from public.rates
                      where email in (select email from public.app_users where is_dummy)),
    'vykazy',       (select count(*) from public.timesheet
                      where project_id in (select id from public.projects where is_dummy)
                         or email in (select email from public.app_users where is_dummy)),
    'prilezitosti', (select count(*) from public.crm_opps where is_dummy),
    'stranky',      (select count(*) from public.wiki_pages where is_dummy),
    'ukoly',        (select count(*) from public.todo_items where is_dummy)
  );
end $$;


-- ══════════════════════════════════════════════════════════════
-- Generování
-- ══════════════════════════════════════════════════════════════

create or replace function public.generate_dummy_data()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  ja text := public.current_email();

  -- Lidé: tři na hodinovce, dva na paušálu. Prefix `test.` je schválně vidět
  -- v UI, ať je na první pohled jasné, že to nejsou opravdoví kolegové.
  lide text[] := array[
    'test.anna@svejda-goldmann.cz',
    'test.bohumil@svejda-goldmann.cz',
    'test.cyril@svejda-goldmann.cz',
    'test.dana@svejda-goldmann.cz',
    'test.eva@svejda-goldmann.cz'
  ];

  popisy_design text[] := array[
    'Wireframy hlavní stránky', 'Návrh vizuálního stylu', 'Revize typografie',
    'Úpravy po připomínkách klienta', 'Příprava podkladů pro tisk',
    'Export assetů pro vývoj', 'Retuš fotografií', 'Návrh mobilní verze',
    'Ikonografie a piktogramy', 'Korektura textů v layoutu',
    'Druhá varianta titulní strany', 'Sazba brožury', 'Doladění barevnosti',
    'Prototyp v Figmě', 'Kontrola tiskových dat'
  ];

  popisy_pm text[] := array[
    'Call s klientem', 'Plánování další fáze', 'Koordinace s vývojem',
    'Reporting a podklady k fakturaci', 'Zapracování zadání',
    'Interní review', 'Schůzka nad rozpočtem', 'Zadání pro tiskárnu'
  ];

  p_id uuid;
  clovek text;
  role_na_projektu text;
  mesic int;
  den date;
  cil numeric;
  zbyva numeric;
  kus numeric;
  moje_projekty uuid[];
  moje_role text[];
  volba int;
  vybrany uuid;
  druh text;
  vlozeno int := 0;
begin
  if not public.is_superadmin() then
    raise exception 'Testovací data smí generovat jen superadmin';
  end if;

  -- Vždycky se začíná z čista, ať opakované spuštění nenadělá duplikáty.
  perform public.delete_dummy_data();

  -- ── Lidé ──
  insert into public.app_users (email, first_login, last_login, modules, is_dummy)
  select
    e,
    now() - (interval '1 day' * (300 + random() * 100)),
    now() - (interval '1 day' * (random() * 5)),
    '{"crm":"read","todo":"edit","timesheet":"edit","wiki":"read"}'::jsonb,
    true
  from unnest(lide) as e;

  -- ── Sazby ──
  -- Anna a Dana mají dvě verze, aby se dalo ověřit, že se sazba páruje
  -- k datu výkazu a ne k dnešku.
  insert into public.rates (email, type, rate, monthly_amount, monthly_hours, valid_from) values
    ('test.anna@svejda-goldmann.cz',    'hourly',  550, null, null, current_date - interval '18 months'),
    ('test.anna@svejda-goldmann.cz',    'hourly',  650, null, null, current_date - interval '6 months'),
    ('test.bohumil@svejda-goldmann.cz', 'hourly',  420, null, null, current_date - interval '18 months'),
    ('test.cyril@svejda-goldmann.cz',   'hourly',  780, null, null, current_date - interval '18 months'),
    ('test.dana@svejda-goldmann.cz',    'monthly', null, 64000, 160, current_date - interval '18 months'),
    ('test.dana@svejda-goldmann.cz',    'monthly', null, 72000, 160, current_date - interval '4 months'),
    ('test.eva@svejda-goldmann.cz',     'monthly', null, 88000, 160, current_date - interval '18 months');

  -- ── Projekty ──
  -- Schválně pestrá směs, ať jde proklikat každý stav: uzavřené, běžící,
  -- po termínu, přetečené hodiny, bez termínu, pro bono a interní.
  insert into public.projects
    (name, billing, est_start, est_end, est_hours, est_price, est_pm, est_sla,
     status, closed_at, final_price, is_dummy)
  values
    ('Web pro Alfa Consulting', 'client',
     current_date - interval '11 months', current_date - interval '8 months',
     220, 520000, 78000, 12000, 'closed', now() - interval '8 months', 540000, true),

    ('Redesign e-shopu Beta', 'client',
     current_date - interval '9 months', current_date - interval '5 months',
     340, 780000, 94000, 15000, 'closed', now() - interval '5 months', 720000, true),

    ('Identita pro Cedr', 'client',
     current_date - interval '7 months', current_date - interval '3 months',
     120, 260000, 31000, null, 'closed', now() - interval '3 months', 260000, true),

    ('Kampaň Delta jaro', 'client',
     current_date - interval '4 months', current_date + interval '2 months',
     180, 430000, 60000, 9000, 'active', null, null, true),

    ('Portál Epsilon', 'client',
     current_date - interval '5 months', current_date + interval '4 months',
     420, 890000, 133000, 14000, 'active', null, null, true),

    -- konec už uplynul a pořád běží → červený stav v přehledu
    ('Katalog Fénix 2026', 'client',
     current_date - interval '6 months', current_date - interval '18 days',
     150, 320000, 40000, null, 'active', null, null, true),

    -- nízký odhad hodin proti odvedené práci → přeteklé hodiny
    ('Brand manuál Gama', 'client',
     current_date - interval '3 months', current_date + interval '1 month',
     60, 190000, 24000, 8000, 'active', null, null, true),

    -- bez odhadu konce → spadne do „Bez odhadu konce" v Příjmech
    ('Průběžná péče Hejkal', 'client',
     current_date - interval '2 months', null,
     null, 150000, null, 11000, 'active', null, null, true),

    ('Web pro spolek Iris', 'probono',
     current_date - interval '2 months', current_date + interval '3 months',
     80, null, null, null, 'active', null, null, true),

    ('Vlastní prezentace studia', 'internal',
     current_date - interval '10 months', current_date + interval '6 months',
     200, null, null, null, 'active', null, null, true);

  -- ── Kdo je na čem ──
  -- Každý dostane dva až čtyři projekty; superadmin je na všech, aby měl
  -- kam vykazovat trackerem. Manažerská role je vždycky jen jedna na projekt.
  for p_id in select id from public.projects where is_dummy loop
    insert into public.project_members (project_id, email, level, role)
    values (p_id, ja, 'report', 'manager')
    on conflict do nothing;

    insert into public.project_members (project_id, email, level, role)
    select p_id, e, 'report', 'designer'
      from unnest(lide) as e
     where random() < 0.55
    on conflict do nothing;
  end loop;

  -- Kdo nakonec nevyšel nikde, dostane jeden projekt — nikdo nesmí zůstat
  -- bez práce, jinak by v Ziskovosti lidí chyběl.
  insert into public.project_members (project_id, email, level, role)
  select (select id from public.projects where is_dummy order by random() limit 1), e, 'report', 'designer'
    from unnest(lide) as e
   where not exists (select 1 from public.project_members m where m.email = e)
  on conflict do nothing;

  -- ── Výkazy ──
  -- Dvanáct měsíců zpět, každý člověk ~110 h za měsíc ±10 %, rozdělené po
  -- pracovních dnech mezi projekty, které v tom měsíci opravdu běžely.
  foreach clovek in array (lide || ja) loop
    for mesic in 0..11 loop
      cil := 110 * (0.9 + random() * 0.2);
      zbyva := cil;

      -- Projekty, na které ten člověk smí a které v tom měsíci běžely.
      -- Role se tahá zároveň — jinak by to byl jeden dotaz na každý výkaz.
      select array_agg(m.project_id), array_agg(m.role)
        into moje_projekty, moje_role
        from public.project_members m
        join public.projects p on p.id = m.project_id
       where m.email = clovek
         and p.is_dummy
         and coalesce(p.est_start, current_date - interval '24 months')
               <= (date_trunc('month', current_date) - (interval '1 month' * mesic) + interval '1 month' - interval '1 day')::date
         and coalesce(p.est_end, p.closed_at::date, current_date + interval '24 months')
               >= (date_trunc('month', current_date) - (interval '1 month' * mesic))::date;

      continue when moje_projekty is null;

      for den in
        select d::date
          from generate_series(
                 (date_trunc('month', current_date) - (interval '1 month' * mesic))::date,
                 least(
                   (date_trunc('month', current_date) - (interval '1 month' * mesic) + interval '1 month' - interval '1 day')::date,
                   current_date),
                 interval '1 day') as d
         where extract(isodow from d) <= 5
         order by random()
      loop
        exit when zbyva <= 0.5;

        kus := least(zbyva, (array[1, 1.5, 2, 3, 4, 6])[1 + floor(random() * 6)::int]);

        volba := 1 + floor(random() * array_length(moje_projekty, 1))::int;
        vybrany := moje_projekty[volba];
        role_na_projektu := moje_role[volba];

        -- Manažer většinou vykazuje PM, ale ne výhradně — občas i designovou práci.
        druh := case when role_na_projektu = 'manager' and random() < 0.8 then 'pm' else 'design' end;

        insert into public.timesheet (project_id, email, "date", hours, kind, note)
        values (
          vybrany, clovek, den, kus, druh,
          case when druh = 'pm'
            then popisy_pm[1 + floor(random() * array_length(popisy_pm, 1))::int]
            else popisy_design[1 + floor(random() * array_length(popisy_design, 1))::int]
          end);

        zbyva := zbyva - kus;
        vlozeno := vlozeno + 1;
      end loop;
    end loop;
  end loop;

  -- ── CRM ──
  insert into public.crm_opps (project, contact, est_value, notes, status, created_at, updated_at, is_dummy) values
    ('Rebranding Jantar', 'Petra Svobodová', 450000,
     'Poslán návrh, čekáme na zpětnou vazbu. Rozhodnutí do konce měsíce.',
     'open', current_date - 12, current_date - 3, true),
    ('Web pro Klenot s.r.o.', 'Jan Novák', 280000,
     'Rozpočet schválen, řešíme termín zahájení.', 'open', current_date - 25, current_date - 1, true),
    ('Obalový design Limba', 'Tomáš Dvořák', 190000,
     'Zaujal je náš katalog. Sejdeme se příští týden.', 'open', current_date - 6, current_date - 6, true),
    ('Výroční zpráva Modřín', 'Alena Krejčí', 120000,
     'Loni to dělal někdo jiný, chtějí srovnat nabídky.', 'open', current_date - 40, current_date - 14, true),
    ('Kampaň Nektar', 'Michal Horák', 600000,
     'Odloženo na další kvartál, rozpočet zamrzl.', 'frozen', current_date - 70, current_date - 30, true),
    ('Katalog Oliva', 'Věra Marková', 210000,
     'Odložili to na neurčito.', 'frozen', current_date - 90, current_date - 45, true),
    ('Identita Prsten', 'Lucie Benešová', 340000,
     'Vyhráli jsme. Smlouva podepsána, začínáme.', 'won', current_date - 120, current_date - 100, true),
    ('Web Rybíz', 'David Urban', 260000,
     'Šlo to ke konkurenci kvůli ceně.', 'lost', current_date - 150, current_date - 130, true);

  -- ── Wiki ──
  insert into public.wiki_pages (title, "text", updated_at, updated_by, is_dummy) values
    ('Jak zakládáme projekt',
'# Jak zakládáme projekt

Než se začne dělat, musí být v systému **založený projekt** s odhadem hodin a ceny.
Bez toho se nedá vykazovat a ziskovost nemá z čeho počítat.

## Postup

1. Projekty → **+ Nový projekt**
2. Vyplnit název, termíny a odhady
3. Přidat lidi do týmu — kdo je v týmu, může do projektu vykazovat
4. Poslat odkaz na projekt do kanálu

## Na co nezapomenout

- **Estimated hodiny** jsou jen na design. Project management se do nich nepočítá.
- SLA se účtuje za *každý* kalendářní měsíc, ve kterém projekt běží.
- Pro bono a interní projekty označ typem, ať nekazí marži.

> Když si nejsi jistý odhadem, radši ho nadsaď. Přetečené hodiny jsou vidět
> na první pohled a nikoho to nepotěší.',
     now() - interval '4 days', 'test.anna@svejda-goldmann.cz', true),

    ('Vykazování práce',
'# Vykazování práce

Hlavní cesta je **tracker** na hlavní stránce. Spustíš ho, když začneš dělat,
a zastavíš, když skončíš. Pak doplníš projekt a popis.

Když se zapomene, jde výkaz zapsat ručně: Pracovní výkaz → *Zadat ručně*.

## Typ práce

- **Design** — dodaná práce, jde proti odhadu hodin
- **Project management** — koordinace, calls, reporting

Předvyplní se podle tvojí role na projektu, ale jde to přepnout.

## Popis

Piš, co by dalo smysl klientovi. Ne `práce`, ale `Wireframy hlavní stránky`.',
     now() - interval '11 days', 'test.dana@svejda-goldmann.cz', true),

    ('Tiskové podklady — checklist',
'# Tiskové podklady

Před odesláním do tiskárny projít:

- spadávka **3 mm** na všech stranách
- texty v křivkách, nebo přiložené fonty
- obrázky v **CMYK**, 300 dpi
- ořezové značky zapnuté
- korektura odkliknutá klientem *písemně*

Export: `PDF/X-4`, bez komprese obrázků.

---

Kontakty na tiskárny jsou ve [firemním disku](https://example.com).',
     now() - interval '23 days', 'test.cyril@svejda-goldmann.cz', true),

    ('Onboarding nového člověka',
'# Onboarding

## První den

1. Google účet na doméně
2. Přihlásit se do Brevisu — skončí v čekárně
3. Jakub zapne moduly a nastaví hodinovou sazbu
4. Přiřadit na projekty, na kterých bude dělat

## Co si přečíst

- [Jak zakládáme projekt](#/wiki)
- [Vykazování práce](#/wiki)

Bez sazby se práce toho člověka nepočítá do nákladů projektu — pozná se to
tím, že v detailu projektu svítí *bez sazby*.',
     now() - interval '35 days', 'test.eva@svejda-goldmann.cz', true),

    ('Ceník a sazby',
'# Jak se staví cena

Cena projektu má **tři složky**, které se nesčítají do jednoho čísla:

| Složka | Jednotka | Poznámka |
|---|---|---|
| Design | hodiny | je v ní zisk |
| Project management | % z ceny | zadává se jako částka |
| SLA | měsíčně | za přístupy do služeb |

*Tabulky zatím wiki neumí, tak je to jen jako ukázka.*

## Interní sazby

Sazba v systému je **náklad**, ne to, co účtujeme klientovi.',
     now() - interval '60 days', 'test.anna@svejda-goldmann.cz', true);

  -- ── To-Do ──
  -- Patří přihlášenému, protože RLS pouští každému jen jeho vlastní úkoly —
  -- cizí by nebyly vidět a k ničemu by nebyly.
  insert into public.todo_items (email, "text", stage, created_at, promoted_at, done_at, is_dummy) values
    (ja, 'Zavolat do Jantaru kvůli zpětné vazbě', 'ticket', now() - interval '9 days', now() - interval '8 days', null, true),
    (ja, 'Dodělat odhad pro Klenot', 'ticket', now() - interval '5 days', now() - interval '5 days', null, true),
    (ja, 'Poslat fakturu za Cedr', 'ticket', now() - interval '2 days', now() - interval '2 days', null, true),
    (ja, 'Projít s Danou kapacitu na příští měsíc', 'ticket', now() - interval '1 day', now() - interval '1 day', null, true),
    (ja, 'Nový web tiskárny — mrknout na ceny', 'raw', now() - interval '6 days', null, null, true),
    (ja, 'Vymyslet lepší onboarding do wiki', 'raw', now() - interval '3 days', null, null, true),
    (ja, 'Objednat papír na vzorníky', 'raw', now() - interval '1 day', null, null, true),
    (ja, 'Zaplatit licence na Adobe', 'done', now() - interval '4 days', now() - interval '4 days', now() - interval '6 hours', true),
    (ja, 'Odpovědět Modřínu na poptávku', 'done', now() - interval '10 days', now() - interval '9 days', now() - interval '8 days', true),
    (ja, 'Aktualizovat portfolio o Cedr', 'done', now() - interval '30 days', now() - interval '28 days', now() - interval '20 days', true);

  return public.dummy_data_stats() || jsonb_build_object('vlozeno_vykazu', vlozeno);
end $$;


-- ── Oprávnění ──
-- Funkce si samy ověřují superadmina, takže je může zavolat kdokoli
-- přihlášený — komukoli jinému skončí výjimkou.

revoke execute on function public.generate_dummy_data() from public;
revoke execute on function public.delete_dummy_data() from public;
revoke execute on function public.dummy_data_stats() from public;

grant execute on function public.generate_dummy_data() to authenticated;
grant execute on function public.delete_dummy_data() to authenticated;
grant execute on function public.dummy_data_stats() to authenticated;
