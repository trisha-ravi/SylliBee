export const fmt = (h: number): string => {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return h12 + (m ? ':' + String(m).padStart(2, '0') : ':00') + ' ' + ap;
};

export const range = (s: number, e: number): string => {
  const a = fmt(s);
  const b = fmt(e);
  const ap = a.slice(-2);
  const bp = b.slice(-2);
  return (ap === bp ? a.slice(0, -3) : a) + ' – ' + b;
};

export const shortTime = (due?: string, s?: number): string => {
  if (s != null) return fmt(s).replace(' PM', 'p').replace(' AM', 'a');
  if (due) return due.replace(' PM', 'p').replace(' AM', 'a');
  return '';
};

export function hoursToTimeInput(h: number): string {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeInputToHours(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

export function dueToTimeInput(due: string): string {
  const m = due.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return '23:59';
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function timeInputToDue(value: string): string {
  const h = timeInputToHours(value);
  if (h == null) return '11:59 PM';
  return fmt(h);
}

/** Decimal hour for positioning due events on the week grid (default 11:59 PM). */
export function dueToHours(due?: string): number {
  if (!due) return 23 + 59 / 60;
  const m = due.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return 23 + 59 / 60;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h + min / 60;
}

export function eventStartHour(e: { s?: number; due?: string }): number {
  if (e.s != null) return e.s;
  if (e.due) return dueToHours(e.due);
  return 23.98;
}
