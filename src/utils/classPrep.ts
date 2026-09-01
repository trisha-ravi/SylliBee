import type { CalendarEvent, Course } from '../types';
import { eventDayIndex } from './dates';
import { fmt } from './time';

export const PREP_KINDS: CalendarEvent['k'][] = ['reading', 'assignment', 'quiz', 'presentation'];

export interface ClassPrepGroup {
  classEvent: CalendarEvent;
  courseCode: string;
  classTimeLabel: string;
  items: CalendarEvent[];
  openCount: number;
}

export function isPrepKind(kind: CalendarEvent['k']): boolean {
  return PREP_KINDS.includes(kind);
}

/** Course work that should be finished before a specific class meeting this week. */
export function isPrepForClass(
  item: CalendarEvent,
  classEvent: CalendarEvent,
  weekStart: Date,
): boolean {
  if (classEvent.k !== 'class' || item.c !== classEvent.c) return false;
  if (!isPrepKind(item.k)) return false;

  const classIdx = eventDayIndex(classEvent, weekStart);
  const itemIdx = eventDayIndex(item, weekStart);
  if (classIdx == null || itemIdx == null) return false;

  return itemIdx <= classIdx;
}

export function prepBeforeClass(
  classEvent: CalendarEvent,
  events: CalendarEvent[],
  weekStart: Date,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): CalendarEvent[] {
  return events
    .filter((e) => !hidden[e.c] && !done[e.id] && !e.done)
    .filter((e) => isPrepForClass(e, classEvent, weekStart))
    .sort((a, b) => {
      const aIdx = eventDayIndex(a, weekStart) ?? 99;
      const bIdx = eventDayIndex(b, weekStart) ?? 99;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.t.localeCompare(b.t);
    });
}

export function classPrepGroupsForDay(
  dayIdx: number,
  events: CalendarEvent[],
  courseMap: Record<string, Course>,
  weekStart: Date,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): ClassPrepGroup[] {
  const classes = events
    .filter((e) => e.k === 'class' && !hidden[e.c] && eventDayIndex(e, weekStart) === dayIdx)
    .sort((a, b) => (a.s ?? 0) - (b.s ?? 0));

  return classes
    .map((classEvent) => {
      const items = prepBeforeClass(classEvent, events, weekStart, hidden, done);
      const course = courseMap[classEvent.c];
      const classTime = classEvent.s != null ? fmt(classEvent.s) : '';
      return {
        classEvent,
        courseCode: course?.code ?? classEvent.c,
        classTimeLabel: classTime || 'class',
        items,
        openCount: items.length,
      };
    })
    .filter((group) => group.openCount > 0);
}

export function prepItemIdsForDay(
  dayIdx: number,
  events: CalendarEvent[],
  courseMap: Record<string, Course>,
  weekStart: Date,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): Set<string> {
  return new Set(
    classPrepGroupsForDay(dayIdx, events, courseMap, weekStart, hidden, done).flatMap((group) =>
      group.items.map((item) => item.id),
    ),
  );
}

export function formatClassPrepSummary(group: ClassPrepGroup): string {
  if (!group.items.length) return '';
  const names = group.items.slice(0, 3).map((item) => item.t);
  const extra = group.items.length - names.length;
  let text = names.join(', ');
  if (extra > 0) text += `, +${extra} more`;
  return text;
}

export function classPrepTip(
  classEvent: CalendarEvent,
  events: CalendarEvent[],
  courseMap: Record<string, Course>,
  weekStart: Date,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): string {
  const course = courseMap[classEvent.c];
  const code = course?.code ?? classEvent.c;
  const when = classEvent.s != null ? ` at ${fmt(classEvent.s)}` : '';
  const items = prepBeforeClass(classEvent, events, weekStart, hidden, done);

  if (!items.length) {
    return `${code} meets${when}. You're set — nothing flagged to finish before class.`;
  }

  const summary = items
    .slice(0, 4)
    .map((item) => `${item.t} (${item.k === 'reading' ? 'reading' : 'due'})`)
    .join('; ');
  const extra = items.length > 4 ? ` …and ${items.length - 4} more.` : '.';
  return `Before ${code}${when}: ${summary}${extra}`;
}

export function nextClassPrepPriority(
  events: CalendarEvent[],
  courseMap: Record<string, Course>,
  weekStart: Date,
  todayIdx: number,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): { group: ClassPrepGroup; item: CalendarEvent } | null {
  if (todayIdx < 0) return null;

  const groups = classPrepGroupsForDay(todayIdx, events, courseMap, weekStart, hidden, done);
  for (const group of groups) {
    const item = group.items[0];
    if (item) return { group, item };
  }
  return null;
}
