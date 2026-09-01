import type { CalendarEvent, ClassMeetingEdit } from '../types';
import { hoursToTimeInput, timeInputToHours } from './time';

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
] as const;

export function scheduleKindForCourse(club?: boolean): CalendarEvent['k'] {
  return club ? 'club' : 'class';
}

export function classEventsToMeetings(events: CalendarEvent[]): ClassMeetingEdit[] {
  return events
    .slice()
    .sort((a, b) => a.d - b.d || (a.s ?? 0) - (b.s ?? 0))
    .map((event) => ({
      id: event.id,
      day: event.d,
      start: event.s != null ? hoursToTimeInput(event.s) : '09:00',
      end: event.e != null ? hoursToTimeInput(event.e) : '10:15',
      location: event.loc ?? '',
    }));
}

export function validateClassMeetings(meetings: ClassMeetingEdit[]): string | null {
  for (const meeting of meetings) {
    const start = timeInputToHours(meeting.start);
    const end = timeInputToHours(meeting.end);
    if (start == null || end == null) {
      return 'Enter valid start and end times for each meeting.';
    }
    if (end <= start) {
      return 'End time must be after start time.';
    }
  }
  return null;
}

export function defaultClassMeeting(): ClassMeetingEdit {
  return { day: 1, start: '09:00', end: '10:15', location: '' };
}
