-- SylliBee calendar storage (no Supabase Auth required).
-- Prefer supabase/setup.sql (drops old tables + creates this schema in one step).

create table if not exists public.courses (
  workspace_id text not null,
  id text not null,
  code text not null,
  name text not null,
  hex text not null,
  rgb text not null,
  club boolean not null default false,
  hidden boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.calendar_events (
  workspace_id text not null,
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
  primary key (workspace_id, id)
);

create table if not exists public.user_preferences (
  workspace_id text primary key,
  view_mode text not null default 'Week',
  kind_filter text not null default 'all',
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_preferences enable row level security;

-- Each browser stores a private workspace_id in localStorage and filters every query.
-- RLS allows the anon API key to read/write; rows are isolated by workspace_id in app queries.

drop policy if exists "courses_workspace" on public.courses;
drop policy if exists "events_workspace" on public.calendar_events;
drop policy if exists "prefs_workspace" on public.user_preferences;

create policy "courses_workspace" on public.courses
  for all to anon, authenticated using (true) with check (true);

create policy "events_workspace" on public.calendar_events
  for all to anon, authenticated using (true) with check (true);

create policy "prefs_workspace" on public.user_preferences
  for all to anon, authenticated using (true) with check (true);

create index if not exists calendar_events_workspace_course_idx
  on public.calendar_events (workspace_id, course_id);

create index if not exists courses_workspace_idx on public.courses (workspace_id);
