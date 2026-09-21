-- Brevis — testovací data pro Náklady a role u vymyšlených lidí.
--
-- Migrace 002 je zamčená, takže se její funkce nepřepisují na místě, ale
-- nahrazují přes `create or replace`. Dvě z nich jsou krátké a redefinují se
-- celé; generátor má přes tři sta řádků, takže se místo kopírování přejmenuje
-- na `generate_dummy_core()` a obalí. Kdyby se kopíroval, byly by v repozitáři
-- dvě verze téhož a jedna z nich mrtvá.
--
-- Snapshot uzavřených projektů (`projects.final`) se tu **nedopočítává
-- schválně.** Šlo by to, ale znamenalo by to přepsat `compute()` z
-- src/modules/projects/model.js do SQL — a dvě verze pravidel o penězích se
-- dřív nebo později rozejdou. Pak by testovací data „dokazovala" něco jiného,
-- než co dělá aplikace. Dopočítá je proto klient (src/modules/devdata/store.js)
-- toutéž funkcí, kterou používá opravdové uzavření projektu.

-- ══════════════════════════════════════════════════════════════
-- Mazání — přibyly náklady
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

  delete from public.costs where is_dummy;
  get diagnostics pocet = row_count;
  smazano := smazano || jsonb_build_object('naklady', pocet);

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
-- Přehled — přibyly náklady
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
    'ukoly',        (select count(*) from public.todo_items where is_dummy),
    'naklady',      (select count(*) from public.costs where is_dummy)
  );
end $$;

-- ══════════════════════════════════════════════════════════════
-- Co k datům přibylo: náklady a role
-- ══════════════════════════════════════════════════════════════

/* Pravidlo, které drží daň za generátor na uzdě: plní se jen to, bez čeho
   modul nejde posoudit, ne každý sloupec. Pro Náklady to znamená mít od
   každého tvaru aspoň jeden kus — měsíční, roční, ukončený, jednorázový. */
create or replace function public.generate_dummy_extras()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Testovací data smí generovat jen superadmin';
  end if;

  -- ── Pravidelné náklady ──
  insert into public.costs (kind, name, amount, period, due_month, valid_from, valid_to, note, is_dummy)
  values
    ('recurring', 'Nájem ateliéru',        38000, 'monthly', null, current_date - interval '3 years', null, null, true),
    ('recurring', 'Adobe Creative Cloud',   4200, 'monthly', null, current_date - interval '2 years', null, '5 licencí', true),
    ('recurring', 'Figma',                  2800, 'monthly', null, current_date - interval '18 months', null, null, true),
    ('recurring', 'Účetní',                 9000, 'monthly', null, current_date - interval '3 years', null, null, true),
    ('recurring', 'Internet a telefony',    3100, 'monthly', null, current_date - interval '3 years', null, null, true),
    -- ukončené předplatné: nesmí se ve výhledu objevit v budoucích měsících
    ('recurring', 'Staré CRM',              1900, 'monthly', null, current_date - interval '2 years',
                                                                   current_date - interval '2 months', 'vypovězeno', true),
    -- roční: musí spadnout celé do jednoho měsíce, ne po dvanáctinách
    ('recurring', 'Pojištění odpovědnosti', 26000, 'yearly', 3, current_date - interval '3 years', null, null, true),
    ('recurring', 'Doména a hosting',        7400, 'yearly', 9, current_date - interval '4 years', null, null, true);

  -- ── Jednorázové náklady ──
  -- Jeden v minulosti (do výhledu nesmí), zbytek dopředu, jeden do 30 dnů,
  -- aby se dalo ověřit hlášení na dlaždici.
  insert into public.costs (kind, name, amount, due_date, note, is_dummy)
  values
    ('onetime', 'Oprava auta',        30000, current_date + interval '12 days', 'spojka', true),
    ('onetime', 'Nové notebooky',    124000, current_date + interval '3 months', '2 kusy', true),
    ('onetime', 'Veletrh — stánek',   58000, current_date + interval '5 months', null, true),
    ('onetime', 'Rekonstrukce kuchyňky', 41000, current_date - interval '1 month', 'hotovo', true);

  -- ── Role ──
  -- Vymyšlení lidé mají role, ať jde na nich proklikat, co která vidí.
  -- Mapa modulů zůstává z generátoru; role jen dorovná hodnost.
  update public.app_users set role = 'designer' where is_dummy;
  update public.app_users set role = 'manager'
   where is_dummy and email in ('test.dana@svejda-goldmann.cz', 'test.eva@svejda-goldmann.cz');
end $$;

-- ══════════════════════════════════════════════════════════════
-- Generátor: původní tělo se přejmenuje a obalí
-- ══════════════════════════════════════════════════════════════

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'generate_dummy_data'
  ) and not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'generate_dummy_core'
  ) then
    alter function public.generate_dummy_data() rename to generate_dummy_core;
  end if;
end $$;

create or replace function public.generate_dummy_data()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  zaklad jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'Testovací data smí generovat jen superadmin';
  end if;

  -- Jádro si samo nejdřív smaže stávající sadu (včetně nákladů, viz výš),
  -- takže opakované spuštění nenadělá duplikáty.
  zaklad := public.generate_dummy_core();
  perform public.generate_dummy_extras();

  return zaklad || public.dummy_data_stats();
end $$;

-- ── Oprávnění ──
-- Funkce si samy ověřují superadmina, takže je může zavolat kdokoli
-- přihlášený — komukoli jinému skončí výjimkou.

revoke execute on function public.generate_dummy_core() from public;
revoke execute on function public.generate_dummy_extras() from public;
revoke execute on function public.generate_dummy_data() from public;

grant execute on function public.generate_dummy_core() to authenticated;
grant execute on function public.generate_dummy_extras() to authenticated;
grant execute on function public.generate_dummy_data() to authenticated;
