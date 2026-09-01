import type { CalendarEvent } from '../types';
import { dueToHours } from './time';
import { eventDayIndex } from './dates';

const DUE_SLOT_MINUTES = 30;

export interface DueSlot {
  key: string;
  hour: number;
  top: number;
  events: CalendarEvent[];
}

export function groupDueEventsBySlot(
  events: CalendarEvent[],
  dayIndex: number,
  h0: number,
  hh: number,
  weekStart: Date,
): DueSlot[] {
  const due = events.filter((e) => eventDayIndex(e, weekStart) === dayIndex && e.due && e.s == null);
  const buckets = new Map<string, DueSlot>();

  for (const e of due) {
    const hour = dueToHours(e.due);
    const slotHour = Math.floor(hour * (60 / DUE_SLOT_MINUTES)) / (60 / DUE_SLOT_MINUTES);
    const key = slotHour.toFixed(3);
    const existing = buckets.get(key);
    if (existing) {
      existing.events.push(e);
    } else {
      buckets.set(key, {
        key,
        hour: slotHour,
        top: (slotHour - h0) * hh,
        events: [e],
      });
    }
  }

  return [...buckets.values()].sort((a, b) => a.hour - b.hour);
}

export function gridEndHour(events: CalendarEvent[], h0: number, defaultSpan: number): number {
  let end = h0 + defaultSpan;
  for (const e of events) {
    if (e.e != null) end = Math.max(end, e.e + 0.25);
    if (e.due) end = Math.max(end, dueToHours(e.due) + 0.5);
  }
  return Math.min(24, Math.max(end, h0 + defaultSpan));
}
