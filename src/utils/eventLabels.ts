import type { CalendarEvent } from '../types';
import { KIND_LABEL } from '../data/constants';
import { shortTime } from './time';

/** Secondary line under an event title (course code, location, etc.). */
export function eventMetaLine(e: CalendarEvent, code: string): string {
  if (e.k === 'class') return [code, e.loc].filter(Boolean).join(' · ');
  if (e.k === 'club') return e.loc || code;
  if (e.k === 'exam' && e.loc) return `${code} · ${e.loc}`;
  return e.sub || code;
}

/** Compact label for month grid chips. */
export function monthEventLabel(e: CalendarEvent, code: string): string {
  if (e.k === 'class') {
    return [code, e.loc].filter(Boolean).join(' · ');
  }
  if (e.k === 'club') {
    return e.loc ? `${code} · ${e.loc}` : code;
  }
  const time =
    e.s != null
      ? shortTime(undefined, e.s)
      : e.due
        ? shortTime(e.due)
        : '';
  const title = e.t.length > 28 ? `${e.t.slice(0, 26)}…` : e.t;
  return time ? `${time} · ${title}` : title;
}

export function monthEventSort(a: CalendarEvent, b: CalendarEvent): number {
  const hour = (e: CalendarEvent) => {
    if (e.s != null) return e.s;
    if (e.due) {
      const m = e.due.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (m) {
        let h = Number(m[1]);
        const ap = m[3].toUpperCase();
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return h + (m[2] ? Number(m[2]) / 60 : 0);
      }
    }
    return 12;
  };
  return hour(a) - hour(b) || a.t.localeCompare(b.t);
}

export function upNextMeta(e: CalendarEvent, code: string): string {
  if (e.k === 'class') return eventMetaLine(e, code);
  return `${KIND_LABEL[e.k]} · ${code}`;
}
