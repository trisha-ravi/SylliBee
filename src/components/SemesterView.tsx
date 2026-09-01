import type { CalendarEvent, Course } from '../types';
import { getCourse } from '../utils/courses';
import {
  buildSemesterLanes,
  placeSemesterMarks,
  semesterLaneIsDense,
  semesterWeekIndex,
  semesterWeekLoads,
} from '../utils/calendarInsights';

interface SemesterViewProps {
  events: CalendarEvent[];
  courses: Course[];
  hidden: Record<string, boolean>;
  deletedCourses: Record<string, true>;
  done: Record<string, boolean>;
  weekStart: Date;
  onOpen: (e: CalendarEvent) => void;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.80)',
  border: '1px solid rgba(26,30,36,.07)',
  borderRadius: 20,
  boxShadow: '0 24px 56px rgba(22,26,34,.10), inset 0 1px 0 rgba(26,30,36,.07)',
  backdropFilter: 'blur(28px) saturate(150%)',
  padding: '20px 22px',
};

const ROW_HEIGHT = 30;

function laneSummary(marks: { kind: CalendarEvent['k'] }[]): string {
  const exams = marks.filter((m) => m.kind === 'exam').length;
  const assignments = marks.filter((m) => m.kind === 'assignment' || m.kind === 'quiz' || m.kind === 'presentation').length;
  const parts: string[] = [];
  if (exams) parts.push(`${exams} exam${exams === 1 ? '' : 's'}`);
  if (assignments) parts.push(`${assignments} deadline${assignments === 1 ? '' : 's'}`);
  return parts.join(' · ') || `${marks.length} items`;
}

export function SemesterView({
  events,
  courses,
  hidden,
  deletedCourses,
  done,
  weekStart,
  onOpen,
}: SemesterViewProps) {
  const loads = semesterWeekLoads(events, hidden, done);
  const maxLoad = Math.max(1, ...loads);
  const currentWeek = semesterWeekIndex(weekStart);
  const lanes = buildSemesterLanes(courses, events, hidden).filter((l) => !deletedCourses[l.course.id]);

  return (
    <div className="calendar-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-.3px' }}>Fall 2026 workload</div>
          <div style={{ fontSize: 12, color: 'rgba(45,49,56,.5)' }}>Bar height = graded work due that week</div>
        </div>
        {loads.every((n) => n === 0) ? (
          <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.55)', marginTop: 18, lineHeight: 1.5 }}>
            Import your courses to see semester workload. Assignments and exams with due dates will appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96, marginTop: 18 }}>
            {loads.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6, height: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.round((n / maxLoad) * 100)}%`,
                    minHeight: n > 0 ? 4 : 0,
                    borderRadius: '6px 6px 3px 3px',
                    background:
                      n >= 8
                        ? 'linear-gradient(180deg, #D95542, rgba(217,85,66,.35))'
                        : n >= 4
                          ? 'linear-gradient(180deg, #6E5BD8, rgba(110,91,216,.30))'
                          : 'linear-gradient(180deg, rgba(26,30,36,.28), rgba(26,30,36,.08))',
                    boxShadow: n >= 8 ? '0 0 16px rgba(217,85,66,.42)' : undefined,
                    outline: i === currentWeek ? '1.5px solid rgba(28,32,38,.7)' : undefined,
                    outlineOffset: i === currentWeek ? 2 : undefined,
                  }}
                />
                <div style={{ fontSize: 9.5, color: `rgba(45,49,56,${i === currentWeek ? '.95' : '.42'})`, fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 16, paddingTop: 13, borderTop: '1px solid rgba(26,30,36,.05)' }}>
          {['September', 'October', 'November', 'December'].map((m) => (
            <div key={m} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(45,49,56,.62)', letterSpacing: '.3px' }}>
              {m}
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-.3px' }}>Major deadlines &amp; exams</div>
        {lanes.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.55)', padding: '16px 0', lineHeight: 1.5 }}>
            No dated assignments or exams yet. Import a syllabus with due dates to populate this timeline.
          </div>
        ) : (
          lanes.map((lane) => {
            const c = getCourse({ [lane.course.id]: lane.course }, lane.course.id);
            const dense = semesterLaneIsDense(lane.marks);
            const { placed, rowCount } = placeSemesterMarks(lane.marks);
            const trackHeight = dense ? 32 : rowCount * ROW_HEIGHT + 8;

            return (
              <div key={lane.course.id} className="semester-lane">
                <div className="semester-lane-head">
                  <span className="semester-lane-dot" style={{ background: c.hex, boxShadow: `0 0 10px rgba(${c.rgb},.6)` }} />
                  <span className="semester-lane-code">{c.code}</span>
                  <span className="semester-lane-summary">{laneSummary(lane.marks)}</span>
                </div>

                <div className="semester-lane-track" style={{ height: trackHeight }}>
                  {dense ? (
                    lane.marks.map((m) => (
                      <button
                        key={m.event.id}
                        type="button"
                        className={`semester-mark-dot${m.kind === 'exam' ? ' semester-mark-dot--exam' : ''}`}
                        style={{
                          left: `${m.position}%`,
                          ['--course-hex' as string]: c.hex,
                        }}
                        title={m.label}
                        onClick={() => onOpen(m.event)}
                      />
                    ))
                  ) : (
                    placed.map((m) => (
                      <button
                        key={m.event.id}
                        type="button"
                        className={`semester-mark-chip${m.kind === 'exam' ? ' semester-mark-chip--exam' : ''}`}
                        style={{
                          top: 4 + m.row * ROW_HEIGHT,
                          left: `${m.left}%`,
                          ['--course-rgb' as string]: c.rgb,
                        }}
                        title={m.label}
                        onClick={() => onOpen(m.event)}
                      >
                        {m.shortLabel}
                      </button>
                    ))
                  )}
                </div>

                {dense && (
                  <div className="semester-lane-list">
                    {lane.marks.slice(0, 6).map((m) => (
                      <button key={m.event.id} type="button" className="semester-lane-list-item" onClick={() => onOpen(m.event)}>
                        <span className={`semester-lane-list-kind${m.kind === 'exam' ? ' semester-lane-list-kind--exam' : ''}`}>
                          {m.kind === 'exam' ? '◆' : m.kind === 'presentation' ? '▲' : '●'}
                        </span>
                        <span className="semester-lane-list-text">{m.label.replace(/^[◆●▲]\s*/, '')}</span>
                      </button>
                    ))}
                    {lane.marks.length > 6 && (
                      <span className="semester-lane-list-more">+{lane.marks.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div style={{ display: 'flex', gap: 18, padding: '14px 0 16px', fontSize: 11.5, color: 'rgba(45,49,56,.55)' }}>
          <span>◆ exam</span>
          <span>● assignment / project</span>
          <span>▲ presentation</span>
        </div>
      </div>
    </div>
  );
}
