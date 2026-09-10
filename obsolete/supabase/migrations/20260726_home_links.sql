-- Home links — editable bookmarks on the rozcestník
create table if not exists home_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  column_index int not null default 0,
  column_title text not null default '',
  title text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- RLS
alter table home_links enable row level security;

create policy "Users see own links"
  on home_links for select using (auth.uid() = user_id);

create policy "Users insert own links"
  on home_links for insert with check (auth.uid() = user_id);

create policy "Users update own links"
  on home_links for update using (auth.uid() = user_id);

create policy "Users delete own links"
  on home_links for delete using (auth.uid() = user_id);

-- Index for fast load
create index home_links_user_idx on home_links(user_id, column_index, position);
