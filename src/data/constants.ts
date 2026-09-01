import type { Course } from '../types';

export const COURSES: Course[] = [
  { id: 'lmc3206', code: 'LMC 3206', name: 'Communication & Culture', hex: '#6E5BD8', rgb: '110,91,216' },
  { id: 'lmc3402', code: 'LMC 3402', name: 'Technical Communication', hex: '#2F87C4', rgb: '47,135,196' },
  { id: 'econ2105', code: 'ECON 2105', name: 'Principles of Economics', hex: '#3F9366', rgb: '63,147,102' },
  { id: 'acct2101', code: 'ACCT 2101', name: 'Accounting I', hex: '#C97F2E', rgb: '201,127,46' },
  { id: 'consult', code: 'Consulting Club', name: 'GT Consulting Group', hex: '#BC5A82', rgb: '188,90,130', club: true },
  { id: 'hackgt', code: 'HackGT', name: 'Hackathon Team', hex: '#2E8E85', rgb: '46,142,133', club: true },
];

export const CMAP: Record<string, Course> = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export const KINDS = [
  { id: 'all' as const, label: 'All' },
  { id: 'class' as const, label: 'Classes' },
  { id: 'assignment' as const, label: 'Assignments' },
  { id: 'exam' as const, label: 'Exams' },
  { id: 'reading' as const, label: 'Readings' },
  { id: 'study' as const, label: 'Study' },
  { id: 'club' as const, label: 'Clubs' },
];

export const KIND_LABEL: Record<string, string> = {
  class: 'Class',
  assignment: 'Assignment',
  exam: 'Exam',
  reading: 'Reading',
  study: 'Study',
  quiz: 'Quiz',
  presentation: 'Presentation',
  club: 'Club',
};

export const ICON: Record<string, string> = {
  class: '📚',
  assignment: '📝',
  exam: '🔴',
  reading: '📖',
  study: '📚',
  quiz: '✅',
  presentation: '🎤',
  club: '🎟️',
};

export const DAYS = [
  { dow: 'Mon', num: 31, full: 'Monday, August 31' },
  { dow: 'Tue', num: 1, full: 'Tuesday, September 1', today: true },
  { dow: 'Wed', num: 2, full: 'Wednesday, September 2' },
  { dow: 'Thu', num: 3, full: 'Thursday, September 3' },
  { dow: 'Fri', num: 4, full: 'Friday, September 4' },
  { dow: 'Sat', num: 5, full: 'Saturday, September 5' },
  { dow: 'Sun', num: 6, full: 'Sunday, September 6' },
];

export const HH = 48;
export const H0 = 8;
export const HN = 14;
