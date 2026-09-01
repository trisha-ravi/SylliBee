import type { CalendarEvent } from '../types';
import type { ViewMode } from '../types';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DayDescriptor {
  dow: string;
  num: number;
  full: string;
  today?: boolean;
  date: Date;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return startOfDay(out);
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return startOfDay(out);
}

/** Monday-based week start. */
export function startOfWeekMonday(d: Date): Date {
  const date = startOfDay(d);
  const dow = date.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(date, offset);
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function buildWeekDays(weekStart: Date): DayDescriptor[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      dow: DOW_SHORT[i],
      num: date.getDate(),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      today: isSameDay(date, today),
      date,
    };
  });
}

export function formatPeriodLabel(view: ViewMode, anchorDate: Date, weekStart: Date): string {
  if (view === 'Semester') {
    return `${formatWeekRange(weekStart)} · Fall 2026`;
  }

  if (view === 'Month') {
    return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (view === 'Week' || view === 'Agenda') {
    return formatWeekRange(weekStart);
  }

  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const a = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const b = weekEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

export function parseFlexibleDate(s: string): Date | null {
  const t = s.trim().replace(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun),?\s*/i, '');
  if (!t || /^unknown$/i.test(t) || /^tbd$/i.test(t)) return null;

  const m1 = t.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase()];
    if (mo != null) {
      const yr = m1[3] ? Number(m1[3]) : 2026;
      return startOfDay(new Date(yr, mo, Number(m1[2])));
    }
  }

  const m2 = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return startOfDay(new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])));

  const m3 = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m3) {
    const yr = m3[3] ? (m3[3].length === 2 ? 2000 + Number(m3[3]) : Number(m3[3])) : 2026;
    return startOfDay(new Date(yr, Number(m3[1]) - 1, Number(m3[2])));
  }

  return null;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayIndexInWeek(date: Date, weekStart: Date): number | null {
  const start = startOfDay(weekStart);
  const diff = Math.round((startOfDay(date).getTime() - start.getTime()) / 86400000);
  if (diff < 0 || diff > 6) return null;
  return diff;
}

/** Map a due-date string to calendar day index (only if it falls in the visible week). */
export function resolveDueDate(
  dateStr: string,
  weekStart: Date = startOfWeekMonday(new Date()),
): { d: number | null; date: string | null } {
  const parsed = parseFlexibleDate(dateStr);
  if (parsed) {
    const iso = toISODate(parsed);
    return { d: dayIndexInWeek(parsed, weekStart), date: iso };
  }
  return { d: null, date: null };
}

const RECURRING_KINDS: CalendarEvent['k'][] = ['class', 'club'];

export function mondayDayIndex(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}


export function isRecurringEvent(e: CalendarEvent): boolean {
  return RECURRING_KINDS.includes(e.k) && !e.date;
}

/** Which column (0–6) this event belongs on for the given week view. */
export function eventDayIndex(e: CalendarEvent, weekStart: Date): number | null {
  if (e.date) {
    const parsed = parseFlexibleDate(e.date);
    if (parsed) return dayIndexInWeek(parsed, weekStart);
    return null;
  }
  if (isRecurringEvent(e) && e.d >= 0 && e.d <= 6) return e.d;
  return null;
}

export function eventDayLabel(e: CalendarEvent, weekStart: Date, days?: DayDescriptor[]): string {
  const idx = eventDayIndex(e, weekStart);
  if (idx != null) {
    const day = days?.[idx];
    if (day) return day.full;
    return addDays(weekStart, idx).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
  if (e.date) {
    const parsed = parseFlexibleDate(e.date);
    if (parsed) {
      return parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
  }
  return 'Unknown date';
}

export function isEventInWeek(e: CalendarEvent, weekStart: Date): boolean {
  return eventDayIndex(e, weekStart) != null;
}

/** Absolute calendar date for an event within a given week (null if not in that week). */
export function eventDateInWeek(e: CalendarEvent, weekStart: Date): Date | null {
  const idx = eventDayIndex(e, weekStart);
  if (idx == null) return null;
  return addDays(weekStart, idx);
}

export function weekEndDate(weekStart: Date): Date {
  return addDays(weekStart, 6);
}

export function formatWeekRange(weekStart: Date): string {
  const end = weekEndDate(weekStart);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = weekStart.toLocaleDateString('en-US', opts);
  const endStr =
    weekStart.getFullYear() !== end.getFullYear()
      ? end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
      : weekStart.getMonth() === end.getMonth()
        ? end.toLocaleDateString('en-US', { day: 'numeric' })
        : end.toLocaleDateString('en-US', opts);
  if (weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()) {
    return `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

export function eventSortTime(e: CalendarEvent, weekStart: Date): number {
  const day = eventDateInWeek(e, weekStart);
  if (!day) {
    if (e.date) {
      const parsed = parseFlexibleDate(e.date);
      if (parsed) return parsed.getTime();
    }
    return Number.MAX_SAFE_INTEGER;
  }
  const hour = e.s ?? (e.due ? 23 + 59 / 60 : 12);
  return day.getTime() + hour * 3600000;
}

/** Whether an event should appear on a specific calendar date (month grid / absolute dates). */
export function eventOnDate(e: CalendarEvent, date: Date): boolean {
  if (e.date) {
    const parsed = parseFlexibleDate(e.date);
    return parsed ? isSameDay(parsed, date) : false;
  }
  if (!isRecurringEvent(e)) return false;
  const dow = date.getDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return e.d === idx;
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
  today: boolean;
}

export function buildMonthGrid(monthStart: Date): MonthCell[] {
  const first = startOfMonth(monthStart);
  const gridStart = startOfWeekMonday(first);
  const today = startOfDay(new Date());
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return {
      date,
      inMonth: date.getMonth() === first.getMonth(),
      today: isSameDay(date, today),
    };
  });
}

/** Whether an event can appear anywhere in the given month grid. */
export function eventInMonth(e: CalendarEvent, monthStart: Date): boolean {
  const first = startOfMonth(monthStart);
  const end = startOfDay(new Date(first.getFullYear(), first.getMonth() + 1, 0));

  if (e.date) {
    const parsed = parseFlexibleDate(e.date);
    if (!parsed) return false;
    return parsed >= first && parsed <= end;
  }
  return isRecurringEvent(e);
}
