-- Brevis — počáteční schéma.
--
-- Osm tabulek + RLS. Spustit celé najednou v Supabase SQL editoru.
--
-- Pořadí v souboru je dané Postgresem, ne čitelností: tělo SQL funkce se ověřuje
-- už při vytvoření, takže tabulky musí být dřív než funkce, které z nich čtou,
-- a ty dřív než politiky, které je volají.
--
-- Principy, ze kterých to vychází:
--   · Klíč člověka je e-mail, ne auth.uid() — práva, sazby, členství i výkazy
--     jsou na něj navázané a e-mail je to, čím o lidech uvažujeme.
--   · Kontroly v prohlížeči (canAccess/canEdit) jsou jen kosmetika. Tady se to
--     hlídá doopravdy — kdo obejde UI, narazí na politiku.
--   · Práva k modulům drží app_users.modules jako mapu { "modul": "read"|"edit" }.
--   · Sazby jsou mzdové údaje: vidí je jen jejich vlastník a superadmin.

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ════════════════════════════════════════════════════════════════
-- ČÁST 1 — Kdo je přihlášený (funkce nezávislé na tabulkách)
-- ════════════════════════════════════════════════════════════════

create or replace function public.current_email()
returns text language sql stable
set search_path = public
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_domain_user()
returns boolean language sql stable
set search_path = public
as $$ select public.current_email() like '%@svejda-goldmann.cz' $$;

create or replace function public.is_superadmin()
returns boolean language sql stable
set search_path = public
as $$ select public.current_email() = 'jakub@svejda-goldmann.cz' $$;

-- ════════════════════════════════════════════════════════════════
-- ČÁST 2 — Tabulky
-- ════════════════════════════════════════════════════════════════

-- 1. Lidé a jejich práva k modulům
create table public.app_users (
  email       text primary key,
  first_login timestamptz not null default now(),
  last_login  timestamptz not null default now(),
  modules     jsonb not null default '{}'::jsonb
);

-- 2. Nákladové sazby (hodinová nebo měsíční paušál, verzované podle data)
create table public.rates (
  id             uuid primary key default gen_random_uuid(),
  email          text not null references public.app_users(email) on delete cascade,
  type           text not null default 'hourly' check (type in ('hourly', 'monthly')),
  rate           numeric,
  monthly_amount numeric,
  monthly_hours  numeric,
  valid_from     date not null default current_date,
  created_at     timestamptz not null default now(),

  constraint rates_amounts_ck check (
    (type = 'hourly'  and rate is not null and rate >= 0)
    or
    (type = 'monthly' and monthly_amount is not null and monthly_amount >= 0
                      and monthly_hours  is not null and monthly_hours  > 0)
  )
);
create index rates_email_from_idx on public.rates (email, valid_from desc);

-- 3. Projekty
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  billing     text not null default 'client' check (billing in ('client', 'probono', 'internal')),
  est_start   date,
  est_end     date,
  est_hours   numeric check (est_hours is null or est_hours >= 0),
  est_price   numeric check (est_price is null or est_price >= 0),
  est_pm      numeric check (est_pm    is null or est_pm    >= 0),
  est_sla     numeric check (est_sla   is null or est_sla   >= 0),
  status      text not null default 'active' check (status in ('active', 'closed')),
  closed_at   timestamptz,
  final_price numeric,
  final       jsonb,
  created_at  timestamptz not null default now(),

  -- Uzavřený projekt musí mít razítko, běžící ho mít nesmí.
  constraint projects_closed_ck check (
    (status = 'closed' and closed_at is not null)
    or
    (status = 'active' and closed_at is null)
  )
);
create index projects_status_idx on public.projects (status, name);

-- 4. Přiřazení lidí k projektům
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  email      text not null references public.app_users(email) on delete cascade,
  level      text not null check (level in ('view', 'report')),
  role       text check (role in ('designer', 'manager')),

  primary key (project_id, email)
);
create index project_members_email_idx on public.project_members (email);

-- 5. Výkazy práce
--
-- on delete restrict u projektu: projekt s výkazy nejde smazat. Historie
-- odpracovaného času je to poslední, co má někam zmizet — takový projekt
-- se uzavírá, ne maže.
create table public.timesheet (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  email      text not null references public.app_users(email) on delete cascade,
  "date"     date not null,
  hours      numeric not null check (hours > 0),
  kind       text not null default 'design' check (kind in ('design', 'pm')),
  note       text not null default '',
  created_at timestamptz not null default now()
);
create index timesheet_project_idx on public.timesheet (project_id, "date" desc);
create index timesheet_email_idx   on public.timesheet (email, "date" desc);

-- 6. CRM — příležitosti
create table public.crm_opps (
  id         uuid primary key default gen_random_uuid(),
  project    text not null default '',
  contact    text not null default '',
  est_value  numeric,
  notes      text not null default '',
  status     text not null default 'open' check (status in ('open', 'frozen', 'won', 'lost')),
  created_at date not null default current_date,
  updated_at date not null default current_date
);
create index crm_opps_status_idx on public.crm_opps (status, created_at desc);

-- 7. ŠG wiki
create table public.wiki_pages (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  "text"     text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index wiki_pages_updated_idx on public.wiki_pages (updated_at desc);

-- 8. To-Do
--
-- Osobní seznam. V localStorage byl vlastník daný prohlížečem, tady ho musí
-- nést sloupec — jinak by si lidi viděli navzájem do úkolů.
create table public.todo_items (
  id          uuid primary key default gen_random_uuid(),
  email       text not null references public.app_users(email) on delete cascade,
  "text"      text not null check (length(btrim("text")) > 0),
  stage       text not null default 'raw' check (stage in ('raw', 'ticket', 'done')),
  created_at  timestamptz not null default now(),
  promoted_at timestamptz,
  done_at     timestamptz
);
create index todo_items_owner_idx on public.todo_items (email, stage, created_at desc);

-- ════════════════════════════════════════════════════════════════
-- ČÁST 3 — Funkce, které čtou z tabulek
--
-- security definer: politiky nad app_users se na tyhle funkce ptají a bez
-- obejití RLS uvnitř by vznikla nekonečná rekurze.
-- ════════════════════════════════════════════════════════════════

/* Úroveň přihlášeného k modulu: 'read', 'edit', nebo NULL. */
create or replace function public.module_level(p_module text)
returns text language sql stable security definer
set search_path = public
as $$
  select case
    when public.is_superadmin() then 'edit'
    else (select modules ->> p_module from public.app_users where email = public.current_email())
  end
$$;

create or replace function public.can_read_module(p_module text)
returns boolean language sql stable
set search_path = public
as $$ select public.is_domain_user() and public.module_level(p_module) in ('read', 'edit') $$;

create or replace function public.can_edit_module(p_module text)
returns boolean language sql stable
set search_path = public
as $$ select public.is_domain_user() and public.module_level(p_module) = 'edit' $$;

/* Uložená práva člověka — kvůli kontrole, že si je sám nepřepsal. */
create or replace function public.stored_modules(p_email text)
returns jsonb language sql stable security definer
set search_path = public
as $$ select coalesce((select modules from public.app_users where email = p_email), '{}'::jsonb) $$;

/* Moje úroveň na projektu: 'view', 'report', nebo NULL. */
create or replace function public.project_level(p_project uuid)
returns text language sql stable security definer
set search_path = public
as $$
  select level from public.project_members
   where project_id = p_project and email = public.current_email()
$$;

create or replace function public.project_is_active(p_project uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.projects where id = p_project and status = 'active') $$;

-- ════════════════════════════════════════════════════════════════
-- ČÁST 4 — RLS a politiky
-- ════════════════════════════════════════════════════════════════

alter table public.app_users       enable row level security;
alter table public.rates           enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.timesheet       enable row level security;
alter table public.crm_opps        enable row level security;
alter table public.wiki_pages      enable row level security;
alter table public.todo_items      enable row level security;

-- ── app_users ──

-- Seznam lidí ve firmě vidí každý z domény — potřebují ho výběry v projektech.
create policy app_users_select on public.app_users
  for select to authenticated
  using (public.is_domain_user());

-- Při prvním přihlášení si člověk založí vlastní řádek, ale bez práv.
create policy app_users_insert_self on public.app_users
  for insert to authenticated
  with check (
    public.is_domain_user()
    and email = public.current_email()
    and modules = '{}'::jsonb
  );

-- Vlastní řádek si smím posunout (last_login), ale práva si nesmím přepsat.
create policy app_users_touch_self on public.app_users
  for update to authenticated
  using (public.is_domain_user() and email = public.current_email())
  with check (
    email = public.current_email()
    and modules = public.stored_modules(email)
  );

create policy app_users_admin_write on public.app_users
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ── rates ──
--
-- Mzdový údaj. Důsledek: kdo není superadmin, neuvidí náklad ani zisk cizí práce.

create policy rates_select on public.rates
  for select to authenticated
  using (public.is_domain_user() and (email = public.current_email() or public.is_superadmin()));

create policy rates_write on public.rates
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ── projects ──
--
-- Projekt vidí, kdo má modul Projekty, nebo kdo je na něm přiřazený
-- (potřebuje aspoň jméno, aby mohl vykazovat).

create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_domain_user()
    and (public.can_read_module('pm') or public.project_level(id) is not null)
  );

create policy projects_write on public.projects
  for all to authenticated
  using (public.can_edit_module('pm'))
  with check (public.can_edit_module('pm'));

-- ── project_members ──

create policy project_members_select on public.project_members
  for select to authenticated
  using (
    public.is_domain_user()
    and (
      email = public.current_email()
      or public.can_read_module('pm')
      or public.can_read_module('project-access')
    )
  );

create policy project_members_write on public.project_members
  for all to authenticated
  using (public.can_edit_module('pm') or public.can_edit_module('project-access'))
  with check (public.can_edit_module('pm') or public.can_edit_module('project-access'));

-- ── timesheet ──

-- Svoje výkazy vidím vždycky; cizí jen na projektu, na který dosáhnu.
create policy timesheet_select on public.timesheet
  for select to authenticated
  using (
    public.is_domain_user()
    and (
      email = public.current_email()
      or public.can_read_module('pm')
      or public.project_level(project_id) is not null
    )
  );

-- Zapisovat smím jen sám za sebe, jen do projektu, kde mám 'report',
-- a jen dokud projekt běží.
create policy timesheet_insert on public.timesheet
  for insert to authenticated
  with check (
    public.is_domain_user()
    and email = public.current_email()
    and public.project_level(project_id) = 'report'
    and public.project_is_active(project_id)
  );

create policy timesheet_update on public.timesheet
  for update to authenticated
  using (public.is_domain_user() and (email = public.current_email() or public.is_superadmin()))
  with check (
    email = public.current_email()
    and public.project_level(project_id) = 'report'
  );

create policy timesheet_delete on public.timesheet
  for delete to authenticated
  using (public.is_domain_user() and (email = public.current_email() or public.is_superadmin()));

-- ── crm_opps ──

create policy crm_opps_select on public.crm_opps
  for select to authenticated using (public.can_read_module('crm'));

create policy crm_opps_write on public.crm_opps
  for all to authenticated
  using (public.can_edit_module('crm'))
  with check (public.can_edit_module('crm'));

-- ── wiki_pages ──
--
-- Tady se čtení a editace doopravdy liší — kvůli tomu wiki dostala úrovně.

create policy wiki_pages_select on public.wiki_pages
  for select to authenticated using (public.can_read_module('wiki'));

create policy wiki_pages_write on public.wiki_pages
  for all to authenticated
  using (public.can_edit_module('wiki'))
  with check (public.can_edit_module('wiki'));

-- ── todo_items ──

create policy todo_items_own on public.todo_items
  for all to authenticated
  using (public.is_domain_user() and email = public.current_email())
  with check (public.is_domain_user() and email = public.current_email());

-- ════════════════════════════════════════════════════════════════
-- ČÁST 5 — Oprávnění
--
-- Reset schématu dává roli `authenticated` plošný přístup. RLS ho sice zúží,
-- ale ať je to explicitní: anon nesmí nikam, authenticated jen přes politiky.
-- ════════════════════════════════════════════════════════════════

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;
