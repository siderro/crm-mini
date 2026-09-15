-- Test řádkové bezpečnosti (RLS).
--
-- Kontroly v prohlížeči jsou kosmetika — kdo si otevře konzoli, obejde je.
-- Skutečnou hranicí jsou politiky v databázi a tenhle skript je ověřuje.
--
-- SPUŠTĚNÍ: celé vložit do Supabase SQL editoru a spustit.
--
-- Celé běží v jedné transakci, která na konci skončí ROLLBACKem — **v datech
-- po něm nic nezůstane**, takže se dá pouštět i na ostrém projektu.
--
-- Cizí identita se předstírá bez druhého účtu: `request.jwt.claims` je přesně
-- to, z čeho čte `auth.jwt()`, a role `authenticated` je ta, pod kterou běží
-- přihlášený člověk.
--
-- Skript skončí chybou na PRVNÍM porušení. Když doběhne až na konec a vypíše
-- „VŠECHNY TESTY PROŠLY", je to v pořádku.

begin;

-- ── Pomůcky ──

create or replace function pg_temp.assert(ok boolean, msg text)
returns void language plpgsql as $$
begin
  if not ok then raise exception 'SELHALO: %', msg; end if;
end $$;

/** Přepne se na daného člověka. */
create or replace function pg_temp.become(p_email text)
returns void language plpgsql as $$
begin
  execute format('set local request.jwt.claims = %L', json_build_object('email', p_email)::text);
  set local role authenticated;
end $$;

-- ── Příprava dat ──
-- Běží pod vlastníkem databáze, takže se politiky neuplatňují.

-- Superadmin musí být ten opravdový — is_superadmin() ho pozná podle e-mailu.
-- Jeho řádek už existuje a nesaháme na něj; jeho práva plynou z konfigurace,
-- v datech má prázdné `modules`, takže se podle nich nedá nic testovat.
insert into public.app_users (email, modules) values
  ('jakub@svejda-goldmann.cz', '{}'::jsonb)
on conflict (email) do nothing;

-- Testovací lidé mají prefix, aby se nepletli s opravdovými.
-- Druhý z nich má nastavená práva — na něm se ověřuje, že mu je nikdo nesebere.
insert into public.app_users (email, modules) values
  ('test-kolega@svejda-goldmann.cz', '{}'::jsonb),
  ('test-druhy@svejda-goldmann.cz', '{"crm":"read"}'::jsonb);

insert into public.rates (id, email, type, rate, valid_from) values
  ('11111111-1111-1111-1111-111111111111', 'test-druhy@svejda-goldmann.cz', 'hourly', 1500, '2026-01-01'),
  ('22222222-2222-2222-2222-222222222222', 'test-kolega@svejda-goldmann.cz', 'hourly', 800, '2026-01-01');

insert into public.projects (id, name, est_hours, est_price, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TEST běžící', 100, 400000, 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'TEST cizí', 50, 200000, 'active');

insert into public.projects (id, name, status, closed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'TEST uzavřený', 'closed', now());

insert into public.project_members (project_id, email, level, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'test-kolega@svejda-goldmann.cz', 'report', 'designer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'test-kolega@svejda-goldmann.cz', 'report', 'designer');

insert into public.timesheet (id, project_id, email, "date", hours, kind) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'test-druhy@svejda-goldmann.cz', current_date, 4, 'design');

insert into public.crm_opps (project, est_value) values ('TEST příležitost', 100000);
insert into public.wiki_pages (title, "text") values ('TEST stránka', 'obsah');


-- ══════════════════════════════════════════════════════════════
-- 1. Účet mimo doménu nesmí nikam
-- ══════════════════════════════════════════════════════════════

select pg_temp.become('utocnik@jinafirma.cz');

do $$
begin
  perform pg_temp.assert((select count(*) from public.crm_opps) = 0, 'cizí doména čte CRM');
  perform pg_temp.assert((select count(*) from public.wiki_pages) = 0, 'cizí doména čte wiki');
  perform pg_temp.assert((select count(*) from public.projects) = 0, 'cizí doména čte projekty');
  perform pg_temp.assert((select count(*) from public.rates) = 0, 'cizí doména čte sazby');
  perform pg_temp.assert((select count(*) from public.timesheet) = 0, 'cizí doména čte výkazy');
  perform pg_temp.assert((select count(*) from public.app_users) = 0, 'cizí doména čte seznam lidí');
end $$;

do $$
begin
  begin
    insert into public.app_users (email) values ('utocnik@jinafirma.cz');
    raise exception 'SELHALO: cizí doména si založila účet';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ══════════════════════════════════════════════════════════════
-- 2. Kolega bez práv nevidí obsah modulů
-- ══════════════════════════════════════════════════════════════

reset role;
select pg_temp.become('test-kolega@svejda-goldmann.cz');

do $$
begin
  perform pg_temp.assert((select count(*) from public.crm_opps) = 0, 'kolega bez práv čte CRM');
  perform pg_temp.assert((select count(*) from public.wiki_pages) = 0, 'kolega bez práv čte wiki');
  -- projekty vidí jen ty, na které je přiřazený (potřebuje je k vykazování)
  perform pg_temp.assert((select count(*) from public.projects) = 2,
    'kolega vidí jiné projekty než ty svoje');
  -- seznam lidí ve firmě vidět smí, potřebují ho výběry
  perform pg_temp.assert((select count(*) from public.app_users) > 0, 'kolega nevidí seznam lidí');
end $$;


-- ══════════════════════════════════════════════════════════════
-- 3. Sazby jsou mzdový údaj
-- ══════════════════════════════════════════════════════════════

do $$
begin
  perform pg_temp.assert(
    (select count(*) from public.rates where email <> 'test-kolega@svejda-goldmann.cz') = 0,
    'kolega vidí cizí sazbu');
  perform pg_temp.assert(
    (select count(*) from public.rates where email = 'test-kolega@svejda-goldmann.cz') = 1,
    'kolega nevidí ani svoji vlastní sazbu');

  begin
    insert into public.rates (email, type, rate, valid_from)
      values ('test-kolega@svejda-goldmann.cz', 'hourly', 99999, '2026-01-01');
    raise exception 'SELHALO: kolega si zapsal vlastní sazbu';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.rates set rate = 99999 where email = 'test-druhy@svejda-goldmann.cz';
    perform pg_temp.assert(
      (select rate from public.rates where id = '11111111-1111-1111-1111-111111111111') = 1500,
      'kolega přepsal cizí sazbu');
  exception when insufficient_privilege then null;
  end;
end $$;


-- ══════════════════════════════════════════════════════════════
-- 4. Nikdo si nesmí přepsat vlastní práva
--    (tohle je jádro celého systému přístupů)
-- ══════════════════════════════════════════════════════════════

do $$
begin
  begin
    update public.app_users
       set modules = '{"pm":"edit","crm":"edit"}'::jsonb
     where email = 'test-kolega@svejda-goldmann.cz';

    perform pg_temp.assert(
      (select modules from public.app_users where email = 'test-kolega@svejda-goldmann.cz') = '{}'::jsonb,
      'kolega si zapnul moduly sám sobě');
  exception when insufficient_privilege then null;
  end;

  -- Sebrat práva někomu jinému: politika řádek vůbec nenajde, takže se nic
  -- nestane a nic se nevyhodí. Ověřuje se proto hodnota, ne výjimka.
  begin
    update public.app_users set modules = '{}'::jsonb
     where email = 'test-druhy@svejda-goldmann.cz';

    perform pg_temp.assert(
      (select modules from public.app_users where email = 'test-druhy@svejda-goldmann.cz')
        = '{"crm":"read"}'::jsonb,
      'kolega sebral práva někomu jinému');
  exception when insufficient_privilege then null;
  end;
end $$;

-- Posunout si vlastní přihlášení ale smí — bez toho by se nikdo nepřihlásil.
do $$
begin
  update public.app_users set last_login = now() where email = 'test-kolega@svejda-goldmann.cz';
  perform pg_temp.assert(found, 'kolega si nemůže posunout last_login, přihlášení by selhalo');
end $$;


-- ══════════════════════════════════════════════════════════════
-- 5. Vykazovat jde jen za sebe, jen kam smím, jen dokud projekt běží
-- ══════════════════════════════════════════════════════════════

do $$
begin
  -- vlastní výkaz do projektu s 'report' projde
  insert into public.timesheet (project_id, email, "date", hours, kind)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'test-kolega@svejda-goldmann.cz', current_date, 2, 'design');

  -- cizím jménem ne
  begin
    insert into public.timesheet (project_id, email, "date", hours, kind)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'test-druhy@svejda-goldmann.cz', current_date, 2, 'design');
    raise exception 'SELHALO: kolega vykázal za někoho jiného';
  exception when insufficient_privilege then null;
  end;

  -- do projektu, na kterém není, ne
  begin
    insert into public.timesheet (project_id, email, "date", hours, kind)
      values ('aaaaaaaa-0000-0000-0000-000000000002', 'test-kolega@svejda-goldmann.cz', current_date, 2, 'design');
    raise exception 'SELHALO: kolega vykázal do projektu, na který nemá přístup';
  exception when insufficient_privilege then null;
  end;

  -- do uzavřeného projektu ne, i když na něm je přiřazený
  begin
    insert into public.timesheet (project_id, email, "date", hours, kind)
      values ('aaaaaaaa-0000-0000-0000-000000000003', 'test-kolega@svejda-goldmann.cz', current_date, 2, 'design');
    raise exception 'SELHALO: kolega vykázal do uzavřeného projektu';
  exception when insufficient_privilege then null;
  end;
end $$;


-- ══════════════════════════════════════════════════════════════
-- 6. Cizí výkaz nejde upravit ani smazat
-- ══════════════════════════════════════════════════════════════

do $$
begin
  update public.timesheet set hours = 999 where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  perform pg_temp.assert(not found, 'kolega upravil cizí výkaz');

  delete from public.timesheet where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  perform pg_temp.assert(not found, 'kolega smazal cizí výkaz');
end $$;


-- ══════════════════════════════════════════════════════════════
-- 7. Wiki: čtení a editace se musí lišit
-- ══════════════════════════════════════════════════════════════

reset role;
update public.app_users set modules = '{"wiki":"read"}'::jsonb
 where email = 'test-kolega@svejda-goldmann.cz';
select pg_temp.become('test-kolega@svejda-goldmann.cz');

do $$
begin
  perform pg_temp.assert((select count(*) from public.wiki_pages) > 0, 'úroveň read nečte wiki');

  begin
    insert into public.wiki_pages (title, "text") values ('Podvrh', 'x');
    raise exception 'SELHALO: úroveň read zapsala do wiki';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.wiki_pages set title = 'Přepsáno';
    perform pg_temp.assert(not found, 'úroveň read přepsala stránku');
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
update public.app_users set modules = '{"wiki":"edit"}'::jsonb
 where email = 'test-kolega@svejda-goldmann.cz';
select pg_temp.become('test-kolega@svejda-goldmann.cz');

do $$
begin
  insert into public.wiki_pages (title, "text") values ('Od kolegy', 'obsah');
  perform pg_temp.assert(found, 'úroveň edit nezapsala do wiki');
end $$;


-- ══════════════════════════════════════════════════════════════
-- 8. Projekt s výkazy nejde smazat
-- ══════════════════════════════════════════════════════════════

reset role;
update public.app_users set modules = '{"pm":"edit"}'::jsonb
 where email = 'test-kolega@svejda-goldmann.cz';
select pg_temp.become('test-kolega@svejda-goldmann.cz');

do $$
begin
  begin
    delete from public.projects where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'SELHALO: projekt s výkazy šel smazat, historie času by zmizela';
  exception when foreign_key_violation then null;
  end;
end $$;


-- ══════════════════════════════════════════════════════════════
-- 9. Superadmin projde všude
-- ══════════════════════════════════════════════════════════════

reset role;
select pg_temp.become('jakub@svejda-goldmann.cz');

do $$
begin
  perform pg_temp.assert(
    (select count(*) from public.rates
      where email in ('test-kolega@svejda-goldmann.cz', 'test-druhy@svejda-goldmann.cz')) = 2,
    'superadmin nevidí cizí sazby');
  perform pg_temp.assert((select count(*) from public.projects where name like 'TEST %') = 3,
    'superadmin nevidí všechny projekty');
  perform pg_temp.assert((select count(*) from public.timesheet) >= 1, 'superadmin nevidí výkazy');

  update public.app_users set modules = '{"wiki":"edit"}'::jsonb
   where email = 'test-druhy@svejda-goldmann.cz';
  perform pg_temp.assert(
    (select modules from public.app_users where email = 'test-druhy@svejda-goldmann.cz')
      = '{"wiki":"edit"}'::jsonb,
    'superadmin nemůže rozdávat práva');
end $$;


-- ══════════════════════════════════════════════════════════════

reset role;

-- Verdikt jako výsledek, ne jako notice — ten SQL editor nezobrazuje.
-- Když se sem skript dostal, znamená to, že žádné tvrzení neselhalo.
select 'VŠECHNY TESTY PROŠLY' as vysledek,
       24 as overenych_tvrzeni,
       8 as ocekavanych_odmitnuti;

-- Nic z toho, co skript vytvořil, v databázi nezůstane.
rollback;
