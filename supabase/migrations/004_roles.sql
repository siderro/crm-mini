-- Brevis — role.
--
-- Do téhle chvíle měl člověk jen mapu modulů: co vidí a jestli v tom smí měnit.
-- To odpovídá na otázku „které obrazovky", ale ne na „které řádky uvnitř".
-- A právě to je potřeba: designér má vidět svoje výkazy, ne cizí.
--
-- Tři nezávislé osy, každá se vynucuje jinde:
--
--   A — které moduly vidím      → `app_users.modules`, beze změny.
--       Role je jen předloha: výběr role zapíše mapu modulů. Materializuje se
--       schválně, aby „co tenhle člověk vidí" šlo přečíst z jednoho řádku
--       a aby seznam „role → moduly" neexistoval dvakrát (v JS i v SQL).
--
--   B — které řádky vidím       → tenhle soubor. Žebříček rolí a přepsané
--       politiky. Tohle je bezpečnostní hranice, takže živé pravidlo v RLS,
--       ne nic materializovaného.
--
--   C — smím mazat              → restriktivní politiky níž. Ne třetí úroveň
--       vedle read/edit — mazání je vlastnost operace, ne úrovně.
--
-- Superadmin zůstává mimo data. Kdyby plynul z `role`, stačilo by ho získat
-- zápisem do tabulky — což je přesně to, proti čemu je celý model postavený.
-- Peněžní moduly zůstávají jen jemu; role je nezpřístupňují.

-- ════════════════════════════════════════════════════════════════
-- ČÁST 1 — Superadmin je seznam, ne jeden e-mail
-- ════════════════════════════════════════════════════════════════
--
-- Jeden natvrdo zapsaný účet není bezpečnostní riziko — je to opak, je to
-- právo, které nejde ukrást zápisem do databáze. Je to ale riziko
-- dostupnostní: ztráta toho účtu znamená, že už nikdo nikomu nepřidělí práva.
-- Seznam tu vlastnost zachová a ten jediný bod selhání odstraní.
--
-- `create or replace` je bezpečné i s existujícími politikami: signatura se
-- nemění, funkce si drží stejné OID a politiky na ni odkazují právě přes něj.
--
-- Druhý e-mail doplň, až takový účet bude. Musí sedět s `SUPERADMIN_EMAILS`
-- v src/config.js.

create or replace function public.is_superadmin()
returns boolean language sql stable
set search_path = public
as $$
  select public.current_email() = any (array[
    'jakub@svejda-goldmann.cz'
  ])
$$;

-- ════════════════════════════════════════════════════════════════
-- ČÁST 2 — Sloupce
-- ════════════════════════════════════════════════════════════════

alter table public.app_users
  add column if not exists role text
  check (role in ('designer', 'manager', 'admin'));

-- Kdo už nějaký modul má, je aspoň designér. Bez tohohle by mu po spuštění
-- migrace zmizela wiki — měl by hodnost 0 a nedosáhl by ani na nejnižší patro.
update public.app_users
   set role = 'designer'
 where role is null and modules <> '{}'::jsonb;

-- Od jaké hodnosti je stránka čitelná. Slovem, ne číslem: číslo v datech by se
-- při změně žebříčku rozešlo s významem a nikdo by v tabulce nepoznal, co je 20.
alter table public.wiki_pages
  add column if not exists min_role text not null default 'designer'
  check (min_role in ('designer', 'manager', 'admin'));

-- ════════════════════════════════════════════════════════════════
-- ČÁST 3 — Žebříček
-- ════════════════════════════════════════════════════════════════

/* designer < manager < admin < superadmin. Neznámá i chybějící role je 0 —
   tedy pod nejnižším patrem, ne na něm. */
create or replace function public.role_rank(p_role text)
returns int language sql immutable
set search_path = public
as $$
  select case p_role
    when 'superadmin' then 40
    when 'admin'      then 30
    when 'manager'    then 20
    when 'designer'   then 10
    else 0
  end
$$;

/* Moje hodnost. Superadmin plyne z konfigurace, ne z `role`, takže se bere
   to vyšší z obojího.

   security definer: čte app_users a volá se z politiky nad app_users —
   bez obejití RLS by vznikla nekonečná rekurze. Stejný důvod jako
   u stored_modules(). */
create or replace function public.my_rank()
returns int language sql stable security definer
set search_path = public
as $$
  select greatest(
    case when public.is_superadmin() then 40 else 0 end,
    public.role_rank((select role from public.app_users where email = public.current_email()))
  )
$$;

/* Uložená role člověka — kvůli kontrole, že si ji sám nepřepsal.
   Dvojče stored_modules(); bez něj by si designér nastavil role = 'admin'
   a obešel celý model jinými dveřmi než ta politika hlídá. */
create or replace function public.stored_role(p_email text)
returns text language sql stable security definer
set search_path = public
as $$ select (select role from public.app_users where email = p_email) $$;

-- ════════════════════════════════════════════════════════════════
-- ČÁST 4 — Přepsané politiky (osa B)
--
-- Politika se nedá nahradit na místě; musí se zahodit a vytvořit znovu.
-- ════════════════════════════════════════════════════════════════

-- ── app_users: role si nikdo nenastaví sám ──

drop policy app_users_insert_self on public.app_users;
create policy app_users_insert_self on public.app_users
  for insert to authenticated
  with check (
    public.is_domain_user()
    and email = public.current_email()
    and modules = '{}'::jsonb
    and role is null
  );

drop policy app_users_touch_self on public.app_users;
create policy app_users_touch_self on public.app_users
  for update to authenticated
  using (public.is_domain_user() and email = public.current_email())
  with check (
    email = public.current_email()
    and modules = public.stored_modules(email)
    -- `is not distinct from`, ne `=`: u NULL by rovnost vrátila NULL a
    -- with check by neprošel nikomu bez role — tedy každému novému člověku.
    and role is not distinct from public.stored_role(email)
  );

-- ── timesheet: svoje vždycky, cizí až od managera ──
--
-- Padají obě dosavadní široké větve:
--   `can_read_module('pm')`          — díra popsaná v PRD
--   `project_level(...) is not null` — člen projektu viděl výkazy všech
--                                      ostatních členů, tedy i designér
-- Manager a výš vidí všechno, protože bez toho nejde řídit kapacitu.

drop policy timesheet_select on public.timesheet;
create policy timesheet_select on public.timesheet
  for select to authenticated
  using (
    public.is_domain_user()
    and (email = public.current_email() or public.my_rank() >= 20)
  );

-- ── projects: designér jen svoje, manager všechny ──

drop policy projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_domain_user()
    and (
      public.project_level(id) is not null
      or (public.can_read_module('pm') and public.my_rank() >= 20)
    )
  );

-- ── wiki: stránka se dá schovat nad hodnost ──

drop policy wiki_pages_select on public.wiki_pages;
create policy wiki_pages_select on public.wiki_pages
  for select to authenticated
  using (
    public.can_read_module('wiki')
    and public.my_rank() >= public.role_rank(min_role)
  );

-- Psát se smí jen na svoji úroveň a níž — jinak by šlo stránku „povýšit"
-- a přijít o ni, nebo si přečíst cizí tím, že ji člověk sníží.
drop policy wiki_pages_write on public.wiki_pages;
create policy wiki_pages_write on public.wiki_pages
  for all to authenticated
  using (public.can_edit_module('wiki') and public.my_rank() >= public.role_rank(min_role))
  with check (public.can_edit_module('wiki') and public.my_rank() >= public.role_rank(min_role));

-- ════════════════════════════════════════════════════════════════
-- ČÁST 5 — Mazání (osa C)
--
-- POZOR: permisivní politiky se slučují přes OR. Přidat vedle existující
-- `for all` užší `for delete` politiku by tedy neomezilo vůbec nic — naopak
-- by to přidalo další povolenou cestu. Omezuje se `as restrictive`, která se
-- přidává přes AND: projde jen ten, koho pustí obě.
--
-- Omezují se záznamy s historií (projekty, lidé, wiki). CRM a To-Do ne —
-- smazaná příležitost není ztráta historie, je to úklid.
-- ════════════════════════════════════════════════════════════════

create policy projects_delete_superadmin on public.projects
  as restrictive for delete to authenticated
  using (public.is_superadmin());

create policy app_users_delete_superadmin on public.app_users
  as restrictive for delete to authenticated
  using (public.is_superadmin());

create policy wiki_pages_delete_superadmin on public.wiki_pages
  as restrictive for delete to authenticated
  using (public.is_superadmin());
