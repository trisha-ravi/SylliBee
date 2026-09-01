-- Run this only if you already applied an older schema.sql without "to authenticated".
-- Safe to run on a fresh project (will error if policy names already exist with different defs).

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

create policy "courses_select_own" on public.courses for select to authenticated using (auth.uid() = user_id);
create policy "courses_insert_own" on public.courses for insert to authenticated with check (auth.uid() = user_id);
create policy "courses_update_own" on public.courses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "courses_delete_own" on public.courses for delete to authenticated using (auth.uid() = user_id);

create policy "events_select_own" on public.calendar_events for select to authenticated using (auth.uid() = user_id);
create policy "events_insert_own" on public.calendar_events for insert to authenticated with check (auth.uid() = user_id);
create policy "events_update_own" on public.calendar_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.calendar_events for delete to authenticated using (auth.uid() = user_id);

create policy "prefs_select_own" on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "prefs_insert_own" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "prefs_update_own" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
