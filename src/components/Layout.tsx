import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarEvent, Course } from '../types';
import { ICON, KIND_LABEL, KINDS } from '../data/constants';
import { useCourseMap } from '../context/CourseContext';
import { useCalendarDates } from '../context/CalendarDateContext';
import { getCourse } from '../utils/courses';
import { dueToHours, shortTime } from '../utils/time';
import { eventDayIndex, eventDateInWeek, isEventInWeek, startOfDay } from '../utils/dates';
import { upNextMeta } from '../utils/eventLabels';
import { isEventComplete } from '../utils/eventStyles';
import {
  beezyRailRecommendation,
  todayStats,
  weekCategoryCounts,
  weekDayLoads,
  weekGradedTotal,
  workloadLevel,
  workloadLevelStyle,
  semesterProgressLabel,
} from '../utils/calendarInsights';
import { classPrepGroupsForDay, prepItemIdsForDay } from '../utils/classPrep';

interface SidebarProps {
  kind: string;
  hidden: Record<string, boolean>;
  courses: Course[];
  onSetKind: (k: string) => void;
  onToggleHidden: (id: string) => void;
  onManageCourse: (course: Course, startEditing?: boolean) => void;
  onAddCourse: () => void;
}

export function Sidebar({ kind, hidden, courses, onSetKind, onToggleHidden, onManageCourse, onAddCourse }: SidebarProps) {
  const { anchorDate } = useCalendarDates();
  const semester = semesterProgressLabel(anchorDate);
  const courseRows = courses.filter((c) => !c.club);
  const clubRows = courses.filter((c) => c.club);

  return (
    <aside className="app-sidebar">
      <button type="button" className="btn-course" onClick={onAddCourse} style={addCourseBtn}>
        + Add Course
      </button>

      <div>
        <div style={sectionLabel}>Show</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onSetKind(k.id)}
              style={{
                padding: '6px 11px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 550,
                fontFamily: 'inherit',
                cursor: 'pointer',
                ...(kind === k.id
                  ? { background: 'rgba(28,32,38,.95)', color: '#FFFFFF', border: '1px solid rgba(26,30,36,.3)' }
                  : { background: 'rgba(26,30,36,.04)', color: 'rgba(35,38,43,.78)', border: '1px solid rgba(26,30,36,.07)' }),
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <CourseList title="My courses" rows={courseRows} hidden={hidden} onToggle={onToggleHidden} onManage={onManageCourse} />
      <CourseList title="Clubs & orgs" rows={clubRows} hidden={hidden} onToggle={onToggleHidden} onManage={onManageCourse} />

      <div style={{ marginTop: 'auto', padding: 13, borderRadius: 15, background: 'rgba(26,30,36,.05)', border: '1px solid rgba(26,30,36,.07)', backdropFilter: 'blur(18px)' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(45,49,56,.55)' }}>Semester</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>{semester.label}</div>
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(22,26,34,.08)', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${semester.pct}%`, height: '100%', background: 'linear-gradient(90deg, #4B3CC4, #6E5BD8)', borderRadius: 3 }} />
        </div>
      </div>
    </aside>
  );
}

function CourseList({
  title,
  rows,
  hidden,
  onToggle,
  onManage,
}: {
  title: string;
  rows: Course[];
  hidden: Record<string, boolean>;
  onToggle: (id: string) => void;
  onManage: (course: Course, startEditing?: boolean) => void;
}) {
  if (!rows.length) {
    return (
      <div>
        <div style={sectionLabel}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(45,49,56,.45)', padding: '4px 2px 8px' }}>None yet</div>
      </div>
    );
  }

  return (
    <div>
      <div style={sectionLabel}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((c) => {
          const off = !!hidden[c.id];
          return (
            <div
              key={c.id}
              className={`sidebar-course-row${off ? ' sidebar-course-row--hidden' : ''}`}
            >
              <button
                type="button"
                className="sidebar-course-visibility"
                aria-label={off ? `Show ${c.code} on calendar` : `Hide ${c.code} on calendar`}
                title={off ? 'Show on calendar' : 'Hide on calendar'}
                onClick={() => onToggle(c.id)}
              >
                <span
                  className="sidebar-course-dot"
                  style={{
                    borderRadius: c.club ? '50%' : 4,
                    ...(off
                      ? { background: 'transparent', border: '1.5px solid rgba(24,28,34,.26)' }
                      : { background: c.hex, boxShadow: `0 0 10px rgba(${c.rgb},.65)` }),
                  }}
                />
              </button>
              <button
                type="button"
                className="sidebar-course-main"
                onClick={() => onManage(c, true)}
                title={`Edit ${c.code}`}
              >
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>{c.code}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(45,49,56,.5)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RightRailProps {
  events: CalendarEvent[];
  hidden: Record<string, boolean>;
  done: Record<string, boolean>;
  rail: 'next' | 'todo';
  added: boolean;
  onSetRail: (r: 'next' | 'todo') => void;
  onToggleDone: (id: string) => void;
  onOpen: (e: CalendarEvent) => void;
  onAddStudy: () => void;
}

const RAIL_WIDTH_KEY = 'syllibee-rail-width';
const RAIL_EXPANDED_KEY = 'syllibee-todo-expanded';
const RAIL_MIN = 240;
const RAIL_MAX = 520;
const RAIL_DEFAULT = 280;
const RAIL_EXPANDED = 400;

function loadRailWidth(): number {
  try {
    const v = Number(localStorage.getItem(RAIL_WIDTH_KEY));
    if (Number.isFinite(v)) return Math.min(RAIL_MAX, Math.max(RAIL_MIN, v));
  } catch { /* ignore */ }
  return RAIL_DEFAULT;
}

function loadTodoExpanded(): boolean {
  try {
    return localStorage.getItem(RAIL_EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function RightRail({ events, hidden, done, rail, added, onSetRail, onToggleDone, onOpen, onAddStudy }: RightRailProps) {
  const cmap = useCourseMap();
  const { days, weekStart } = useCalendarDates();
  const railRef = useRef<HTMLElement>(null);
  const [railWidth, setRailWidth] = useState(loadRailWidth);
  const [todoExpanded, setTodoExpanded] = useState(loadTodoExpanded);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_WIDTH_KEY, String(railWidth));
    } catch { /* ignore */ }
  }, [railWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_EXPANDED_KEY, todoExpanded ? '1' : '0');
    } catch { /* ignore */ }
  }, [todoExpanded]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = railWidth;
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setRailWidth(Math.min(RAIL_MAX, Math.max(RAIL_MIN, startW + delta)));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [railWidth]);

  const toggleTodoExpanded = useCallback(() => {
    setTodoExpanded((prev) => {
      const next = !prev;
      if (next) setRailWidth((w) => Math.max(w, RAIL_EXPANDED));
      return next;
    });
  }, []);

  const showSummaryCards = !(rail === 'todo' && todoExpanded);
  const todayIdx = days.findIndex((d) => d.today);
  const todayDay = todayIdx >= 0 ? days[todayIdx] : days[0];
  const insightCtx = { events, courseMap: cmap, weekStart, days, hidden, done };
  const stats = todayStats(events, weekStart, days, hidden, done);
  const beezyRec = beezyRailRecommendation(insightCtx);
  const weekTotal = weekGradedTotal(events, weekStart, hidden, done);
  const level = workloadLevel(weekTotal);
  const levelStyle = workloadLevelStyle(level);
  const dayLoads = weekDayLoads(events, weekStart, days, hidden, done);
  const maxDayLoad = Math.max(1, ...dayLoads.map((d) => d.count));
  const weekCounts = weekCategoryCounts(events, weekStart, hidden);
  const hasOpenWork = weekTotal > 0;
  const TODOKINDS: Record<string, number> = { assignment: 1, reading: 1, quiz: 1, presentation: 1, exam: 1 };
  const realToday = startOfDay(new Date());
  const viewingCurrentWeek = todayIdx >= 0;
  const weekLabel = viewingCurrentWeek
    ? 'Today'
    : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const dayGroupLabel = (dayIdx: number) => {
    if (dayIdx === todayIdx) return 'Today';
    if (todayIdx >= 0 && dayIdx === todayIdx + 1) return 'Tomorrow';
    if (dayIdx >= 0 && dayIdx < 7) return days[dayIdx].full.split(',')[0];
    return 'Later';
  };

  const todoSort = (a: CalendarEvent, b: CalendarEvent) => {
    const aDone = done[a.id] || a.done ? 1 : 0;
    const bDone = done[b.id] || b.done ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aExam = a.k === 'exam' ? 0 : 1;
    const bExam = b.k === 'exam' ? 0 : 1;
    if (aExam !== bExam) return aExam - bExam;
    return (a.s ?? dueToHours(a.due)) - (b.s ?? dueToHours(b.due));
  };

  const todoList = events
    .filter((e) => TODOKINDS[e.k] && !hidden[e.c] && isEventInWeek(e, weekStart))
    .sort((a, b) => (eventDayIndex(a, weekStart) ?? 99) - (eventDayIndex(b, weekStart) ?? 99) || todoSort(a, b));

  const openTodos = todoList.filter((e) => !done[e.id] && !e.done);
  const todayPrepGroups = todayIdx >= 0
    ? classPrepGroupsForDay(todayIdx, events, cmap, weekStart, hidden, done)
    : [];
  const todayPrepIds = todayIdx >= 0
    ? prepItemIdsForDay(todayIdx, events, cmap, weekStart, hidden, done)
    : new Set<string>();

  const todoOverdue: CalendarEvent[] = [];
  const todoByDay = new Map<number, CalendarEvent[]>();

  for (const e of todoList) {
    const idx = eventDayIndex(e, weekStart);
    const isDone = !!done[e.id] || !!e.done;
    if (isDone) continue;

    const eventDate = eventDateInWeek(e, weekStart);
    const isPastDue = eventDate != null && eventDate < realToday;

    if (isPastDue) {
      todoOverdue.push(e);
      continue;
    }
    if (idx === todayIdx && todayPrepIds.has(e.id)) {
      continue;
    }
    const key = idx ?? 99;
    const bucket = todoByDay.get(key) ?? [];
    bucket.push(e);
    todoByDay.set(key, bucket);
  }

  todoOverdue.sort(todoSort);

  const todoGroups: { key: string; label: string; items: CalendarEvent[]; openCount: number; prep?: boolean }[] = [];
  if (todoOverdue.length) {
    todoGroups.push({
      key: 'overdue',
      label: 'Overdue',
      items: todoOverdue,
      openCount: todoOverdue.filter((e) => !done[e.id] && !e.done).length,
    });
  }

  for (const group of todayPrepGroups) {
    todoGroups.push({
      key: `prep-${group.classEvent.id}`,
      label: `Before ${group.courseCode} · ${group.classTimeLabel}`,
      items: group.items,
      openCount: group.openCount,
      prep: true,
    });
  }

  [...todoByDay.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([dayIdx, items]) => {
      items.sort(todoSort);
      const openCount = items.filter((e) => !done[e.id] && !e.done).length;
      todoGroups.push({
        key: `day-${dayIdx}`,
        label: dayGroupLabel(dayIdx),
        items,
        openCount,
      });
    });

  const doneTodos = todoList
    .filter((e) => done[e.id] || e.done)
    .sort((a, b) => (eventDayIndex(a, weekStart) ?? 99) - (eventDayIndex(b, weekStart) ?? 99) || todoSort(a, b));

  const upNext = [];
  const upNextStart = todayIdx >= 0 ? todayIdx : 0;
  for (let i = upNextStart; i < 7; i++) {
    const items = events
      .filter((e) => eventDayIndex(e, weekStart) === i)
      .sort((a, b) => (a.s ?? 23.98) - (b.s ?? 23.98))
      .slice(0, 4);
    if (!items.length) continue;
    upNext.push({
      label: i === todayIdx ? 'Today' : todayIdx >= 0 && i === todayIdx + 1 ? 'Tomorrow' : days[i].full.split(',')[0],
      items,
    });
  }

  return (
    <aside
      ref={railRef}
      className={`app-rail${resizing ? ' app-rail--resizing' : ''}${todoExpanded && rail === 'todo' ? ' app-rail--todo-expanded' : ''}`}
      style={{ width: railWidth }}
    >
      <div
        className="app-rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onMouseDown={startResize}
      />
      {showSummaryCards && (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>{weekLabel}</div>
          <div style={{ fontSize: 12, color: 'rgba(45,49,56,.55)' }}>
            {viewingCurrentWeek
              ? todayDay.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : 'Viewing this week'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { n: stats.classes, label: stats.classes === 1 ? 'class' : 'classes' },
            { n: stats.assignments, label: stats.assignments === 1 ? 'assignment' : 'assignments' },
            { n: stats.deadlines, label: stats.deadlines === 1 ? 'deadline' : 'deadlines' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, padding: '10px 11px', borderRadius: 13, background: 'rgba(22,26,34,.045)', border: '1px solid rgba(26,30,36,.05)' }}>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.5px' }}>{s.n}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(45,49,56,.58)', marginTop: 2, lineHeight: 1.25 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 13, padding: '13px 14px', borderRadius: 15, background: 'linear-gradient(150deg, rgba(110,91,216,.22), rgba(26,30,36,.03))', border: '1px solid rgba(110,91,216,.30)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.2px', color: '#4B3CC4' }}>✨ Beezy&apos;s recommendation</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 7, color: 'rgba(35,38,43,.92)' }}>
            {beezyRec}
          </div>
          {hasOpenWork && (
          <button type="button" className="btn-glass-strong" onClick={onAddStudy} style={{ marginTop: 11, width: '100%', padding: 9, borderRadius: 11, border: '1px solid rgba(26,30,36,.13)', background: 'rgba(26,30,36,.08)', color: '#23262B', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {added ? '✓ Study time added' : 'Add study time'}
          </button>
          )}
        </div>
      </div>
      )}

      {showSummaryCards && (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Weekly workload</div>
          <span style={{ marginLeft: 'auto', padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, letterSpacing: '.3px', background: levelStyle.bg, border: `1px solid ${levelStyle.border}`, color: levelStyle.color }}>
            {level}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 11 }}>
          {dayLoads.map((day, i) => (
            <div
              key={day.label}
              title={`${day.label}: ${day.count} due`}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 3,
                background:
                  day.count === 0
                    ? 'rgba(26,30,36,.07)'
                    : day.count >= maxDayLoad * 0.75
                      ? 'linear-gradient(90deg, rgba(110,91,216,.9), #D95542)'
                      : 'linear-gradient(90deg, rgba(110,91,216,.55), rgba(110,91,216,.85))',
                opacity: i === todayIdx ? 1 : 0.85,
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(45,49,56,.45)', marginTop: 6, letterSpacing: '.4px' }}>
          {dayLoads.map((day) => (
            <span key={day.label}>{day.label.slice(0, 1)}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 12, fontSize: 12, color: 'rgba(35,38,43,.82)' }}>
          <div>{weekCounts.assignments} assignment{weekCounts.assignments === 1 ? '' : 's'}</div>
          <div>{weekCounts.exams} exam{weekCounts.exams === 1 ? '' : 's'}</div>
          <div>{weekCounts.classes} class{weekCounts.classes === 1 ? '' : 'es'}</div>
          <div>{weekCounts.clubs} club event{weekCounts.clubs === 1 ? '' : 's'}</div>
        </div>
      </div>
      )}

      <div style={{ ...card, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '12px 13px 9px' }}>
          {(['next', 'todo'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSetRail(id)}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: 'none',
                fontFamily: 'inherit',
                fontSize: 12.5,
                cursor: 'pointer',
                ...(rail === id
                  ? { background: 'rgba(28,32,38,.95)', color: '#FFFFFF', fontWeight: 600 }
                  : { background: 'transparent', color: 'rgba(35,38,43,.6)', fontWeight: 550 }),
              }}
            >
              {id === 'next' ? 'Up Next' : 'To-do'}
            </button>
          ))}
          {rail === 'todo' && (
            <button
              type="button"
              className="btn-glass"
              onClick={toggleTodoExpanded}
              title={todoExpanded ? 'Show summary cards' : 'Expand to-do list'}
              aria-label={todoExpanded ? 'Show summary cards' : 'Expand to-do list'}
              style={{
                marginLeft: 4,
                padding: '5px 9px',
                borderRadius: 8,
                border: '1px solid rgba(26,30,36,.08)',
                background: todoExpanded ? 'rgba(28,32,38,.95)' : 'rgba(26,30,36,.04)',
                color: todoExpanded ? '#FFFFFF' : 'rgba(35,38,43,.7)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {todoExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'rgba(45,49,56,.5)', letterSpacing: '.3px' }}>{openTodos.length} open</span>
        </div>

        {rail === 'todo' ? (
          <div className="rail-todo-list" style={{ flex: 1, overflowY: 'auto', padding: '0 11px 14px' }}>
            {todoGroups.map((group) => (
              <section key={group.key} className="rail-todo-section">
                <div className={`rail-todo-section-head${group.key === 'overdue' ? ' rail-todo-section-head--overdue' : ''}${group.prep ? ' rail-todo-section-head--prep' : ''}`}>
                  <span>{group.label}</span>
                  {group.openCount > 0 && (
                    <span className="rail-todo-section-count">{group.openCount} open</span>
                  )}
                </div>
                <div className="rail-todo-section-items">
                  {group.items.map((e) => (
                    <TodoRow
                      key={e.id}
                      event={e}
                      course={getCourse(cmap, e.c)}
                      isDone={!!done[e.id] || !!e.done}
                      expanded={todoExpanded}
                      onToggleDone={() => onToggleDone(e.id)}
                      onOpen={() => onOpen(e)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {doneTodos.length > 0 && (
              <section className="rail-todo-section rail-todo-section--done">
                <div className="rail-todo-section-head">
                  <span>Completed</span>
                  <span className="rail-todo-section-count">{doneTodos.length}</span>
                </div>
                <div className="rail-todo-section-items">
                  {doneTodos.map((e) => (
                    <TodoRow
                      key={e.id}
                      event={e}
                      course={getCourse(cmap, e.c)}
                      isDone
                      expanded={todoExpanded}
                      onToggleDone={() => onToggleDone(e.id)}
                      onOpen={() => onOpen(e)}
                    />
                  ))}
                </div>
              </section>
            )}
            {todoList.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(45,49,56,.5)', padding: '10px 4px' }}>
                {viewingCurrentWeek ? 'Nothing due this week — nice work.' : 'Nothing due in this week.'}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px' }}>
            {upNext.map((g) => (
              <div key={g.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.9px', textTransform: 'uppercase', color: 'rgba(45,49,56,.5)', padding: '0 6px 7px' }}>
                  {g.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {g.items.map((e) => {
                    const c = getCourse(cmap, e.c);
                    const itemDone = isEventComplete(e, done);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onOpen(e)}
                        className={`up-next-item${itemDone ? ' event-complete' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          width: '100%',
                          padding: '8px 9px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: 'inherit',
                          background: e.k === 'exam' ? 'rgba(217,85,66,.16)' : 'rgba(26,30,36,.03)',
                          border: e.k === 'exam' ? '1px solid rgba(217,85,66,.42)' : '1px solid rgba(26,30,36,.05)',
                        }}
                      >
                        <span style={{ width: 52, flexShrink: 0, fontSize: 11, color: 'rgba(45,49,56,.6)', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
                          {shortTime(e.due, e.s)}
                        </span>
                        <span style={{ width: 8, height: 8, borderRadius: 3, flexShrink: 0, background: e.k === 'exam' ? '#D95542' : c.hex, boxShadow: `0 0 9px rgba(${c.rgb},.6)` }} />
                        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <span className="up-next-title event-complete-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(e.k === 'study' ? '✨ ' : e.k === 'exam' ? '🔴 ' : '') + e.t}
                          </span>
                          <span className="up-next-meta event-complete-label" style={{ display: 'block', fontSize: 10.5, color: 'rgba(45,49,56,.5)', marginTop: 1 }}>
                            {upNextMeta(e, c.code)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'rgba(45,49,56,.55)',
  marginBottom: 9,
};

const addCourseBtn: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 14,
  border: 'none',
  background: '#22252A',
  color: '#FFFFFF',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 10px 26px rgba(22,26,34,.08)',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,.80)',
  border: '1px solid rgba(26,30,36,.07)',
  borderRadius: 20,
  backdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 20px 46px rgba(22,26,34,.10), inset 0 1px 0 rgba(26,30,36,.07)',
  padding: '15px 17px',
};

function TodoRow({
  event: e,
  course: c,
  isDone,
  expanded,
  onToggleDone,
  onOpen,
}: {
  event: CalendarEvent;
  course: Course;
  isDone: boolean;
  expanded: boolean;
  onToggleDone: () => void;
  onOpen: () => void;
}) {
  const timeLabel = e.due ? e.due : e.s != null ? shortTime(undefined, e.s) : '';
  const kindIcon = ICON[e.k] ?? '•';

  return (
    <div
      className={`rail-todo-item${isDone ? ' rail-todo-item--done' : ''}${e.k === 'exam' ? ' rail-todo-item--exam' : ''}`}
      style={{ borderLeftColor: isDone ? 'rgba(26,30,36,.1)' : c.hex }}
    >
      <button type="button" className="rail-todo-check" onClick={onToggleDone} aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}>
        {isDone ? '✓' : ''}
      </button>
      <button type="button" className="rail-todo-body" onClick={onOpen}>
        <span className="rail-todo-title" style={{ fontSize: expanded ? 13.5 : 12.5, whiteSpace: expanded ? 'normal' : 'nowrap' }}>
          {kindIcon} {e.t}
        </span>
        <span className="rail-todo-meta">
          {c.code} · {KIND_LABEL[e.k]}
        </span>
      </button>
      {timeLabel && (
        <span className={`rail-todo-time${e.k === 'exam' ? ' rail-todo-time--exam' : ''}`}>{timeLabel}</span>
      )}
    </div>
  );
}
