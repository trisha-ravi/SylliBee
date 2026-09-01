import type { CalendarEvent, Course, EventKind } from '../types';
import { buildCourse, uniqueCourseId } from './courses';
import { resolveDueDate, parseFlexibleDate } from './dates';

export interface ImportSummary {
  totalCourses: number;
  classMeetings: number;
  assignments: number;
  exams: number;
  quizzes: number;
  projects: number;
  readings: number;
  other: number;
  totalEvents: number;
}

export interface ImportResult {
  courses: Course[];
  events: CalendarEvent[];
  summary: ImportSummary;
  errors: string[];
}

let eventUid = 5000;

const DAY_NAMES: Record<string, number> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2,
  thursday: 3, thu: 3, thur: 3, thurs: 3,
  friday: 4, fri: 4,
  saturday: 5, sat: 5,
  sunday: 6, sun: 6,
};

const TYPE_MAP: Record<string, EventKind> = {
  assignment: 'assignment',
  homework: 'assignment',
  quiz: 'quiz',
  exam: 'exam',
  project: 'assignment',
  reading: 'reading',
  presentation: 'presentation',
  class: 'class',
  'class meeting': 'class',
  lecture: 'class',
  other: 'assignment',
};

const LABELED_FIELD =
  /^(title|type|date|time|description|day|days|start time|end time|location|course code|course name|professor|semester|meeting days?|meeting time):/i;

function fallbackDayIndex(resolved: { d: number | null; date: string | null }): number {
  if (resolved.d != null) return resolved.d;
  if (resolved.date) {
    const parsed = parseFlexibleDate(resolved.date);
    if (parsed) {
      const dow = parsed.getDay();
      return dow === 0 ? 6 : dow - 1;
    }
  }
  return 0;
}

function dateToDayIndex(dateStr: string): number | null {
  const raw = dateStr.trim();
  if (!raw || /^unknown$/i.test(raw) || /^tbd$/i.test(raw)) return null;

  const { d, date } = resolveDueDate(raw);
  if (date) return d;

  const parts = raw.split(/[,&/]|\band\b/i);
  for (const part of parts) {
    const dow = dayNameToIndex(part);
    if (dow != null) return dow;
  }
  return dayNameToIndex(stripEveryPrefix(raw));
}

function dayNameToIndex(s: string): number | null {
  const key = s.trim().toLowerCase().replace(/[,.].*$/, '').replace(/\s+/g, '');
  if (!key) return null;
  if (DAY_NAMES[key] != null) return DAY_NAMES[key];
  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    if (key.startsWith(name) || name.startsWith(key)) return idx;
  }
  return null;
}

function normalizeImportText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[ \t]*[-*]\s+/gm, '')
    .replace(/^[-_=]{3,}\s*$/gm, '')
    .replace(/^(COURSE|CLASS SCHEDULE|ACADEMIC EVENTS|CALENDAR SUMMARY)\s*$/gim, '$1:')
    .replace(/\bCLASS SCHEDULE\b(?!\s*:)/gi, 'CLASS SCHEDULE:')
    .replace(/\bACADEMIC EVENTS\b(?!\s*:)/gi, 'ACADEMIC EVENTS:');
}

function stripCalendarSummary(text: string): string {
  const idx = text.search(/\nCALENDAR SUMMARY\b/i);
  if (idx >= 0) return text.slice(0, idx).trim();
  return text.trim();
}

function countCourseCodeHeaders(text: string): number {
  const body = stripCalendarSummary(normalizeImportText(text));
  return (body.match(/^Course Code:\s*.+/gim) ?? []).length;
}

function parseCourseCodeAndName(trimmed: string): { code: string; name: string } {
  const fromField = fieldValue(trimmed, 'Course Code');
  const nameField = fieldValue(trimmed, 'Course Name');
  if (fromField) {
    return { code: fromField, name: nameField || fromField };
  }

  const codeLine = trimmed.match(/\b([A-Z]{2,5}\s*\d{4}[A-Z]?)\b/);
  if (codeLine) {
    const code = codeLine[1].replace(/\s+/g, ' ').trim();
    return { code, name: nameField || code };
  }

  const inlineCourse = trimmed.match(/^COURSE:\s*(.+)$/im);
  if (inlineCourse) {
    const inline = inlineCourse[1].trim();
    const split = inline.match(/^([A-Z]{2,5}\s*\d{4}[A-Z]?)\s*[-–—:·|]\s*(.+)$/i);
    if (split) return { code: split[1].trim(), name: split[2].trim() };
    if (!/^course\s*code/i.test(inline)) return { code: inline, name: nameField || inline };
  }

  const firstLine = trimmed
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^course:?$/i.test(l) && !isLabeledLine(l));

  if (firstLine) {
    const split = firstLine.match(/^([A-Z]{2,5}\s*\d{4}[A-Z]?)\s*[-–—:·|]\s*(.+)$/i);
    if (split) return { code: split[1].trim(), name: split[2].trim() };
    return { code: firstLine, name: nameField || firstLine };
  }

  return { code: 'Course', name: 'Course' };
}

function stripEveryPrefix(raw: string): string {
  return raw.replace(/^every\s+/i, '').replace(/^each\s+/i, '');
}

function expandDays(raw: string): number[] {
  const out: number[] = [];
  const cleaned = stripEveryPrefix(raw.trim());
  const parts = cleaned.split(/[,&/]|\band\b/i);
  for (const part of parts) {
    const d = dayNameToIndex(part);
    if (d != null && !out.includes(d)) out.push(d);
  }
  if (out.length === 0) {
    const d = dayNameToIndex(cleaned);
    if (d != null) out.push(d);
  }
  return out;
}

function parseTimeToHours(t: string): number | null {
  const s = t.trim();
  if (!s || /^unknown$/i.test(s)) return null;
  const range = s.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (range) return parseSingleTime(range[1]);
  return parseSingleTime(s);
}

function parseEndTime(t: string): number | null {
  const s = t.trim();
  const range = s.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (range) return parseSingleTime(range[2]);
  return parseSingleTime(s);
}

function parseSingleTime(s: string): number | null {
  const t = s.trim();
  const m12 = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3].toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h + min / 60;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) + Number(m24[2]) / 60;
  return null;
}

function fieldValue(block: string, label: string): string {
  const escaped = label.replace(/\s+/g, '\\s+');
  const re = new RegExp(`^${escaped}:\\s*(.+)$`, 'im');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function parseSchedulePatterns(
  block: string,
  courseId: string,
  code: string,
  name: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const re =
    /Day:\s*(.+?)(?:\n|$)\s*Start Time:\s*(.+?)(?:\n|$)(?:\s*End Time:\s*(.+?)(?:\n|$))?(?:\s*Location:\s*(.+?)(?:\n|$))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const days = expandDays(m[1]);
    const start = m[2].trim();
    const end = (m[3] || m[2]).trim();
    const loc = m[4]?.trim();
    for (const d of days) {
      addClassMeeting(events, courseId, code, name, d, start, end, loc);
    }
  }
  return events;
}

function parseOneLineSchedules(
  block: string,
  courseId: string,
  code: string,
  name: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lineRe =
    /^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\w\s,&/and]+?)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i;
  for (const line of block.split('\n').map((l) => l.trim())) {
    if (!line || isLabeledLine(line)) continue;
    const m = line.match(lineRe);
    if (!m) continue;
    const days = expandDays(m[1]);
    for (const d of days) {
      addClassMeeting(events, courseId, code, name, d, m[2], m[2]);
    }
  }
  return events;
}

function parseEventKind(raw: string): EventKind {
  const t = raw.trim().toLowerCase();
  if (t.includes('class meeting') || t === 'class' || t === 'lecture') return 'class';
  for (const [key, kind] of Object.entries(TYPE_MAP)) {
    if (t.includes(key)) return kind;
  }
  return 'assignment';
}

function isLabeledLine(line: string): boolean {
  return LABELED_FIELD.test(line.trim());
}

function nextId(): string {
  return 'e' + ++eventUid;
}

function makeEvent(partial: Omit<CalendarEvent, 'id'>): CalendarEvent {
  return { id: nextId(), ...partial };
}

function addClassMeeting(
  events: CalendarEvent[],
  courseId: string,
  code: string,
  name: string,
  dayIndex: number,
  startRaw: string,
  endRaw: string,
  location?: string,
): void {
  const s = parseTimeToHours(startRaw);
  const e = parseEndTime(endRaw || startRaw) ?? (s != null ? s + 1.25 : null);
  if (s == null || e == null) return;
  events.push(
    makeEvent({
      d: dayIndex,
      k: 'class',
      c: courseId,
      t: code,
      sub: name,
      loc: location || undefined,
      s,
      e,
    }),
  );
}

function parseClassSchedule(
  section: string,
  courseId: string,
  code: string,
  name: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const defaultLocation = fieldValue(section, 'Location');

  const meetingDays = fieldValue(section, 'Meeting Days') || fieldValue(section, 'Days');
  const meetingTime = fieldValue(section, 'Meeting Time') || fieldValue(section, 'Time');
  if (meetingDays && meetingTime) {
    const days = expandDays(meetingDays);
    for (const d of days) {
      addClassMeeting(events, courseId, code, name, d, meetingTime, meetingTime, defaultLocation);
    }
    if (events.length > 0) return events;
  }

  const dayParts = section.split(/(?=^Day:\s)/im).filter((p) => /^Day:\s/i.test(p.trim()) || /Day:\s/.test(p));
  if (dayParts.length > 0) {
    for (const part of dayParts) {
      const dayRaw = fieldValue(part, 'Day') || fieldValue(part, 'Days');
      const start = fieldValue(part, 'Start Time') || fieldValue(part, 'Time');
      const end = fieldValue(part, 'End Time') || start;
      const loc = fieldValue(part, 'Location') || defaultLocation;
      const days = expandDays(dayRaw);
      if (days.length === 0) {
        const d = dayNameToIndex(dayRaw);
        if (d != null) days.push(d);
      }
      for (const d of days) {
        addClassMeeting(events, courseId, code, name, d, start, end, loc);
      }
    }
    if (events.length > 0) return events;
  }

  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^class schedule:?$/i.test(l) && !/^meeting/i.test(l));

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isLabeledLine(line)) {
      i++;
      continue;
    }

    const days = expandDays(line);
    if (days.length > 0) {
      const timeLine = lines[i + 1] ?? '';
      const locLine = lines[i + 2] ?? '';
      const hasTime = parseTimeToHours(timeLine) != null;
      const loc = hasTime && parseTimeToHours(locLine) == null && locLine ? locLine : defaultLocation;
      for (const d of days) {
        if (hasTime) addClassMeeting(events, courseId, code, name, d, timeLine, timeLine, loc);
      }
      i += hasTime ? (loc && loc !== defaultLocation && locLine && !parseTimeToHours(locLine) ? 3 : 2) : 1;
      continue;
    }

    const d = dayNameToIndex(line);
    if (d != null && i + 1 < lines.length) {
      const timeLine = lines[i + 1];
      const s = parseTimeToHours(timeLine);
      if (s != null) {
        const loc = parseTimeToHours(lines[i + 2] ?? '') == null ? lines[i + 2] : undefined;
        addClassMeeting(events, courseId, code, name, d, timeLine, timeLine, loc || defaultLocation);
        i += loc ? 3 : 2;
        continue;
      }
    }

    i++;
  }

  return events;
}

function eventChunks(section: string): string[] {
  const trimmed = section.trim();
  if (!trimmed || /^none\.?$/i.test(trimmed) || /^n\/a$/i.test(trimmed)) return [];

  const byNumber = trimmed.split(/(?=^\s*\d+\.\s)/m).filter((c) => /^\s*\d+\./.test(c));
  if (byNumber.length > 0) return byNumber;

  return trimmed.split(/^\s*\d+\.\s*$/m).filter((c) => c.trim());
}

function parseAcademicEvents(
  section: string,
  courseId: string,
  code: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const chunks = eventChunks(section);

  for (const rawChunk of chunks) {
    let chunk = rawChunk.trim();
    chunk = chunk.replace(/^\d+\.\s*/, '');

    const title = fieldValue(chunk, 'Title') || firstContentLine(chunk);
    const typeRaw = fieldValue(chunk, 'Type') || secondContentLine(chunk, title);
    const dateRaw = fieldValue(chunk, 'Date') || thirdContentLine(chunk, title, typeRaw);
    const timeRaw = fieldValue(chunk, 'Time') || fourthContentLine(chunk);
    const description = fieldValue(chunk, 'Description');

    if (!title || /^unknown$/i.test(title)) continue;

    const kind = parseEventKind(typeRaw || title);

    if (kind === 'class') {
      const days = dateRaw ? expandDays(dateRaw) : [];
      const dayList = days.length > 0 ? days : [dateToDayIndex(stripEveryPrefix(dateRaw))].filter((d): d is number => d != null);
      const time = timeRaw && parseTimeToHours(timeRaw) != null ? timeRaw : dateRaw;
      for (const d of dayList.length > 0 ? dayList : []) {
        addClassMeeting(events, courseId, code, title, d, time, time, description || undefined);
      }
      continue;
    }

    const d = dateRaw ? dateToDayIndex(dateRaw) : null;
    const resolved = dateRaw ? resolveDueDate(dateRaw) : { d: null, date: null };
    const dayIdx = resolved.d ?? d;
    const storedD = dayIdx ?? fallbackDayIndex(resolved);
    if (dayIdx == null && !resolved.date) continue;

    const start = parseTimeToHours(timeRaw);
    const end = parseEndTime(timeRaw);

    if (kind === 'reading' || kind === 'assignment') {
      const due = timeRaw && !/^unknown$/i.test(timeRaw) ? timeRaw : '11:59 PM';
      events.push(
        makeEvent({
          d: storedD,
          date: resolved.date ?? undefined,
          k: kind,
          c: courseId,
          t: title,
          sub: code,
          due,
          hrs: kind === 'assignment' ? 0.5 : undefined,
        }),
      );
      continue;
    }

    if (start != null) {
      events.push(
        makeEvent({
          d: storedD,
          date: resolved.date ?? undefined,
          k: kind,
          c: courseId,
          t: title,
          sub: description || code,
          s: start,
          e: end ?? start + (kind === 'exam' ? 1 : 0.5),
        }),
      );
    } else if (timeRaw && !/^unknown$/i.test(timeRaw)) {
      events.push(
        makeEvent({
          d: storedD,
          date: resolved.date ?? undefined,
          k: kind,
          c: courseId,
          t: title,
          sub: code,
          due: timeRaw,
        }),
      );
    }
  }
  return events;
}

function firstContentLine(chunk: string): string {
  return (
    chunk
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !isLabeledLine(l) && !/^\d+\.?$/.test(l)) ?? ''
  );
}

function secondContentLine(chunk: string, skip: string): string {
  let passed = false;
  for (const line of chunk.split('\n').map((l) => l.trim())) {
    if (!line || isLabeledLine(line)) continue;
    if (!passed && line === skip) {
      passed = true;
      continue;
    }
    if (passed) return line;
  }
  return '';
}

function thirdContentLine(chunk: string, a: string, b: string): string {
  const lines = chunk
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !isLabeledLine(l));
  const skip = new Set([a, b].filter(Boolean));
  for (const line of lines) {
    if (!skip.has(line)) return line;
  }
  return '';
}

function fourthContentLine(chunk: string): string {
  const lines = chunk
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !isLabeledLine(l));
  return lines.length >= 4 ? lines[3] : lines.length >= 3 ? lines[2] : '';
}

function extractSection(block: string, header: string): string {
  const pattern = header.replace(/\s+/g, '\\s+');
  const re = new RegExp(
    `${pattern}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:CLASS\\s+SCHEDULE|ACADEMIC\\s+EVENTS|COURSE|CALENDAR\\s+SUMMARY)\\b|$)`,
    'i',
  );
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function hasSection(block: string, header: string): boolean {
  const pattern = header.replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'i').test(block);
}

function parseCourseBlock(
  block: string,
  index: number,
): { course: Course; events: CalendarEvent[]; hasScheduleSection: boolean; hasEventsSection: boolean } | null {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const { code, name } = parseCourseCodeAndName(trimmed);
  const course = buildCourse(code, name, index);
  const events: CalendarEvent[] = [];

  const scheduleSection = extractSection(trimmed, 'CLASS SCHEDULE');
  const eventsSection = extractSection(trimmed, 'ACADEMIC EVENTS');
  const hasScheduleSection = hasSection(trimmed, 'CLASS SCHEDULE');
  const hasEventsSection = hasSection(trimmed, 'ACADEMIC EVENTS');

  if (scheduleSection) {
    events.push(...parseClassSchedule(scheduleSection, course.id, course.code, course.name));
  }

  if (events.length === 0) {
    events.push(...parseSchedulePatterns(trimmed, course.id, course.code, course.name));
  }

  if (events.length === 0) {
    events.push(...parseOneLineSchedules(trimmed, course.id, course.code, course.name));
  }

  if (eventsSection) {
    events.push(...parseAcademicEvents(eventsSection, course.id, course.code));
  } else if (hasEventsSection) {
    const afterEvents = trimmed.split(/\bACADEMIC EVENTS\s*:?\s*/i)[1]?.split(/\bCALENDAR SUMMARY\b/i)[0] ?? '';
    events.push(...parseAcademicEvents(afterEvents, course.id, course.code));
  }

  return { course, events, hasScheduleSection, hasEventsSection };
}

function splitCourseBlocks(body: string): string[] {
  const normalized = normalizeImportText(body).trim();
  if (!normalized) return [];

  // Each course has a "Course Code:" line — split there so we still catch courses
  // when the AI forgets the COURSE: header on later classes.
  if (/\bcourse\s*code:/i.test(normalized)) {
    const chunks = normalized
      .split(/(?=^Course Code:\s)/im)
      .map((c) => c.trim())
      .filter((c) => c && !/^COURSE:\s*$/i.test(c));

    const blocks = chunks
      .map((chunk) => {
        if (/^COURSE:/i.test(chunk)) return chunk;
        if (/^Course Code:/i.test(chunk)) return `COURSE:\n${chunk}`;
        return null;
      })
      .filter((b): b is string => !!b);

    if (blocks.length > 0) return blocks;
  }

  const parts = normalized
    .split(/(?=^COURSE:\s*)/im)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = parts.filter((p) => /^COURSE:/i.test(p));
  if (blocks.length > 0) return blocks;

  return [];
}

function buildSummary(events: CalendarEvent[], courseCount: number): ImportSummary {
  const summary: ImportSummary = {
    totalCourses: courseCount,
    classMeetings: 0,
    assignments: 0,
    exams: 0,
    quizzes: 0,
    projects: 0,
    readings: 0,
    other: 0,
    totalEvents: events.length,
  };
  for (const e of events) {
    if (e.k === 'class') summary.classMeetings++;
    else if (e.k === 'exam') summary.exams++;
    else if (e.k === 'quiz') summary.quizzes++;
    else if (e.k === 'reading') summary.readings++;
    else if (e.k === 'assignment') summary.assignments++;
    else summary.other++;
  }
  return summary;
}

export function parseCourseImport(text: string): ImportResult {
  const errors: string[] = [];
  const cleaned = normalizeImportText(text).trim();
  if (!cleaned) {
    return {
      courses: [],
      events: [],
      summary: buildSummary([], 0),
      errors: ['Paste your AI-organized course information to continue.'],
    };
  }

  const body = stripCalendarSummary(cleaned);
  const blocks = splitCourseBlocks(body);
  const courseCodeCount = countCourseCodeHeaders(cleaned);

  const courses: Course[] = [];
  const events: CalendarEvent[] = [];
  const usedIds = new Set<string>();

  blocks.forEach((block, i) => {
    const parsed = parseCourseBlock(block, courses.length + i);
    if (!parsed) return;

    let { course, events: courseEvents, hasScheduleSection, hasEventsSection } = parsed;
    const hadSections = hasScheduleSection || hasEventsSection;

    const uniqueId = uniqueCourseId(course.id, usedIds);
    if (uniqueId !== course.id) {
      course = { ...course, id: uniqueId };
      courseEvents = courseEvents.map((e) => ({ ...e, c: uniqueId }));
    }

    if (courseEvents.length === 0 && hadSections) {
      errors.push(
        `${course.code}: could not parse events — check class schedule days/times and academic event dates.`,
      );
    } else if (courseEvents.length === 0) {
      errors.push(`${course.code}: no schedule or events section found.`);
    }

    courses.push(course);
    events.push(...courseEvents);
  });

  if (courses.length === 0) {
    errors.push('No courses found. Make sure your text includes COURSE: sections.');
  } else if (courseCodeCount > courses.length) {
    errors.push(
      `Found ${courseCodeCount} "Course Code:" entries but only parsed ${courses.length} courses. Check that each course has its own schedule section.`,
    );
  }

  return {
    courses,
    events,
    summary: buildSummary(events, courses.length),
    errors,
  };
}
