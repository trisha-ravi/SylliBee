import type { CalendarEvent, Course, KindFilter, ViewMode } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { dueToHours } from '../utils/time';
import { withScheduleRange } from '../utils/eventSchedule';

interface CourseRow {
  user_id: string;
  id: string;
  code: string;
  name: string;
  hex: string;
  rgb: string;
  club: boolean;
  hidden: boolean;
  deleted: boolean;
}

interface EventRow {
  user_id: string;
  id: string;
  course_id: string;
  day_index: number;
  kind: string;
  title: string;
  sub: string;
  loc: string | null;
  start_hour: number | null;
  end_hour: number | null;
  due: string | null;
  event_date: string | null;
  hrs: number | null;
  ai: boolean;
  done: boolean;
  deleted: boolean;
}

export interface CalendarSnapshot {
  courses: Course[];
  events: CalendarEvent[];
  hidden: Record<string, boolean>;
  done: Record<string, boolean>;
  deletedCourseIds: Record<string, true>;
  view: ViewMode;
  kind: KindFilter;
}

function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    hex: row.hex,
    rgb: row.rgb,
    club: row.club || undefined,
  };
}

function rowToEvent(row: EventRow): CalendarEvent {
  let s = row.start_hour ?? undefined;
  let e = row.end_hour ?? undefined;
  const due = row.due ?? undefined;
  const kind = row.kind as CalendarEvent['k'];

  if (s == null && due && (kind === 'class' || kind === 'club')) {
    s = dueToHours(due);
    e = s + 1.25;
  }

  const event: CalendarEvent = {
    id: row.id,
    d: row.day_index,
    k: kind,
    c: row.course_id,
    t: row.title,
    sub: row.sub,
    loc: row.loc ?? undefined,
    s,
    e,
    due,
    date: row.event_date ?? undefined,
    hrs: row.hrs ?? undefined,
    ai: row.ai || undefined,
    done: row.done || undefined,
  };

  return withScheduleRange(event);
}

function courseToRow(course: Course, userId: string, hidden: boolean, deleted: boolean): CourseRow {
  return {
    user_id: userId,
    id: course.id,
    code: course.code,
    name: course.name,
    hex: course.hex,
    rgb: course.rgb,
    club: !!course.club,
    hidden,
    deleted,
  };
}

function eventToRow(event: CalendarEvent, userId: string, deleted: boolean): EventRow {
  return {
    user_id: userId,
    id: event.id,
    course_id: event.c,
    day_index: event.d,
    kind: event.k,
    title: event.t,
    sub: event.sub,
    loc: event.loc ?? null,
    start_hour: event.s ?? null,
    end_hour: event.e ?? null,
    due: event.due ?? null,
    event_date: event.date ?? null,
    hrs: event.hrs ?? null,
    ai: !!event.ai,
    done: !!event.done,
    deleted,
  };
}

export async function loadCalendar(userId: string): Promise<CalendarSnapshot> {
  const supabase = getSupabase();

  const [courseRes, eventRes, prefRes] = await Promise.all([
    supabase.from('courses').select('*').eq('user_id', userId),
    supabase.from('calendar_events').select('*').eq('user_id', userId),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (courseRes.error) throw courseRes.error;
  if (eventRes.error) throw eventRes.error;
  if (prefRes.error) throw prefRes.error;

  const hidden: Record<string, boolean> = {};
  const deletedCourseIds: Record<string, true> = {};
  const courses = (courseRes.data as CourseRow[])
    .filter((row) => {
      if (row.deleted) {
        deletedCourseIds[row.id] = true;
        return false;
      }
      if (row.hidden) hidden[row.id] = true;
      return true;
    })
    .map(rowToCourse);

  const done: Record<string, boolean> = {};
  const events = (eventRes.data as EventRow[])
    .filter((row) => {
      if (row.deleted) return false;
      if (row.done) done[row.id] = true;
      return true;
    })
    .map(rowToEvent);

  return {
    courses,
    events,
    hidden,
    done,
    deletedCourseIds,
    view: (prefRes.data?.view_mode as ViewMode) ?? 'Week',
    kind: (prefRes.data?.kind_filter as KindFilter) ?? 'all',
  };
}

export async function savePreferences(userId: string, view: ViewMode, kind: KindFilter): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    view_mode: view,
    kind_filter: kind,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function upsertCourses(
  userId: string,
  courses: Course[],
  hidden: Record<string, boolean>,
): Promise<void> {
  if (!courses.length) return;
  const supabase = getSupabase();
  const rows = courses.map((c) => courseToRow(c, userId, !!hidden[c.id], false));
  const { error } = await supabase.from('courses').upsert(rows);
  if (error) throw error;
}

export async function upsertEvents(userId: string, events: CalendarEvent[]): Promise<void> {
  if (!events.length) return;
  const supabase = getSupabase();
  const rows = events.map((e) => eventToRow(e, userId, false));
  const { error } = await supabase.from('calendar_events').upsert(rows);
  if (error) throw error;
}

export async function replaceImportedCalendar(
  userId: string,
  courses: Course[],
  events: CalendarEvent[],
  hidden: Record<string, boolean>,
): Promise<void> {
  const supabase = getSupabase();

  const { data: existingCourses, error: listErr } = await supabase
    .from('courses')
    .select('id, club')
    .eq('user_id', userId)
    .eq('deleted', false);
  if (listErr) throw listErr;

  const importedIds = new Set(courses.map((c) => c.id));
  const toRetire = (existingCourses as { id: string; club: boolean }[]).filter(
    (c) => !c.club && !importedIds.has(c.id),
  );

  for (const course of toRetire) {
    await supabase.from('courses').update({ deleted: true }).eq('user_id', userId).eq('id', course.id);
    await supabase
      .from('calendar_events')
      .update({ deleted: true })
      .eq('user_id', userId)
      .eq('course_id', course.id);
  }

  await upsertCourses(userId, courses, hidden);
  await upsertEvents(userId, events);
}

export async function updateCourseInDb(userId: string, course: Course, hidden: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('courses').upsert(courseToRow(course, userId, hidden, false));
  if (error) throw error;
}

export async function setCourseHiddenInDb(userId: string, courseId: string, hidden: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('courses')
    .update({ hidden })
    .eq('user_id', userId)
    .eq('id', courseId);
  if (error) throw error;
}

export async function deleteCourseInDb(userId: string, courseId: string): Promise<void> {
  const supabase = getSupabase();
  const { error: courseErr } = await supabase
    .from('courses')
    .update({ deleted: true })
    .eq('user_id', userId)
    .eq('id', courseId);
  if (courseErr) throw courseErr;

  const { error: eventErr } = await supabase
    .from('calendar_events')
    .update({ deleted: true })
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (eventErr) throw eventErr;
}

export async function deleteEventInDb(userId: string, eventId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('calendar_events')
    .update({ deleted: true })
    .eq('user_id', userId)
    .eq('id', eventId);
  if (error) throw error;
}

export async function updateEventInDb(userId: string, event: CalendarEvent): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('calendar_events').upsert(eventToRow(event, userId, false));
  if (error) throw error;
}

export async function setEventDoneInDb(userId: string, event: CalendarEvent, done: boolean): Promise<void> {
  await updateEventInDb(userId, { ...event, done });
}

export async function initCalendarFromSupabase(userId: string): Promise<CalendarSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  return loadCalendar(userId);
}

export { isSupabaseConfigured };
