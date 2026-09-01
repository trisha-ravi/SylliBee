import type { CSSProperties } from 'react';
import type { CalendarEvent, Course } from '../types';
import { CMAP, HH, H0 } from '../data/constants';
import { getCourse } from './courses';

export function isEventComplete(e: CalendarEvent, done: Record<string, boolean>): boolean {
  return !!done[e.id] || !!e.done;
}

export function completeClass(e: CalendarEvent, done: Record<string, boolean>): string {
  return isEventComplete(e, done) ? ' event-complete' : '';
}

export function dueChipStyle(e: CalendarEvent, cmap: Record<string, Course> = CMAP): CSSProperties {
  const c = getCourse(cmap, e.c);
  return {
    flex: '1 1 45%',
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 6px',
    borderRadius: 7,
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#23262B',
    textAlign: 'left',
    background: `rgba(${c.rgb},.14)`,
    border: `1px dashed rgba(${c.rgb},.5)`,
    borderLeft: `2px solid ${c.hex}`,
    overflow: 'hidden',
  };
}

export function blockStyle(
  e: CalendarEvent,
  cmap: Record<string, Course> = CMAP,
  grid?: { h0: number; hh: number },
): CSSProperties {
  const c = getCourse(cmap, e.c);
  const h0 = grid?.h0 ?? H0;
  const hh = grid?.hh ?? HH;
  const top = (e.s! - h0) * hh;
  const h = Math.max(30, (e.e! - e.s!) * hh - 3);
  const base: CSSProperties = {
    position: 'absolute',
    left: 4,
    right: 4,
    top,
    height: h,
    borderRadius: 11,
    padding: '6px 9px',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#23262B',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
    transition: 'transform .12s ease',
    display: 'block',
    border: 'none',
  };

  if (e.k === 'exam') {
    return {
      ...base,
      background: 'linear-gradient(160deg, rgba(217,85,66,.20), rgba(217,85,66,.10))',
      border: '1.5px solid rgba(217,85,66,.62)',
      boxShadow: '0 8px 22px rgba(217,85,66,.20), inset 0 1px 0 rgba(26,30,36,.12)',
    };
  }
  if (e.k === 'club') {
    return {
      ...base,
      background: `repeating-linear-gradient(135deg, rgba(${c.rgb},.22) 0 7px, rgba(${c.rgb},.12) 7px 14px)`,
      border: `1px solid rgba(${c.rgb},.55)`,
      boxShadow: '0 6px 16px rgba(22,26,34,.10)',
    };
  }
  if (e.k === 'study') {
    return {
      ...base,
      background: `rgba(${c.rgb},.13)`,
      border: `1px dashed rgba(${c.rgb},.62)`,
      boxShadow: 'none',
    };
  }
  if (e.k === 'quiz') {
    return {
      ...base,
      background: `linear-gradient(160deg, rgba(${c.rgb},.36), rgba(${c.rgb},.16))`,
      border: `1px solid rgba(${c.rgb},.72)`,
      boxShadow: '0 6px 16px rgba(22,26,34,.05)',
    };
  }
  return {
    ...base,
    background: `linear-gradient(160deg, rgba(${c.rgb},.30), rgba(${c.rgb},.13))`,
    border: `1px solid rgba(${c.rgb},.52)`,
    boxShadow: `0 6px 16px rgba(22,26,34,.045), inset 0 1px 0 rgba(26,30,36,.07)`,
  };
}

export function isVisible(
  e: CalendarEvent,
  kind: string,
  hidden: Record<string, boolean>
): boolean {
  if (hidden[e.c]) return false;
  if (kind === 'all') return true;
  if (kind === 'class') return e.k === 'class';
  if (kind === 'assignment') return e.k === 'assignment' || e.k === 'quiz' || e.k === 'presentation';
  if (kind === 'exam') return e.k === 'exam' || e.k === 'quiz';
  if (kind === 'reading') return e.k === 'reading';
  if (kind === 'study') return e.k === 'study';
  if (kind === 'club') return e.k === 'club';
  return true;
}
