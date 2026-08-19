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
