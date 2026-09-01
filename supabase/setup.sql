-- =============================================================================
-- SylliBee — run this ENTIRE file once in Supabase SQL Editor, then click Run.
-- https://supabase.com/dashboard/project/hehauudvuplovalouwik/sql/new
--
-- Auth: email + password (enable Email provider in Authentication → Providers)
-- Each user only sees their own calendar (RLS on auth.uid()).
-- =============================================================================

drop policy if exists "courses_workspace" on public.courses;
drop policy if exists "events_workspace" on public.calendar_events;
drop policy if exists "prefs_workspace" on public.user_preferences;
drop policy if exists "courses_own" on public.courses;
drop policy if exists "events_own" on public.calendar_events;
drop policy if exists "prefs_own" on public.user_preferences;

drop table if exists public.calendar_events cascade;
drop table if exists public.courses cascade;
drop table if exists public.user_preferences cascade;

-- -----------------------------------------------------------------------------
-- Per-user schema (user_id = auth.users.id)
-- -----------------------------------------------------------------------------

create table public.courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  code text not null,
  name text not null,
  hex text not null,
  rgb text not null,
  club boolean not null default false,
  hidden boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.calendar_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  course_id text not null,
  day_index smallint not null,
  kind text not null,
  title text not null,
  sub text not null default '',
  loc text,
  start_hour numeric,
  end_hour numeric,
  due text,
  event_date text,
  hrs numeric,
  ai boolean not null default false,
  done boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  view_mode text not null default 'Week',
  kind_filter text not null default 'all',
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_preferences enable row level security;

create policy "courses_own" on public.courses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "events_own" on public.calendar_events
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prefs_own" on public.user_preferences
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index calendar_events_user_course_idx on public.calendar_events (user_id, course_id);
create index courses_user_idx on public.courses (user_id);
