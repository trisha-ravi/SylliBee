import { useEffect, useState } from 'react';
import type { Course, CreateEventInput, ManualAddKind } from '../types';
import { KIND_LABEL } from '../data/constants';
import { useCalendarDates } from '../context/CalendarDateContext';
import { defaultClassMeeting, WEEKDAY_OPTIONS } from '../utils/classSchedule';
import { toISODate } from '../utils/dates';
import { timeInputToDue } from '../utils/time';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(232,233,237,.66)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'dgFade .16s ease',
  zIndex: 94,
};

const modalStyle: React.CSSProperties = {
  maxWidth: '92vw',
  background: 'rgba(255,255,255,.92)',
  backdropFilter: 'blur(36px) saturate(170%)',
  border: '1px solid rgba(26,30,36,.09)',
  borderRadius: 24,
  boxShadow: '0 40px 100px rgba(22,26,34,.10), inset 0 1px 0 rgba(26,30,36,.11)',
  animation: 'dgIn .2s ease',
};

const fieldLabel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11.5,
  fontWeight: 600,
  color: 'rgba(45,49,56,.65)',
  letterSpacing: '.2px',
};

const fieldInput: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(26,30,36,.1)',
  background: 'rgba(26,30,36,.03)',
  color: '#23262B',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
};

const actionBtn: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid rgba(26,30,36,.09)',
  background: 'rgba(26,30,36,.04)',
  color: '#23262B',
  fontSize: 13,
  fontWeight: 550,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const closeBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 9,
  border: '1px solid rgba(26,30,36,.08)',
  background: 'rgba(26,30,36,.04)',
  color: '#3A3E45',
  cursor: 'pointer',
  fontSize: 13,
};

function defaultDate(days: { today?: boolean; date: Date }[]): string {
  const today = days.find((d) => d.today)?.date ?? days[0]?.date ?? new Date();
  return toISODate(today);
}

function usesDueTime(kind: ManualAddKind): boolean {
  return kind === 'assignment' || kind === 'reading' || kind === 'quiz';
}

function usesScheduleTime(kind: ManualAddKind): boolean {
  return kind === 'class' || kind === 'exam' || kind === 'study' || kind === 'club';
}

interface AddEventModalProps {
  kind: ManualAddKind;
  courses: Course[];
  onClose: () => void;
  onCreate: (input: CreateEventInput) => void;
  onAddCourse: () => void;
}

export function AddEventModal({ kind, courses, onClose, onCreate, onAddCourse }: AddEventModalProps) {
  const { days } = useCalendarDates();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(() => defaultDate(days));
  const [day, setDay] = useState(defaultClassMeeting().day);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:15');
  const [dueTime, setDueTime] = useState('23:59');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (courses.length && !courses.some((c) => c.id === courseId)) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  const label = KIND_LABEL[kind] ?? 'Event';
  const recurring = kind === 'class';

  const handleSubmit = () => {
    onCreate({
      kind,
      courseId,
      title: title.trim() || (recurring ? courses.find((c) => c.id === courseId)?.code ?? '' : ''),
      details: details.trim() || undefined,
      date: recurring ? undefined : date,
      day: recurring ? day : undefined,
      start: usesScheduleTime(kind) ? start : undefined,
      end: usesScheduleTime(kind) ? end : undefined,
      due: usesDueTime(kind) ? timeInputToDue(dueTime) : undefined,
      location: location.trim() || undefined,
    });
  };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 440, maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19.5, fontWeight: 600, letterSpacing: '-.4px' }}>Add {label}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 4, lineHeight: 1.45 }}>
              {recurring ? 'Adds a weekly meeting time for the selected course.' : 'Adds a new item to your calendar.'}
            </div>
          </div>
          <button type="button" className="btn-glass" onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {courses.length === 0 ? (
          <div style={{ marginTop: 18 }}>
            <div style={{ padding: '14px 12px', borderRadius: 14, border: '1px dashed rgba(26,30,36,.12)', fontSize: 13, color: 'rgba(45,49,56,.68)', lineHeight: 1.5 }}>
              Add a course first, then you can create assignments and other events for it.
            </div>
            <button type="button" className="btn-primary" onClick={onAddCourse} style={{ ...actionBtn, width: '100%', marginTop: 12, background: 'rgba(26,30,36,.12)' }}>
              Add course
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={fieldLabel}>
              Course
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={fieldInput}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.code} — {course.name}</option>
                ))}
              </select>
            </label>

            {!recurring && (
              <label style={fieldLabel}>
                Title
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${label} name`} style={fieldInput} />
              </label>
            )}

            {recurring ? (
              <>
                <label style={fieldLabel}>
                  Day
                  <select value={day} onChange={(e) => setDay(Number(e.target.value))} style={fieldInput}>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={fieldLabel}>
                    Start
                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={fieldInput} />
                  </label>
                  <label style={fieldLabel}>
                    End
                    <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={fieldInput} />
                  </label>
                </div>
                <label style={fieldLabel}>
                  Location
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or building" style={fieldInput} />
                </label>
              </>
            ) : (
              <>
                <label style={fieldLabel}>
                  Date
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
                </label>
                {usesDueTime(kind) && (
                  <label style={fieldLabel}>
                    Due time
                    <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={fieldInput} />
                  </label>
                )}
                {usesScheduleTime(kind) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={fieldLabel}>
                      Start
                      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={fieldInput} />
                    </label>
                    <label style={fieldLabel}>
                      End
                      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={fieldInput} />
                    </label>
                  </div>
                )}
                {(kind === 'exam' || kind === 'club') && (
                  <label style={fieldLabel}>
                    Location
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or building" style={fieldInput} />
                  </label>
                )}
                <label style={fieldLabel}>
                  Notes
                  <input type="text" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional details" style={fieldInput} />
                </label>
              </>
            )}

            <button type="button" className="btn-primary" onClick={handleSubmit} style={{ ...actionBtn, width: '100%', background: 'rgba(26,30,36,.12)' }}>
              Add {label.toLowerCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
