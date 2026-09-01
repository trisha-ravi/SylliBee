import type { CalendarEvent, Course, KindFilter, ViewMode } from '../types';

const STORAGE_KEY = 'syllibee-local-calendar';

export interface LocalCalendarSnapshot {
  courses: Course[];
  events: CalendarEvent[];
  hidden: Record<string, boolean>;
  done: Record<string, boolean>;
  deletedCourseIds: Record<string, true>;
  view: ViewMode;
  kind: KindFilter;
}

export function loadLocalCalendar(): LocalCalendarSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCalendarSnapshot;
    if (!parsed || !Array.isArray(parsed.courses) || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalCalendar(snapshot: LocalCalendarSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
