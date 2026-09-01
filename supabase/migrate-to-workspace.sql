-- Run this ONCE if you previously applied the old user_id / auth.users schema.
-- This drops old tables and policies. You will lose any data already stored.

drop policy if exists "courses_select_own" on public.courses;
drop policy if exists "courses_insert_own" on public.courses;
drop policy if exists "courses_update_own" on public.courses;
drop policy if exists "courses_delete_own" on public.courses;
drop policy if exists "events_select_own" on public.calendar_events;
drop policy if exists "events_insert_own" on public.calendar_events;
drop policy if exists "events_update_own" on public.calendar_events;
drop policy if exists "events_delete_own" on public.calendar_events;
drop policy if exists "prefs_select_own" on public.user_preferences;
drop policy if exists "prefs_insert_own" on public.user_preferences;
drop policy if exists "prefs_update_own" on public.user_preferences;

drop table if exists public.calendar_events cascade;
drop table if exists public.courses cascade;
drop table if exists public.user_preferences cascade;

-- Then run schema.sql
