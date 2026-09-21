-- Brevis — náklady mimo mzdy.
--
-- Do téhle chvíle systém uměl jen peníze, které přijdou (fakturace a SLA) a mzdy,
-- které odejdou (Výplaty). Všechno ostatní — nájem, software, pojištění, oprava
-- auta — nebylo kde vést, takže na otázku „kolik nám v březnu zbyde" neexistovala
-- odpověď.
--
-- Jedna tabulka, dva tvary. Stejný vzor jako `rates` (hodinová / paušál):
-- rozlišovací sloupec + check constraint, ne dvě tabulky. Výhled pak čte
-- náklady jedním dotazem.
--
--   'recurring' — platí se opakovaně: každý měsíc, nebo jednou za rok
--                 v daném měsíci. Má platnost od–do, aby vypovězené
--                 předplatné nefigurovalo ve výhledu navěky.
--   'onetime'   — nebagatelní jednorázový výdaj s očekávaným datem.
--
-- Je to peněžní tabulka, takže RLS jako u `rates`: superadmin, nikdo jiný.

create table public.costs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('recurring', 'onetime')),
  name        text not null check (length(btrim(name)) > 0),
  amount      numeric not null check (amount >= 0),
  note        text,

  -- pravidelné
  period      text check (period in ('monthly', 'yearly')),
  due_month   int  check (due_month between 1 and 12),   -- jen u ročních
  valid_from  date,
  valid_to    date,                                      -- null = napořád

  -- jednorázové
  due_date    date,

  created_at  timestamptz not null default now(),
  is_dummy    boolean not null default false,

  -- Tvar řádku hlídá databáze, ne formulář. Jinak by se přes konzoli dal
  -- uložit „měsíční náklad splatný 5. dubna", což nedává smysl a výhled by
  -- ho buď spolknul, nebo spočítal dvakrát.
  constraint costs_shape_ck check (
    (kind = 'recurring'
       and due_date is null
       and valid_from is not null
       and period is not null
       and (due_month is null) = (period = 'monthly'))
    or
    (kind = 'onetime'
       and due_date is not null
       and period is null and due_month is null
       and valid_from is null and valid_to is null)
  ),

  -- Konec platnosti před začátkem znamená položku, která nikdy neplatila.
  constraint costs_valid_range_ck check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index costs_kind_idx     on public.costs (kind, due_date);
create index costs_dummy_idx    on public.costs (is_dummy) where is_dummy;

alter table public.costs enable row level security;

create policy costs_select on public.costs
  for select to authenticated
  using (public.is_superadmin());

create policy costs_write on public.costs
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Práva na nové tabulce; 001 je rozdávalo hromadně, nová tabulka je nedostala.
grant select, insert, update, delete on public.costs to authenticated;
revoke all on public.costs from anon;
