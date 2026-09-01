import type { CalendarEvent } from '../types';
import { dueToHours } from './time';
import { isVisible } from './eventStyles';

const SCHEDULED_KINDS: CalendarEvent['k'][] = ['class', 'club', 'exam', 'study', 'quiz', 'presentation'];

/** Whether an event has a placeable start time on the week grid. */
export function hasScheduleTime(e: CalendarEvent): boolean {
  if (e.s != null) return true;
  if (SCHEDULED_KINDS.includes(e.k) && e.due) return true;
  return false;
}

/** Resolve start/end hours for grid placement (handles due-only class times). */
export function eventScheduleRange(e: CalendarEvent): { s: number; e: number } | null {
  if (e.s != null) {
    const end = e.e ?? e.s + (e.k === 'exam' ? 1 : 1.25);
    return { s: e.s, e: end };
  }
  if (e.due && SCHEDULED_KINDS.includes(e.k)) {
    const s = dueToHours(e.due);
    const dur = e.k === 'exam' ? 1 : e.k === 'study' ? 0.75 : 1.25;
    return { s, e: s + dur };
  }
  return null;
}

export function withScheduleRange(e: CalendarEvent): CalendarEvent {
  const range = eventScheduleRange(e);
  if (!range) return e;
  return { ...e, s: range.s, e: range.e };
}

/** Classes and clubs always appear on the week grid; other kinds follow the filter. */
export function showOnWeekGrid(
  e: CalendarEvent,
  kind: string,
  hidden: Record<string, boolean>,
): boolean {
  if (!hasScheduleTime(e)) return false;
  if (e.k === 'class' || e.k === 'club') return !hidden[e.c];
  return isVisible(e, kind, hidden);
}
