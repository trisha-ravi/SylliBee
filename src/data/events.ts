import type { CalendarEvent } from '../types';

let uid = 0;
const ev = (o: Omit<CalendarEvent, 'id'>): CalendarEvent =>
  Object.assign({ id: 'e' + ++uid }, o);

export const BASE_EVENTS: CalendarEvent[] = [
  ev({ d: 0, k: 'class', c: 'lmc3206', t: 'LMC 3206', sub: 'Communication & Culture', loc: 'Skiles 006', s: 9, e: 10.25 }),
  ev({ d: 0, k: 'class', c: 'econ2105', t: 'ECON 2105', sub: 'Principles of Economics', loc: 'Clough 152', s: 13.5, e: 14.75 }),
  ev({ d: 0, k: 'reading', c: 'econ2105', t: 'Chapter 4 Reading', sub: 'ECON 2105', due: '11:59 PM' }),

  ev({ d: 1, k: 'class', c: 'lmc3402', t: 'LMC 3402', sub: 'Technical Communication', loc: 'Skiles 308', s: 11, e: 12.25 }),
  ev({ d: 1, k: 'class', c: 'acct2101', t: 'ACCT 2101', sub: 'Accounting I', loc: 'Scheller 200', s: 15, e: 16.25 }),
  ev({ d: 1, k: 'assignment', c: 'lmc3402', t: 'Discussion Post 3', sub: 'LMC 3402', due: '11:59 PM', hrs: 0.5 }),
  ev({ d: 1, k: 'study', c: 'lmc3206', t: 'Memo outline', sub: 'LMC 3206 study', s: 19, e: 19.75, ai: true }),

  ev({ d: 2, k: 'class', c: 'lmc3206', t: 'LMC 3206', sub: 'Communication & Culture', loc: 'Skiles 006', s: 9, e: 10.25 }),
  ev({ d: 2, k: 'class', c: 'econ2105', t: 'ECON 2105', sub: 'Principles of Economics', loc: 'Clough 152', s: 13.5, e: 14.75 }),
  ev({ d: 2, k: 'study', c: 'econ2105', t: 'Exam 1 review', sub: 'Ch. 1–5 · ECON', s: 17, e: 18, ai: true }),
  ev({ d: 2, k: 'reading', c: 'econ2105', t: 'Chapter 5 Reading', sub: 'ECON 2105', due: '11:59 PM' }),

  ev({ d: 3, k: 'exam', c: 'econ2105', t: 'ECON 2105 EXAM 1', sub: 'Chapters 1–5', loc: 'Clough 152', s: 10, e: 11 }),
  ev({ d: 3, k: 'class', c: 'lmc3402', t: 'LMC 3402', sub: 'Technical Communication', loc: 'Skiles 308', s: 11.5, e: 12.75 }),
  ev({ d: 3, k: 'class', c: 'acct2101', t: 'ACCT 2101', sub: 'Accounting I', loc: 'Scheller 200', s: 15, e: 16.25 }),
  ev({ d: 3, k: 'assignment', c: 'lmc3206', t: 'Research Memo', sub: 'LMC 3206', due: '11:59 PM', hrs: 2 }),

  ev({ d: 4, k: 'class', c: 'lmc3206', t: 'LMC 3206', sub: 'Communication & Culture', loc: 'Skiles 006', s: 9, e: 10.25 }),
  ev({ d: 4, k: 'class', c: 'econ2105', t: 'ECON 2105', sub: 'Principles of Economics', loc: 'Clough 152', s: 13.5, e: 14.75 }),
  ev({ d: 4, k: 'quiz', c: 'acct2101', t: 'Quiz 2', sub: 'ACCT 2101 · Ledgers', s: 16.5, e: 17 }),

  ev({ d: 5, k: 'study', c: 'acct2101', t: 'Practice problems', sub: 'ACCT 2101 study', s: 11, e: 12, ai: true }),
  ev({ d: 6, k: 'study', c: 'lmc3402', t: 'Presentation prep', sub: 'LMC 3402 study', s: 14, e: 15, ai: true }),
  ev({ d: 6, k: 'reading', c: 'lmc3206', t: 'Ch. 6 Reading', sub: 'LMC 3206', due: '11:59 PM' }),

  ev({ d: 1, k: 'club', c: 'consult', t: 'Chapter meeting', sub: 'Consulting Club', loc: 'Klaus 1443', s: 18, e: 19 }),
  ev({ d: 2, k: 'club', c: 'hackgt', t: 'E-board sync', sub: 'HackGT', loc: 'CULC 152', s: 12.5, e: 13 }),
  ev({ d: 3, k: 'club', c: 'hackgt', t: 'Build night', sub: 'HackGT', loc: 'CODA 9th', s: 17.5, e: 19 }),
  ev({ d: 4, k: 'assignment', c: 'consult', t: 'Case comp application', sub: 'Consulting Club', due: '11:59 PM', hrs: 1 }),
  ev({ d: 5, k: 'club', c: 'consult', t: 'Volunteer shift', sub: 'Consulting Club · service', loc: 'Tech Square', s: 9, e: 11 }),
];

export const MONTH_ITEMS: Record<number, { t: string; k: string; c: string }[]> = {
  1: [{ t: 'Discussion Post 3', k: 'assignment', c: 'lmc3402' }],
  2: [{ t: 'Ch. 5 Reading', k: 'reading', c: 'econ2105' }],
  3: [
    { t: 'ECON Exam 1', k: 'exam', c: 'econ2105' },
    { t: 'Research Memo', k: 'assignment', c: 'lmc3206' },
  ],
  4: [{ t: 'ACCT Quiz 2', k: 'quiz', c: 'acct2101' }],
  8: [{ t: 'Problem Set 2', k: 'assignment', c: 'acct2101' }],
  10: [{ t: 'Ch. 7 Reading', k: 'reading', c: 'econ2105' }],
  11: [
    { t: 'Media Analysis', k: 'assignment', c: 'lmc3402' },
    { t: 'Study block', k: 'study', c: 'lmc3402' },
  ],
  15: [{ t: 'LMC Quiz 1', k: 'quiz', c: 'lmc3206' }],
  17: [{ t: 'ECON Practice Exam', k: 'study', c: 'econ2105' }],
  18: [
    { t: 'ECON Exam 2', k: 'exam', c: 'econ2105' },
    { t: 'Lab Report', k: 'assignment', c: 'acct2101' },
    { t: 'Ch. 8 Reading', k: 'reading', c: 'econ2105' },
  ],
  21: [{ t: 'Project Draft', k: 'assignment', c: 'lmc3402' }],
  24: [{ t: 'ACCT Midterm', k: 'exam', c: 'acct2101' }],
  25: [{ t: 'Ch. 9 Reading', k: 'reading', c: 'econ2105' }],
  29: [{ t: 'Presentation', k: 'presentation', c: 'lmc3402' }],
  30: [{ t: 'Problem Set 3', k: 'assignment', c: 'acct2101' }],
};

export const SEM_LOAD = [2, 5, 3, 4, 7, 3, 6, 9, 4, 3, 6, 8, 2, 5, 7, 10];

export const SEM_LANES = [
  { id: 'lmc3206', marks: [{ x: 8, l: '◆ Quiz 1', k: 'exam' }, { x: 26, l: '● Memo', k: 'a' }, { x: 58, l: '● Paper', k: 'a' }, { x: 92, l: '◆ Final', k: 'exam' }] },
  { id: 'lmc3402', marks: [{ x: 14, l: '● Analysis', k: 'a' }, { x: 44, l: '● Draft', k: 'a' }, { x: 68, l: '▲ Talk', k: 'p' }, { x: 88, l: '● Portfolio', k: 'a' }] },
  { id: 'econ2105', marks: [{ x: 5, l: '◆ Exam 1', k: 'exam' }, { x: 30, l: '◆ Exam 2', k: 'exam' }, { x: 62, l: '◆ Exam 3', k: 'exam' }, { x: 94, l: '◆ Final', k: 'exam' }] },
  { id: 'acct2101', marks: [{ x: 10, l: '● PS 2', k: 'a' }, { x: 38, l: '◆ Midterm', k: 'exam' }, { x: 56, l: '● PS 5', k: 'a' }, { x: 90, l: '◆ Final', k: 'exam' }] },
];
