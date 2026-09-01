import { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import type { KindFilter } from '../types';
import { HH, H0, HN } from '../data/constants';
import { useCourseMap } from '../context/CourseContext';
import { useCalendarDates } from '../context/CalendarDateContext';
import { blockStyle, dueChipStyle, completeClass } from '../utils/eventStyles';
import { groupDueEventsBySlot, gridEndHour } from '../utils/eventLayout';
import { eventDayIndex } from '../utils/dates';
import { showOnWeekGrid, withScheduleRange } from '../utils/eventSchedule';
import { fmt, range } from '../utils/time';

const MAX_DUE_CHIPS = 2;

interface WeekViewProps {
  events: CalendarEvent[];
  visibleEvents: CalendarEvent[];
  kind: KindFilter;
  hidden: Record<string, boolean>;
  done: Record<string, boolean>;
  onOpen: (e: CalendarEvent) => void;
}

export function WeekView({ events, visibleEvents, kind, hidden, done, onOpen }: WeekViewProps) {
  const cmap = useCourseMap();
  const { days, weekStart } = useCalendarDates();
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  const gridEnd = useMemo(() => gridEndHour(events, H0, HN), [events]);
  const gridSpan = gridEnd - H0;
  const grid = { h0: H0, hh: HH };

  const hours = useMemo(() => {
    const rows: { label: string; top: number; lineTop: number }[] = [];
    for (let i = 0; i < gridSpan; i++) {
      rows.push({
        label: fmt(H0 + i).replace(':00', ''),
        top: i * HH - 7,
        lineTop: i * HH,
      });
    }
    return rows;
  }, [gridSpan]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        background: 'rgba(255,255,255,.80)',
        border: '1px solid rgba(26,30,36,.08)',
        borderRadius: 22,
        boxShadow: '0 28px 70px rgba(22,26,34,.10), inset 0 1px 0 rgba(26,30,36,.08)',
        backdropFilter: 'blur(30px) saturate(150%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(26,30,36,.06)', background: 'rgba(26,30,36,.03)' }}>
        <div style={{ width: 48, flexShrink: 0 }} />
        {days.map((d, i) => {
          const dueCount = visibleEvents.filter((e) => eventDayIndex(e, weekStart) === i && e.due && e.s == null).length;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 6px',
                borderLeft: '1px solid rgba(26,30,36,.04)',
                background: d.today ? 'rgba(26,30,36,.04)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.9px', textTransform: 'uppercase', color: 'rgba(45,49,56,.55)' }}>
                  {d.dow}
                </span>
                <span
                  style={
                    d.today
                      ? { fontSize: 14, fontWeight: 600, color: '#FFFFFF', background: '#22252A', borderRadius: 8, padding: '1px 7px', boxShadow: '0 3px 10px rgba(22,26,34,.10)' }
                      : { fontSize: 14, fontWeight: 600, color: 'rgba(35,38,43,.9)' }
                  }
                >
                  {d.num}
                </span>
                {dueCount > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(45,49,56,.5)', fontWeight: 550 }}>
                    {dueCount} due
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="calendar-scroll"
        style={{ flex: 1, minHeight: 0, display: 'flex', padding: '6px 0 12px' }}
      >
        <div style={{ display: 'flex', minWidth: '100%', width: 'max(100%, 720px)', height: gridSpan * HH }}>
        <div style={{ width: 48, flexShrink: 0, position: 'relative', height: gridSpan * HH }}>
          {hours.map((h, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: h.top,
                right: 10,
                fontSize: 10.5,
                color: 'rgba(45,49,56,.42)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {h.label}
            </div>
          ))}
        </div>

        {days.map((d, i) => {
          const timed = events
            .filter((e) => eventDayIndex(e, weekStart) === i && showOnWeekGrid(e, kind, hidden))
            .map(withScheduleRange);
          const dueSlots = groupDueEventsBySlot(visibleEvents, i, H0, HH, weekStart);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                height: gridSpan * HH,
                borderLeft: '1px solid rgba(26,30,36,.04)',
                background: d.today ? 'rgba(26,30,36,.03)' : undefined,
              }}
            >
              {hours.map((h, j) => (
                <div
                  key={j}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: h.lineTop,
                    height: 1,
                    background: 'rgba(26,30,36,.04)',
                  }}
                />
              ))}
              {d.today && nowHour >= H0 && nowHour <= gridEnd && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: (nowHour - H0) * HH,
                    height: 2,
                    background: 'linear-gradient(90deg, #D95542, rgba(217,85,66,.25))',
                    zIndex: 5,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: -3,
                      top: -3.5,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#D95542',
                      boxShadow: '0 0 10px rgba(217,85,66,.9)',
                    }}
                  />
                </div>
              )}

              {timed.map((e) => {
                const height = (e.e! - e.s!) * HH;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`event-block${completeClass(e, done)}`}
                    onClick={() => onOpen(e)}
                    style={blockStyle(e, cmap, grid)}
                  >
                    <span
                      className="event-complete-label"
                      style={{
                        display: 'block',
                        fontWeight: 700,
                        letterSpacing: '-.1px',
                        fontSize: 11.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textTransform: e.k === 'exam' ? 'uppercase' : undefined,
                      }}
                    >
                      {e.k === 'study' ? '✨ ' : ''}{e.t}
                    </span>
                    {height >= 52 && e.k !== 'exam' && (
                      <span className="event-complete-label" style={{ fontSize: 10, opacity: 0.8, marginTop: 1, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.k === 'class' ? e.loc : e.sub}
                      </span>
                    )}
                    {height >= 38 && (
                      <span style={{ fontSize: 9, opacity: 0.6, marginTop: 1, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {range(e.s!, e.e!)}
                      </span>
                    )}
                  </button>
                );
              })}

              {dueSlots.map((slot) => {
                const visible = slot.events.slice(0, MAX_DUE_CHIPS);
                const overflow = slot.events.length - visible.length;
                const dueLabel = slot.events[0].due ?? 'Due';

                return (
                  <div
                    key={slot.key}
                    style={{
                      position: 'absolute',
                      left: 3,
                      right: 3,
                      top: slot.top,
                      zIndex: 4,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 3,
                      alignItems: 'flex-start',
                      maxHeight: 56,
                      overflow: 'hidden',
                      padding: '2px 0',
                    }}
                  >
                    {visible.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onOpen(e)}
                        title={`${e.t} · due ${e.due}`}
                        className={completeClass(e, done).trim() || undefined}
                        style={dueChipStyle(e, cmap)}
                      >
                        <span className="event-complete-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {e.t}
                        </span>
                      </button>
                    ))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpen(slot.events[MAX_DUE_CHIPS])}
                        style={{
                          flex: '0 0 auto',
                          padding: '3px 8px',
                          borderRadius: 7,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: 'rgba(35,38,43,.75)',
                          background: 'rgba(26,30,36,.06)',
                          border: '1px solid rgba(26,30,36,.1)',
                        }}
                      >
                        +{overflow} more
                      </button>
                    )}
                    <span
                      style={{
                        flex: '0 0 100%',
                        fontSize: 9,
                        color: 'rgba(45,49,56,.45)',
                        paddingLeft: 2,
                        marginTop: -1,
                      }}
                    >
                      Due {dueLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
