import type { CalendarEvent, Course } from '../types';
import type { BeezyContext } from '../services/beezy';
import type { DayDescriptor } from './dates';
import { eventDayIndex, eventDayLabel, eventSortTime, isEventInWeek, parseFlexibleDate } from './dates';
import { isPrepForClass, nextClassPrepPriority } from './classPrep';
import { fmt } from './time';

const GRADED: CalendarEvent['k'][] = ['assignment', 'reading', 'quiz', 'presentation', 'exam'];

export type WorkloadLevel = 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface TodayStats {
  classes: number;
  assignments: number;
  deadlines: number;
}

export interface WeekDayLoad {
  count: number;
  label: string;
}

function visible(events: CalendarEvent[], hidden: Record<string, boolean>): CalendarEvent[] {
  return events.filter((e) => !hidden[e.c]);
}

function isOpen(e: CalendarEvent, done: Record<string, boolean>): boolean {
  return !done[e.id] && !e.done;
}

export function todayStats(
  events: CalendarEvent[],
  weekStart: Date,
  days: DayDescriptor[],
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): TodayStats {
  const todayIdx = days.findIndex((d) => d.today);
  if (todayIdx < 0) return { classes: 0, assignments: 0, deadlines: 0 };

  const today = visible(events, hidden).filter((e) => eventDayIndex(e, weekStart) === todayIdx);
  return {
    classes: today.filter((e) => e.k === 'class').length,
    assignments: today.filter((e) => ['assignment', 'quiz', 'presentation'].includes(e.k) && isOpen(e, done)).length,
    deadlines: today.filter((e) => GRADED.includes(e.k) && isOpen(e, done)).length,
  };
}

export function weekDayLoads(
  events: CalendarEvent[],
  weekStart: Date,
  days: DayDescriptor[],
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): WeekDayLoad[] {
  return days.map((day, i) => ({
    label: day.dow,
    count: visible(events, hidden).filter(
      (e) => eventDayIndex(e, weekStart) === i && GRADED.includes(e.k) && isOpen(e, done),
    ).length,
  }));
}

export function weekGradedTotal(
  events: CalendarEvent[],
  weekStart: Date,
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
): number {
  return visible(events, hidden).filter(
    (e) => isEventInWeek(e, weekStart) && GRADED.includes(e.k) && isOpen(e, done),
  ).length;
}

export function workloadLevel(total: number): WorkloadLevel {
  if (total >= 8) return 'HEAVY';
  if (total >= 4) return 'MEDIUM';
  return 'LIGHT';
}

export function workloadLevelStyle(level: WorkloadLevel): { bg: string; border: string; color: string } {
  if (level === 'HEAVY') return { bg: 'rgba(217,85,66,.24)', border: 'rgba(217,85,66,.45)', color: '#A63626' };
  if (level === 'MEDIUM') return { bg: 'rgba(110,91,216,.2)', border: 'rgba(110,91,216,.35)', color: '#4B3CC4' };
  return { bg: 'rgba(26,30,36,.06)', border: 'rgba(26,30,36,.1)', color: 'rgba(35,38,43,.65)' };
}

export function weekCategoryCounts(
  events: CalendarEvent[],
  weekStart: Date,
  hidden: Record<string, boolean>,
): { assignments: number; exams: number; classes: number; clubs: number } {
  const inWeek = visible(events, hidden).filter((e) => isEventInWeek(e, weekStart));
  return {
    assignments: inWeek.filter((e) => ['assignment', 'quiz', 'presentation', 'reading'].includes(e.k)).length,
    exams: inWeek.filter((e) => e.k === 'exam').length,
    classes: inWeek.filter((e) => e.k === 'class').length,
    clubs: inWeek.filter((e) => e.k === 'club').length,
  };
}

export function formatEventWorkload(e: CalendarEvent): string {
  if (e.hrs != null && e.hrs > 0) return `${e.hrs} hour${e.hrs === 1 ? '' : 's'} estimated`;
  if (e.k === 'exam') return 'Exam — plan extra review time';
  if (e.k === 'reading') return '~30 min';
  if (e.k === 'assignment' || e.k === 'quiz') return '~45–60 min';
  if (e.k === 'class' && e.s != null && e.e != null) {
    const hrs = e.e - e.s;
    return `${hrs >= 1 ? Math.round(hrs * 10) / 10 : hrs.toFixed(1)} hr in class`;
  }
  return '—';
}

export function beezyTipForEvent(
  e: CalendarEvent,
  ctx: Pick<BeezyContext, 'events' | 'courseMap' | 'weekStart' | 'days' | 'hidden' | 'done'>,
): string {
  const course = ctx.courseMap[e.c];
  const code = course?.code ?? e.c;
  const when = eventDayLabel(e, ctx.weekStart, ctx.days);
  const vis = visible(ctx.events, ctx.hidden);

  if (e.k === 'class') {
    const items = visible(ctx.events, ctx.hidden).filter(
      (item) =>
        item.c === e.c &&
        ['reading', 'assignment', 'quiz', 'presentation'].includes(item.k) &&
        !isOpen(item, ctx.done) &&
        isPrepForClass(item, e, ctx.weekStart),
    );
    const parts = [`${code} meets ${when}.`];
    if (e.loc) parts.push(`Location: ${e.loc}.`);
    if (items.length) {
      parts.push(
        `Finish before class: ${items
          .slice(0, 3)
          .map((item) => item.t)
          .join(', ')}${items.length > 3 ? ` (+${items.length - 3} more)` : ''}.`,
      );
    }
    return parts.join(' ');
  }

  if (e.k === 'exam') {
    const studyBlocks = vis.filter((x) => x.c === e.c && x.k === 'study');
    let text = `${e.t} for ${code} is ${when}`;
    if (e.due) text += ` at ${e.due}`;
    text += '.';
    if (studyBlocks.length) {
      text += ` You have ${studyBlocks.length} study block${studyBlocks.length === 1 ? '' : 's'} on your calendar.`;
    } else {
      text += ' Consider adding a study session before the exam.';
    }
    return text;
  }

  if (e.k === 'assignment' || e.k === 'quiz' || e.k === 'presentation') {
    let text = `${e.t} (${code}) is due ${when}`;
    if (e.due) text += ` at ${e.due}`;
    text += '.';
    if (e.hrs) text += ` Budget about ${e.hrs} hour${e.hrs === 1 ? '' : 's'}.`;
    else text += ' Starting a day early usually beats an all-nighter.';
    return text;
  }

  if (e.k === 'reading') {
    const classToday = vis.find(
      (item) =>
        item.k === 'class' &&
        item.c === e.c &&
        eventDayIndex(item, ctx.weekStart) === eventDayIndex(e, ctx.weekStart),
    );
    if (classToday?.s != null) {
      return `Reading for ${code}: ${e.t}, due ${when}${e.due ? ` at ${e.due}` : ''}. Try to finish before ${code} at ${fmt(classToday.s)}.`;
    }
    return `Reading for ${code}: ${e.t}, due ${when}${e.due ? ` at ${e.due}` : ''}.`;
  }

  if (e.k === 'study') {
    return e.ai
      ? `Beezy suggested this study block for ${code}. Move it if it conflicts with another event.`
      : `Study time for ${e.sub || code}.`;
  }

  if (e.k === 'club') {
    return `${e.t}${e.loc ? ` at ${e.loc}` : ''} — ${when}.`;
  }

  return `${e.t} · ${code} · ${when}.`;
}

export function beezyRailRecommendation(
  ctx: Pick<BeezyContext, 'events' | 'courseMap' | 'weekStart' | 'days' | 'hidden' | 'done'>,
): string {
  const todayIdx = ctx.days.findIndex((d) => d.today);
  const open = visible(ctx.events, ctx.hidden)
    .filter((e) => GRADED.includes(e.k) && isOpen(e, ctx.done) && isEventInWeek(e, ctx.weekStart))
    .sort((a, b) => eventSortTime(a, ctx.weekStart) - eventSortTime(b, ctx.weekStart));

  if (!open.length) {
    return 'You’re caught up this week. Use + Add Course to import more classes, or browse other weeks on the calendar.';
  }

  const classPrep = nextClassPrepPriority(
    ctx.events,
    ctx.courseMap,
    ctx.weekStart,
    todayIdx,
    ctx.hidden,
    ctx.done,
  );
  if (classPrep) {
    const { group, item } = classPrep;
    return `Before ${group.courseCode} (${group.classTimeLabel}): finish ${item.t} first.`;
  }

  const next = open[0];
  const code = ctx.courseMap[next.c]?.code ?? next.c;
  const when = eventDayLabel(next, ctx.weekStart, ctx.days);
  const urgent =
    todayIdx >= 0 && eventDayIndex(next, ctx.weekStart) === todayIdx
      ? 'today'
      : todayIdx >= 0 && eventDayIndex(next, ctx.weekStart) === todayIdx + 1
        ? 'tomorrow'
        : when;

  if (next.k === 'exam') {
    return `Priority: ${next.t} (${code}) is ${urgent}. Review your notes and add study time if you need it.`;
  }

  return `Start ${next.t} for ${code} — due ${urgent}${next.due ? ` at ${next.due}` : ''}.`;
}

export interface SemesterMark {
  label: string;
  kind: CalendarEvent['k'];
  position: number;
  event: CalendarEvent;
}

export interface PlacedSemesterMark extends SemesterMark {
  row: number;
  left: number;
  shortLabel: string;
}

const CHIP_WIDTH_PCT = 12;
const CHIP_GAP_PCT = 1.2;

export function shortenMarkLabel(label: string, max = 16): string {
  const m = label.match(/^([◆●▲]\s*)(.+)$/);
  if (!m) return label.length > max ? `${label.slice(0, max - 1)}…` : label;
  const [, prefix, text] = m;
  if (prefix.length + text.length <= max) return label;
  const room = max - prefix.length - 1;
  return `${prefix}${text.slice(0, Math.max(room, 4))}…`;
}

/** Assign marks to rows so labels do not overlap horizontally. */
export function placeSemesterMarks(marks: SemesterMark[]): { placed: PlacedSemesterMark[]; rowCount: number } {
  const sorted = [...marks].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
  const rowRightEdges: number[] = [];
  const placed: PlacedSemesterMark[] = [];

  for (const mark of sorted) {
    const half = CHIP_WIDTH_PCT / 2;
    const center = Math.max(half + 0.5, Math.min(100 - half - 0.5, mark.position));
    let row = 0;
    while (row < rowRightEdges.length && center - half < rowRightEdges[row] + CHIP_GAP_PCT) {
      row += 1;
    }
    if (row >= rowRightEdges.length) rowRightEdges.push(-Infinity);
    rowRightEdges[row] = center + half;
    placed.push({
      ...mark,
      row,
      left: center,
      shortLabel: shortenMarkLabel(mark.label),
    });
  }

  const rowCount = placed.length ? Math.max(...placed.map((p) => p.row)) + 1 : 1;
  return { placed, rowCount };
}

/** Prefer dots when a lane is too crowded for readable chips. */
export function semesterLaneIsDense(marks: SemesterMark[]): boolean {
  if (marks.length >= 7) return true;
  const { rowCount } = placeSemesterMarks(marks);
  return rowCount > 3;
}

export interface SemesterLane {
  course: Course;
  marks: SemesterMark[];
}

const SEMESTER_START = new Date(2026, 7, 15);
const SEMESTER_END = new Date(2026, 11, 20);
const SEMESTER_WEEKS = 16;

export function semesterWeekIndex(weekStart: Date): number {
  const weekMs = 7 * 86400000;
  return Math.floor((weekStart.getTime() - SEMESTER_START.getTime()) / weekMs);
}

export function semesterProgressLabel(anchorDate: Date): { label: string; pct: number } {
  const weekMs = 7 * 86400000;
  const week = Math.floor((anchorDate.getTime() - SEMESTER_START.getTime()) / weekMs) + 1;
  const clamped = Math.min(SEMESTER_WEEKS, Math.max(1, week));
  return {
    label: `Fall 2026 · Week ${clamped} of ${SEMESTER_WEEKS}`,
    pct: (clamped / SEMESTER_WEEKS) * 100,
  };
}

function semesterPosition(e: CalendarEvent): number | null {
  const parsed = e.date ? parseFlexibleDate(e.date) : null;
  if (!parsed) return null;
  const start = SEMESTER_START.getTime();
  const end = SEMESTER_END.getTime();
  const t = parsed.getTime();
  if (t < start || t > end) return null;
  return ((t - start) / (end - start)) * 100;
}

export function buildSemesterLanes(
  courses: Course[],
  events: CalendarEvent[],
  hidden: Record<string, boolean>,
): SemesterLane[] {
  const gradedKinds: CalendarEvent['k'][] = ['exam', 'assignment', 'quiz', 'presentation'];
  return courses
    .filter((c) => !c.club && !hidden[c.id])
    .map((course) => {
      const marks: SemesterMark[] = visible(events, hidden)
        .filter((e) => e.c === course.id && gradedKinds.includes(e.k))
        .map((e) => {
          const pos = semesterPosition(e);
          if (pos == null) return null;
          const prefix = e.k === 'exam' ? '◆ ' : e.k === 'presentation' ? '▲ ' : '● ';
          return {
            label: prefix + e.t,
            kind: e.k,
            position: pos,
            event: e,
          };
        })
        .filter((m): m is SemesterMark => m != null)
        .sort((a, b) => a.position - b.position);
      return { course, marks };
    })
    .filter((lane) => lane.marks.length > 0);
}

export function semesterWeekLoads(
  events: CalendarEvent[],
  hidden: Record<string, boolean>,
  done: Record<string, boolean>,
  weeks = SEMESTER_WEEKS,
): number[] {
  const loads = Array.from({ length: weeks }, () => 0);
  const start = SEMESTER_START.getTime();
  const weekMs = 7 * 86400000;

  for (const e of visible(events, hidden)) {
    if (!GRADED.includes(e.k) || !isOpen(e, done)) continue;
    const parsed = e.date ? parseFlexibleDate(e.date) : null;
    if (!parsed) continue;
    const idx = Math.floor((parsed.getTime() - start) / weekMs);
    if (idx >= 0 && idx < weeks) loads[idx]++;
  }

  return loads;
}
