import type { CalendarEvent, Course } from '../types';
import type { DayDescriptor } from '../utils/dates';
import {
  addDays,
  eventDayIndex,
  eventDayLabel,
  eventSortTime,
  formatWeekRange,
  isEventInWeek,
  parseFlexibleDate,
  startOfDay,
  startOfWeekMonday,
} from '../utils/dates';
import { eventStartHour, fmt } from '../utils/time';
import { KIND_LABEL } from '../data/constants';
import { beezyBullets, beezyParagraphs, beezySection } from '../utils/beezyFormat';
import { classPrepGroupsForDay } from '../utils/classPrep';

export interface BeezyContext {
  events: CalendarEvent[];
  courses: Course[];
  courseMap: Record<string, Course>;
  hidden: Record<string, boolean>;
  done: Record<string, boolean>;
  weekStart: Date;
  days: DayDescriptor[];
}

export interface BeezyReply {
  text: string;
  act?: string;
}

const GRADED: CalendarEvent['k'][] = ['assignment', 'reading', 'quiz', 'presentation', 'exam'];
const ASSIGNMENT_LIKE: CalendarEvent['k'][] = ['assignment', 'quiz', 'presentation'];

function todayIdx(ctx: BeezyContext): number {
  return ctx.days.findIndex((d) => d.today);
}

function viewingCurrentWeek(ctx: BeezyContext): boolean {
  return todayIdx(ctx) >= 0;
}

function weekPhrase(ctx: BeezyContext): string {
  const range = formatWeekRange(ctx.weekStart);
  return viewingCurrentWeek(ctx) ? `This week (${range})` : `The week of ${range}`;
}

function dayLabel(ctx: BeezyContext, idx: number): string {
  const t = todayIdx(ctx);
  if (t >= 0 && idx === t) return 'Today';
  if (t >= 0 && idx === t + 1) return 'Tomorrow';
  return ctx.days[idx]?.full.split(',')[0] ?? 'that day';
}

function visibleEvents(ctx: BeezyContext): CalendarEvent[] {
  return ctx.events.filter((e) => !ctx.hidden[e.c]);
}

function eventsInWeek(ctx: BeezyContext): CalendarEvent[] {
  return visibleEvents(ctx).filter((e) => isEventInWeek(e, ctx.weekStart));
}

function eventsOnDay(ctx: BeezyContext, dayIdx: number): CalendarEvent[] {
  return eventsInWeek(ctx)
    .filter((e) => eventDayIndex(e, ctx.weekStart) === dayIdx)
    .sort((a, b) => eventStartHour(a) - eventStartHour(b));
}

function isOpen(e: CalendarEvent, ctx: BeezyContext): boolean {
  return !ctx.done[e.id] && !e.done;
}

function openGradedInWeek(ctx: BeezyContext): CalendarEvent[] {
  return eventsInWeek(ctx)
    .filter((e) => GRADED.includes(e.k) && isOpen(e, ctx))
    .sort((a, b) => eventSortTime(a, ctx.weekStart) - eventSortTime(b, ctx.weekStart));
}

function openGradedUpcoming(ctx: BeezyContext): CalendarEvent[] {
  const today = startOfDay(new Date());
  const currentWeek = startOfWeekMonday(today);
  return visibleEvents(ctx)
    .filter((e) => GRADED.includes(e.k) && isOpen(e, ctx))
    .filter((e) => {
      if (e.date) {
        const d = parseFlexibleDate(e.date);
        return d != null && d >= today;
      }
      return isEventInWeek(e, currentWeek);
    })
    .sort((a, b) => eventSortTime(a, currentWeek) - eventSortTime(b, currentWeek));
}

function countInWeek(ctx: BeezyContext, kinds: CalendarEvent['k'][], openOnly = false): number {
  return eventsInWeek(ctx).filter((e) => kinds.includes(e.k) && (!openOnly || isOpen(e, ctx))).length;
}

function formatEvent(e: CalendarEvent, ctx: BeezyContext): string {
  const c = ctx.courseMap[e.c];
  const code = c?.code ?? e.c;
  const when = e.due
    ? `due ${eventDayLabel(e, ctx.weekStart, ctx.days)} at ${e.due}`
    : eventDayLabel(e, ctx.weekStart, ctx.days);
  return `${e.t} · ${code} · ${when}`;
}

function matchCourse(question: string, ctx: BeezyContext): Course | null {
  const q = question.toLowerCase();
  for (const course of ctx.courses) {
    if (q.includes(course.code.toLowerCase())) return course;
    const codeParts = course.code.toLowerCase().split(/[\s-]+/);
    if (codeParts.some((p) => p.length >= 3 && q.includes(p))) return course;
    if (q.includes(course.name.toLowerCase())) return course;
    const slug = course.id.replace(/\d+$/, '');
    if (slug.length > 3 && q.includes(slug)) return course;
  }
  for (const course of Object.values(ctx.courseMap)) {
    if (q.includes(course.code.toLowerCase())) return course;
  }
  return null;
}

function replyToday(ctx: BeezyContext): BeezyReply {
  const t = todayIdx(ctx);
  if (t < 0) {
    return {
      text: beezyParagraphs([
        `You're viewing ${formatWeekRange(ctx.weekStart)}.`,
        'Click Today in the header to jump to the current week, or ask what is due that week.',
      ]),
    };
  }
  const today = eventsOnDay(ctx, t);
  const classes = today.filter((e) => e.k === 'class');
  const dueToday = today.filter((e) => e.due && GRADED.includes(e.k) && isOpen(e, ctx));
  const open = openGradedInWeek(ctx).filter((e) => {
    const idx = eventDayIndex(e, ctx.weekStart);
    return idx != null && idx >= t;
  });

  const parts: string[] = [];

  const prepGroups = classPrepGroupsForDay(t, ctx.events, ctx.courseMap, ctx.weekStart, ctx.hidden, ctx.done);
  if (prepGroups.length) {
    const prepLines = prepGroups.map((group) => {
      const items = group.items.map((item) => item.t).join(', ');
      return `${group.courseCode} (${group.classTimeLabel}): ${items}`;
    });
    parts.push(beezySection('Do before class', beezyBullets(prepLines)));
  }

  if (classes.length) {
    parts.push(
      beezySection(
        `Classes today (${classes.length})`,
        beezyBullets(
          classes.map((e) => {
            const time = e.s != null && e.e != null ? `${fmt(e.s)}–${fmt(e.e)}` : '';
            const loc = e.loc ? ` · ${e.loc}` : '';
            return `${e.t}${time ? ` · ${time}` : ''}${loc}`;
          }),
        ),
      ),
    );
  } else {
    parts.push('No classes on your calendar today.');
  }

  if (dueToday.length) {
    const dueNotBeforeClass = dueToday.filter(
      (item) => !prepGroups.some((group) => group.items.some((prep) => prep.id === item.id)),
    );
    if (dueNotBeforeClass.length) {
      parts.push(
        beezySection(
          `Also due today (${dueNotBeforeClass.length})`,
          beezyBullets(dueNotBeforeClass.map((e) => `${e.t}${e.due ? ` · ${e.due}` : ''}`)),
        ),
      );
    }
  }

  const priority = prepGroups[0]?.items[0] ?? open[0];
  const pIdx = priority ? eventDayIndex(priority, ctx.weekStart) : null;
  const prepGroup = prepGroups.find((group) => group.items.some((item) => item.id === priority?.id));
  if (priority && prepGroup) {
    parts.push(`Start with ${priority.t} before ${prepGroup.courseCode} at ${prepGroup.classTimeLabel}.`);
  } else if (priority && pIdx !== t) {
    parts.push(`Start with ${priority.t} — due ${dayLabel(ctx, pIdx!)}.`);
  } else if (priority && pIdx === t) {
    parts.push(`Top priority: finish ${priority.t} before ${priority.due ?? 'the end of the day'}.`);
  } else if (!dueToday.length && !prepGroups.length) {
    parts.push('Nothing urgent due today — good day to get ahead on readings.');
  }

  return {
    text: beezyParagraphs(parts),
    act: priority && priority.k !== 'exam' ? 'Add study time' : undefined,
  };
}

function replyTomorrow(ctx: BeezyContext): BeezyReply {
  const t = todayIdx(ctx);
  if (t < 0) {
    const label = addDays(ctx.weekStart, 1).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const items = eventsOnDay(ctx, 1).filter((e) => GRADED.includes(e.k) && isOpen(e, ctx));
    if (!items.length) {
      return { text: `For ${formatWeekRange(ctx.weekStart)}, nothing is due on ${label}.` };
    }
    return {
      text: beezyParagraphs([
        `Due ${label}:`,
        beezyBullets(items.map((e) => `${e.t}${e.due ? ` · ${e.due}` : ''}`)),
      ]),
    };
  }
  if (t + 1 > 6) {
    return {
      text: beezyParagraphs([
        'Tomorrow is next week.',
        'Use › to go forward, or ask what is due this week.',
      ]),
    };
  }
  const tomorrow = eventsOnDay(ctx, t + 1);
  const due = tomorrow.filter((e) => GRADED.includes(e.k) && isOpen(e, ctx));

  if (!due.length && !tomorrow.length) {
    return { text: 'Tomorrow looks clear — no classes or deadlines scheduled.' };
  }

  if (!due.length) {
    const classes = tomorrow.filter((e) => e.k === 'class');
    return {
      text: beezyParagraphs([
        `Tomorrow: ${classes.length} class${classes.length === 1 ? '' : 'es'}`,
        'No assignments due.',
      ]),
    };
  }

  return {
    text: beezyParagraphs([
      'Due tomorrow:',
      beezyBullets(due.map((e) => `${e.t}${e.due ? ` · ${e.due}` : ''}`)),
    ]),
  };
}

function replyBusy(ctx: BeezyContext): BeezyReply {
  const counts = ctx.days.map((_, i) => ({
    i,
    n: eventsOnDay(ctx, i).filter((e) => GRADED.includes(e.k) && isOpen(e, ctx)).length,
  }));
  const busiest = [...counts].sort((a, b) => b.n - a.n)[0];
  const assignments = countInWeek(ctx, ASSIGNMENT_LIKE, true);
  const readings = countInWeek(ctx, ['reading'], true);
  const exams = countInWeek(ctx, ['exam'], true);
  const total = openGradedInWeek(ctx).length;

  if (total === 0) {
    return {
      text: `${weekPhrase(ctx)}, you have no open assignments, readings, or exams on your calendar.`,
    };
  }

  const breakdownItems: string[] = [];
  if (assignments) breakdownItems.push(`${assignments} assignment${assignments === 1 ? '' : 's'}`);
  if (readings) breakdownItems.push(`${readings} reading${readings === 1 ? '' : 's'}`);
  if (exams) breakdownItems.push(`${exams} exam${exams === 1 ? '' : 's'}`);

  const parts = [
    `${weekPhrase(ctx)}, you have ${total} open graded item${total === 1 ? '' : 's'}.`,
  ];
  if (breakdownItems.length) {
    parts.push(beezySection('Breakdown', beezyBullets(breakdownItems)));
  }
  if (busiest && busiest.n > 0) {
    parts.push(`Heaviest day: ${dayLabel(ctx, busiest.i)} (${busiest.n} item${busiest.n === 1 ? '' : 's'})`);
  }

  return { text: beezyParagraphs(parts) };
}

function replyCount(ctx: BeezyContext, kinds: CalendarEvent['k'][], label: string, openOnly = true): BeezyReply {
  const n = countInWeek(ctx, kinds, openOnly);
  const list = eventsInWeek(ctx)
    .filter((e) => kinds.includes(e.k) && (!openOnly || isOpen(e, ctx)))
    .sort((a, b) => eventSortTime(a, ctx.weekStart) - eventSortTime(b, ctx.weekStart));

  if (n === 0) {
    return { text: `${weekPhrase(ctx)}, you have no ${label} due.` };
  }

  if (n === 1 && list[0]) {
    const item = list[0];
    const detail = item.due ? ` · ${item.due}` : '';
    return {
      text: `${weekPhrase(ctx)}, you have 1 ${label} due:\n• ${item.t}${detail}`,
    };
  }

  return {
    text: beezyParagraphs([
      `${weekPhrase(ctx)}, you have ${n} ${label} due:`,
      beezyBullets(list.map((e) => formatEvent(e, ctx))),
    ]),
  };
}

function replyStudy(course: Course, ctx: BeezyContext): BeezyReply {
  const related = eventsInWeek(ctx).filter((e) => e.c === course.id);
  const exams = related.filter((e) => e.k === 'exam' && isOpen(e, ctx));
  const upcoming = openGradedInWeek(ctx).filter((e) => e.c === course.id);

  if (exams.length) {
    const exam = exams.sort((a, b) => eventSortTime(a, ctx.weekStart) - eventSortTime(b, ctx.weekStart))[0];
    const idx = eventDayIndex(exam, ctx.weekStart);
    const studyBlocks = related.filter((e) => e.k === 'study' && e.ai);
    const when = idx != null ? dayLabel(ctx, idx) : 'coming up';
    const time = exam.s != null ? ` at ${fmt(exam.s)}` : '';

    const parts = [`${course.code} exam: ${exam.t}`, `When: ${when}${time}`];
    if (studyBlocks.length) {
      parts.push(`${studyBlocks.length} Beezy study block${studyBlocks.length === 1 ? '' : 's'} scheduled.`);
      return { text: beezyParagraphs(parts) };
    }
    return { text: beezyParagraphs([...parts, 'Want me to add a study session?']), act: 'Add study time' };
  }

  if (upcoming.length) {
    const next = upcoming[0];
    return {
      text: beezyParagraphs([
        `For ${course.code}, focus on:`,
        beezyBullets([
          `${next.t} (${KIND_LABEL[next.k].toLowerCase()})`,
          `Due ${eventDayLabel(next, ctx.weekStart, ctx.days)}`,
        ]),
      ]),
      act: 'Add study time',
    };
  }

  return {
    text: `I don't see upcoming deadlines for ${course.code} ${weekPhrase(ctx).toLowerCase()}. Check that the course is imported and visible.`,
  };
}

function replyDueList(ctx: BeezyContext): BeezyReply {
  const open = openGradedInWeek(ctx);
  if (!open.length) {
    return { text: `${weekPhrase(ctx)}, you're all caught up — no open assignments, readings, or exams.` };
  }
  const top = open.slice(0, 5);
  const extra = open.length - top.length;
  const parts = [
    `${weekPhrase(ctx)}, here's what's still open:`,
    beezyBullets(top.map((e) => formatEvent(e, ctx))),
  ];
  if (extra > 0) parts.push(`…and ${extra} more.`);
  return { text: beezyParagraphs(parts) };
}

function replyClasses(ctx: BeezyContext, dayIdx: number): BeezyReply {
  const classes = eventsOnDay(ctx, dayIdx).filter((e) => e.k === 'class');
  if (!classes.length) {
    return { text: `No classes scheduled ${dayLabel(ctx, dayIdx).toLowerCase()}.` };
  }
  const lines = classes.map((e) => {
    const loc = e.loc ? ` · ${e.loc}` : '';
    const time = e.s != null && e.e != null ? `${fmt(e.s)}–${fmt(e.e)}` : '';
    return `${e.t}${time ? ` · ${time}` : ''}${loc}`;
  });
  return {
    text: beezyParagraphs([`Classes ${dayLabel(ctx, dayIdx).toLowerCase()}:`, beezyBullets(lines)]),
  };
}

function replyExams(ctx: BeezyContext): BeezyReply {
  const exams = eventsInWeek(ctx)
    .filter((e) => e.k === 'exam')
    .sort((a, b) => eventSortTime(a, ctx.weekStart) - eventSortTime(b, ctx.weekStart));
  if (!exams.length) return { text: `${weekPhrase(ctx)}, no exams on your calendar.` };
  return {
    text: beezyParagraphs([
      `Exams ${weekPhrase(ctx).toLowerCase()}:`,
      beezyBullets(exams.map((e) => formatEvent(e, ctx))),
    ]),
  };
}

function replyHelp(ctx: BeezyContext): BeezyReply {
  const n = ctx.courses.length;
  const inWeek = eventsInWeek(ctx).length;
  const open = openGradedInWeek(ctx).length;
  return {
    text: beezyParagraphs([
      `I'm looking at ${weekPhrase(ctx)}.`,
      beezyBullets([
        `${n} course${n === 1 ? '' : 's'}`,
        `${inWeek} event${inWeek === 1 ? '' : 's'}`,
        `${open} open deadline${open === 1 ? '' : 's'}`,
      ]),
      beezySection(
        'Try asking',
        beezyBullets([
          'How many assignments are due this week?',
          'What should I work on today?',
          "What's due tomorrow?",
          'How busy is my week?',
          'What exams do I have?',
        ]),
      ),
    ]),
  };
}

export function askBeezy(question: string, ctx: BeezyContext): BeezyReply {
  const q = question.trim().toLowerCase();
  if (!q) return { text: 'Ask me about your classes, deadlines, or what to work on today.' };

  const t = todayIdx(ctx);
  const course = matchCourse(question, ctx);

  if (/help|what can you|how do you/.test(q)) return replyHelp(ctx);

  if (/how many|number of|count of/.test(q)) {
    if (/assignment|homework|hw\b/.test(q)) {
      const n = countInWeek(ctx, ASSIGNMENT_LIKE, true);
      return replyCount(ctx, ASSIGNMENT_LIKE, 'assignment' + (n === 1 ? '' : 's'));
    }
    if (/reading/.test(q)) {
      const n = countInWeek(ctx, ['reading'], true);
      return replyCount(ctx, ['reading'], 'reading' + (n === 1 ? '' : 's'));
    }
    if (/exam|test|midterm|final/.test(q)) {
      const n = countInWeek(ctx, ['exam'], true);
      return replyCount(ctx, ['exam'], 'exam' + (n === 1 ? '' : 's'));
    }
    if (/quiz/.test(q)) {
      const n = countInWeek(ctx, ['quiz'], true);
      return replyCount(ctx, ['quiz'], 'quiz' + (n === 1 ? '' : 's'));
    }
    if (/class|lecture/.test(q)) {
      const n = countInWeek(ctx, ['class'], false);
      return { text: `${weekPhrase(ctx)}, you have ${n} class meeting${n === 1 ? '' : 's'} scheduled.` };
    }
    const open = openGradedInWeek(ctx).length;
    return {
      text: `${weekPhrase(ctx)}, you have ${open} open graded item${open === 1 ? '' : 's'} due (assignments, readings, quizzes, and exams).`,
    };
  }

  if (/exam|test|midterm|final/.test(q) && !/how many/.test(q)) return replyExams(ctx);

  if (/study for|prep for|prepare for/.test(q) && course) return replyStudy(course, ctx);
  if (course && /(when|what).*(due|assignment|homework|reading)/.test(q)) {
    const items = openGradedInWeek(ctx).filter((e) => e.c === course.id);
    if (!items.length) return { text: `No open items for ${course.code} ${weekPhrase(ctx).toLowerCase()}.` };
    return { text: beezyBullets(items.map((e) => formatEvent(e, ctx))) };
  }
  if (course) return replyStudy(course, ctx);

  if (/tomorrow|due tomorrow|anything due tomorrow/.test(q)) return replyTomorrow(ctx);

  if (/today|work on|priority|should i|focus/.test(q)) return replyToday(ctx);

  if (/busy|workload|hectic|overwhelm/.test(q)) return replyBusy(ctx);

  if (/what.?s due|deadline|todo|to-do|open assignment|due this week|this week/.test(q)) return replyDueList(ctx);

  if (/class/.test(q) && /today/.test(q)) return replyClasses(ctx, t);
  if (/class/.test(q) && /tomorrow/.test(q)) return replyClasses(ctx, t + 1);

  if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(q)) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hit = dayNames.findIndex((d) => q.includes(d));
    if (hit >= 0) {
      if (/class/.test(q)) return replyClasses(ctx, hit);
      const dayEvents = eventsOnDay(ctx, hit).filter((e) => GRADED.includes(e.k) && isOpen(e, ctx));
      if (dayEvents.length) {
        return { text: beezyBullets(dayEvents.map((e) => formatEvent(e, ctx))) };
      }
      return { text: `Nothing major due ${ctx.days[hit]?.full.split(',')[0] ?? dayNames[hit]}.` };
    }
  }

  if (q.includes('tomorrow')) return replyTomorrow(ctx);
  if (q.includes('today')) return replyToday(ctx);
  if (q.includes('busy')) return replyBusy(ctx);

  const open = openGradedUpcoming(ctx)[0] ?? openGradedInWeek(ctx)[0];
  if (open) {
    const when = eventDayLabel(open, ctx.weekStart, ctx.days);
    return {
      text: beezyParagraphs([
        "I'm not sure about that.",
        `Your next open item: ${open.t} · ${when}`,
        'Try asking about this week, today, tomorrow, or a course code.',
      ]),
      act: open.k === 'assignment' || open.k === 'reading' ? 'Add study time' : undefined,
    };
  }

  return replyHelp(ctx);
}

export function beezyGreeting(ctx: BeezyContext): string {
  const n = ctx.courses.length;
  if (n === 0) {
    return beezyParagraphs([
      'Hey! Import your syllabi with + Add Course.',
      "I'll help you plan your week.",
    ]);
  }
  const open = openGradedInWeek(ctx).length;
  const assignments = countInWeek(ctx, ASSIGNMENT_LIKE, true);
  const range = formatWeekRange(ctx.weekStart);
  if (open === 0) {
    const weekLabel = viewingCurrentWeek(ctx) ? 'this week' : `the week of ${range}`;
    return beezyParagraphs([
      `Hey! For ${weekLabel}, you're all caught up.`,
      'No open deadlines. Ask me anything.',
    ]);
  }
  const next = openGradedInWeek(ctx)[0];
  const when = eventDayLabel(next, ctx.weekStart, ctx.days);
  const weekLabel = viewingCurrentWeek(ctx) ? 'This week' : `For ${range}`;

  const summary: string[] = [`${open} open deadline${open === 1 ? '' : 's'}`];
  if (assignments > 0) summary.push(`${assignments} assignment${assignments === 1 ? '' : 's'}`);
  summary.push(`Next: ${next.t} · ${when}`);

  return beezyParagraphs([`Hey! ${weekLabel}:`, beezyBullets(summary), 'What do you want to know?']);
}
