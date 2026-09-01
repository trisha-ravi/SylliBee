export type EventKind =
  | 'class'
  | 'assignment'
  | 'exam'
  | 'reading'
  | 'study'
  | 'quiz'
  | 'presentation'
  | 'club';

export interface Course {
  id: string;
  code: string;
  name: string;
  hex: string;
  rgb: string;
  club?: boolean;
}

export interface CalendarEvent {
  id: string;
  d: number;
  k: EventKind;
  c: string;
  t: string;
  sub: string;
  loc?: string;
  s?: number;
  e?: number;
  due?: string;
  /** ISO date (YYYY-MM-DD) for assignments, exams, and other dated events */
  date?: string;
  hrs?: number;
  ai?: boolean;
  done?: boolean;
}

export interface DayInfo {
  dow: string;
  num: number;
  full: string;
  today?: boolean;
}

export type ViewMode = 'Week' | 'Month' | 'Agenda' | 'Semester';
export type KindFilter =
  | 'all'
  | 'class'
  | 'assignment'
  | 'exam'
  | 'reading'
  | 'study'
  | 'club';

export interface DetailState {
  eventId: string;
  courseId: string;
  courseCode: string;
  courseEventCount: number;
  kind: EventKind;
  title: string;
  sub: string;
  course: string;
  rows: { k: string; v: string }[];
  tip: string;
  primary: string;
  dotColor: string;
  dotGlow: string;
  d: number;
  s?: number;
  e?: number;
  due?: string;
  loc?: string;
}

export type EventEditPatch = Pick<CalendarEvent, 'd' | 't' | 'sub' | 'loc' | 's' | 'e' | 'due'>;

export interface ClassMeetingEdit {
  id?: string;
  day: number;
  start: string;
  end: string;
  location: string;
}

export interface CourseManageState {
  id: string;
  code: string;
  name: string;
  hex: string;
  rgb: string;
  eventCount: number;
  hidden: boolean;
  club?: boolean;
  startEditing?: boolean;
  classMeetings: ClassMeetingEdit[];
}

export interface ChatMessage {
  who: 'me' | 'duey';
  text: string;
  act?: string;
}

export type CourseStage = 'intro' | 'paste' | 'preview' | 'manual';

export type ManualAddKind = 'assignment' | 'class' | 'exam' | 'study' | 'club' | 'reading' | 'quiz';

export interface CreateCourseInput {
  code: string;
  name: string;
  club?: boolean;
  meetings?: ClassMeetingEdit[];
}

export interface CreateEventInput {
  kind: ManualAddKind;
  courseId: string;
  title: string;
  details?: string;
  date?: string;
  day?: number;
  start?: string;
  end?: string;
  due?: string;
  location?: string;
}

export interface ImportPreview {
  courses: Course[];
  summary: {
    totalCourses: number;
    classMeetings: number;
    assignments: number;
    exams: number;
    quizzes: number;
    readings: number;
    totalEvents: number;
  };
  errors: string[];
  primaryLabel: string;
  courseBreakdown: { code: string; eventCount: number }[];
}
