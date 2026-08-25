-- RunnerSensei Supabase schema

-- Profiles table (additional user metadata)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  xp integer default 0,
  level integer default 1,
  badges jsonb default '[]',
  avatar_url text,
  current_streak integer default 0,
  last_run timestamptz,
  weekly_runs jsonb default '{}',
  total_runs integer default 0
);

-- Runs table (per-user runs)
create table if not exists runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  distance_km numeric,
  duration_sec integer,
  avg_pace numeric,
  path jsonb,
  notes text,
  created_at timestamptz default now()
);

create index if not exists runs_user_idx on runs(user_id, created_at desc);

-- Row Level Security: each user can only see/modify their own rows.
alter table profiles enable row level security;
alter table runs     enable row level security;

drop policy if exists "profiles are self-readable"  on profiles;
drop policy if exists "profiles are self-writable"  on profiles;
drop policy if exists "profiles are self-updatable" on profiles;
drop policy if exists "runs are self-readable"      on runs;
drop policy if exists "runs are self-writable"      on runs;
drop policy if exists "runs are self-updatable"     on runs;
drop policy if exists "runs are self-deletable"     on runs;

create policy "profiles are self-readable"  on profiles for select using  (auth.uid() = id);
create policy "profiles are self-writable"  on profiles for insert with check (auth.uid() = id);
create policy "profiles are self-updatable" on profiles for update using  (auth.uid() = id) with check (auth.uid() = id);

create policy "runs are self-readable"      on runs for select using  (auth.uid() = user_id);
create policy "runs are self-writable"      on runs for insert with check (auth.uid() = user_id);
create policy "runs are self-updatable"     on runs for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "runs are self-deletable"     on runs for delete using  (auth.uid() = user_id);
