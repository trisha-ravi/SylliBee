import { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import { ICON, KIND_LABEL } from '../data/constants';
import { useCourseMap } from '../context/CourseContext';
import { useCalendarDates } from '../context/CalendarDateContext';
import { getCourse } from '../utils/courses';
import { buildMonthGrid, eventDayIndex, eventOnDate, eventInMonth } from '../utils/dates';
import { eventMetaLine, monthEventLabel, monthEventSort } from '../utils/eventLabels';
import { fmt, range, eventStartHour } from '../utils/time';
import { eventScheduleRange } from '../utils/eventSchedule';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const panelStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  background: 'rgba(255,255,255,.80)',
  border: '1px solid rgba(26,30,36,.08)',
  borderRadius: 22,
  boxShadow: '0 28px 70px rgba(22,26,34,.10), inset 0 1px 0 rgba(26,30,36,.08)',
  backdropFilter: 'blur(30px) saturate(150%)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

function agendaTimeLabel(e: CalendarEvent): string {
  const sched = eventScheduleRange(e);
  if (sched && e.k !== 'reading' && e.k !== 'assignment' && e.e != null && e.s != null) {
    return range(sched.s, sched.e);
  }
  if (sched) return fmt(sched.s);
  if (e.due) return `Due ${e.due}`;
  return 'All day';
}

function agendaSubtitle(e: CalendarEvent, code: string): string {
  return eventMetaLine(e, code);
}

interface MonthViewProps {
  events: CalendarEvent[];
  hidden: Record<string, boolean>;
  onOpen: (e: CalendarEvent) => void;
  monthStart: Date;
}

export function MonthView({ events, hidden, onOpen, monthStart }: MonthViewProps) {
  const cmap = useCourseMap();
  const cells = buildMonthGrid(monthStart);
  const monthEvents = useMemo(
    () => events.filter((e) => !hidden[e.c] && eventInMonth(e, monthStart)),
    [events, hidden, monthStart],
  );

  return (
    <div className="month-view" style={panelStyle}>
      <div className="month-view-head">
        {DOW.map((l) => (
          <div key={l} className="month-view-dow">{l}</div>
        ))}
      </div>
      <div className="calendar-scroll month-view-scroll">
        <div className="month-view-grid">
        {cells.map((cell, i) => {
          const dayEvents = monthEvents
            .filter((e) => eventOnDate(e, cell.date))
            .sort(monthEventSort);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
          <div
            key={i}
            className={`month-view-cell${cell.today ? ' month-view-cell--today' : ''}${!cell.inMonth ? ' month-view-cell--muted' : ''}`}
          >
            <div className={`month-view-date${cell.today ? ' month-view-date--today' : ''}`}>
              {cell.date.getDate()}
            </div>
            <div className="month-view-events">
              {visible.map((e) => {
                const c = getCourse(cmap, e.c);
                const exam = e.k === 'exam';
                const study = e.k === 'study';
                return (
                <button
                  key={e.id}
                  type="button"
                  className={`month-view-event${exam ? ' month-view-event--exam' : ''}${study ? ' month-view-event--study' : ''}`}
                  onClick={() => onOpen(e)}
                  style={{
                    ['--course-rgb' as string]: c.rgb,
                    ['--course-hex' as string]: c.hex,
                  }}
                  title={e.t}
                >
                  <span className="month-view-event-icon">{ICON[e.k]}</span>
                  <span className="month-view-event-label">{monthEventLabel(e, c.code)}</span>
                </button>
                );
              })}
            </div>
            {overflow > 0 && (
              <div className="month-view-more">+{overflow} more</div>
            )}
          </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

interface AgendaViewProps {
  events: CalendarEvent[];
  onOpen: (e: CalendarEvent) => void;
}

export function AgendaView({ events, onOpen }: AgendaViewProps) {
  const cmap = useCourseMap();
  const { days, weekStart } = useCalendarDates();
  const todayIdx = days.findIndex((d) => d.today);

  const dayLabel = (i: number) => {
    if (i === todayIdx) return 'Today';
    if (todayIdx >= 0 && i === todayIdx + 1) return 'Tomorrow';
    return days[i].dow;
  };

  const groups = Array.from({ length: 7 }, (_, i) => {
    const items = events
      .filter((e) => eventDayIndex(e, weekStart) === i)
      .sort((a, b) => eventStartHour(a) - eventStartHour(b));
    return { i, day: days[i], label: dayLabel(i), items };
  });

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  const weekRange =
    days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' +
    days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={panelStyle}>
      <div className="agenda-week-head">
        <div>
          <div className="agenda-week-title">This week</div>
          <div className="agenda-week-range">{weekRange}</div>
        </div>
        <div className="agenda-week-count">
          {totalItems} {totalItems === 1 ? 'event' : 'events'}
        </div>
      </div>

      <div className="agenda-scroll">
        <div className="agenda-list">
          {totalItems === 0 && (
            <div className="agenda-empty">
              <div className="agenda-empty-icon">📅</div>
              <div className="agenda-empty-title">
                {todayIdx >= 0 ? 'Clear week ahead' : 'Nothing this week'}
              </div>
              <div className="agenda-empty-sub">
                {todayIdx >= 0
                  ? 'No events match your filters. Try All or import a course.'
                  : 'Navigate to another week or adjust your filters.'}
              </div>
            </div>
          )}

          {groups.map((g) => {
            const isToday = g.i === todayIdx;
            const isTomorrow = todayIdx >= 0 && g.i === todayIdx + 1;

            return (
              <section
                key={g.i}
                className={`agenda-day${isToday ? ' agenda-day--today' : ''}${g.items.length === 0 ? ' agenda-day--empty' : ''}`}
              >
                <div className="agenda-day-date-col">
                  <div className={`agenda-date-badge${isToday ? ' agenda-date-badge--today' : ''}`}>
                    <span className="agenda-date-num">{g.day.num}</span>
                    <span className="agenda-date-dow">{g.day.dow}</span>
                  </div>
                  {(isToday || isTomorrow) && (
                    <span className={`agenda-day-chip${isToday ? ' agenda-day-chip--today' : ''}`}>
                      {g.label}
                    </span>
                  )}
                </div>

                <div className="agenda-day-events">
                  {g.items.length === 0 ? (
                    <div className="agenda-day-free">Nothing scheduled</div>
                  ) : (
                    g.items.map((e) => {
                      const c = getCourse(cmap, e.c);
                      const exam = e.k === 'exam';
                      const study = e.k === 'study';

                      return (
                        <button
                          key={e.id}
                          type="button"
                          className={`agenda-event${exam ? ' agenda-event--exam' : ''}${study ? ' agenda-event--study' : ''}`}
                          onClick={() => onOpen(e)}
                          style={{
                            ['--course-rgb' as string]: c.rgb,
                            ['--course-hex' as string]: c.hex,
                          }}
                        >
                          <div className="agenda-event-time">{agendaTimeLabel(e)}</div>
                          <div className="agenda-event-body">
                            <div className="agenda-event-top">
                              <span className="agenda-event-icon">{ICON[e.k] ?? '•'}</span>
                              <span className="agenda-event-title">
                                {study ? '✨ ' : ''}{e.t}
                              </span>
                              <span className={`agenda-event-kind${exam ? ' agenda-event-kind--exam' : ''}`}>
                                {KIND_LABEL[e.k]}
                              </span>
                            </div>
                            <div className="agenda-event-meta">{agendaSubtitle(e, c.code)}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
