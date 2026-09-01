import type { ViewMode } from './types';
import { useCalendar } from './hooks/useCalendar';
import { CourseContext } from './context/CourseContext';
import { CalendarDateContext } from './context/CalendarDateContext';
import { Sidebar, RightRail } from './components/Layout';
import { WeekView } from './components/WeekView';
import { MonthView, AgendaView } from './components/CalendarViews';
import { SemesterView } from './components/SemesterView';
import { DetailModal, CourseModal, CourseManageModal, BeezyPanel } from './components/Modals';
import { AddEventModal } from './components/AddEventModal';
import { SylliBeeLockup } from './components/SylliBeeLogo';
import type { ManualAddKind } from './types';

const VIEWS: ViewMode[] = ['Week', 'Month', 'Agenda', 'Semester'];

const ADD_OPTIONS: { label: string; kind: ManualAddKind; icon: string }[] = [
  { label: 'Assignment', kind: 'assignment', icon: '📝' },
  { label: 'Reading', kind: 'reading', icon: '📖' },
  { label: 'Class meeting', kind: 'class', icon: '📚' },
  { label: 'Exam', kind: 'exam', icon: '🔴' },
  { label: 'Study session', kind: 'study', icon: '✨' },
  { label: 'Club event', kind: 'club', icon: '🎟️' },
];

interface AppProps {
  userId: string | null;
  userEmail?: string;
  onSignOut?: () => void;
}

export default function App({ userId, userEmail, onSignOut }: AppProps) {
  const cal = useCalendar(userId);

  const monthLabel = cal.periodLabel;

  if (cal.loading) {
    return (
      <div
        className="app-root"
        style={{
          fontFamily: "'Instrument Sans', ui-sans-serif, -apple-system, system-ui, sans-serif",
          color: '#23262B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(120% 95% at 50% 0%, #FFFFFF 0%, #F8F8F9 38%, #F1F1F3 72%, #EAEAEE 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>Loading your calendar…</div>
          <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.55)', marginTop: 8 }}>Syncing with Supabase</div>
        </div>
      </div>
    );
  }

  const calendarDates = {
    anchorDate: cal.anchorDate,
    weekStart: cal.weekStart,
    monthStart: cal.monthStart,
    days: cal.days,
    view: cal.view,
    periodLabel: cal.periodLabel,
    goPrev: cal.goPrev,
    goNext: cal.goNext,
    goToday: cal.goToday,
    canNavigate: cal.canNavigate,
  };

  return (
    <CourseContext.Provider value={cal.courseMap}>
    <CalendarDateContext.Provider value={calendarDates}>
    <div
      className="app-root"
      style={{
        fontFamily: "'Instrument Sans', ui-sans-serif, -apple-system, system-ui, sans-serif",
        color: '#23262B',
        background: 'radial-gradient(120% 95% at 50% 0%, #FFFFFF 0%, #F8F8F9 38%, #F1F1F3 72%, #EAEAEE 100%)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(46% 36% at 14% 90%, rgba(120,126,140,.10), transparent 72%), radial-gradient(38% 30% at 88% 84%, rgba(120,126,140,.08), transparent 74%), radial-gradient(60% 46% at 50% 0%, rgba(255,255,255,.9), transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, backgroundImage: 'radial-gradient(rgba(20,24,30,.055) .5px, transparent .5px)', backgroundSize: '3px 3px' }} />

      <div className="app-shell">
        <header className="app-header">
          {cal.syncError && (
            <div style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#A63626', padding: '4px 0 2px' }}>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{cal.syncError}</span>
              {userId && !cal.remote && (
                <button
                  type="button"
                  className="btn-glass"
                  onClick={cal.retrySync}
                  style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(184,74,58,.28)', background: 'rgba(217,85,66,.08)', color: '#A63626', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Retry sync
                </button>
              )}
            </div>
          )}
          <SylliBeeLockup
            subtitle={
              userEmail ? (
                <div style={{ fontSize: 10.5, color: 'rgba(45,49,56,.5)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                  {userEmail}
                </div>
              ) : undefined
            }
            style={{ flexShrink: 0 }}
            titleSize={15}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.5px', textShadow: '0 1px 12px rgba(22,26,34,.10)', whiteSpace: 'nowrap' }}>{monthLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button type="button" className="btn-glass" onClick={cal.goPrev} disabled={!cal.canNavigate} style={{ ...navBtn, opacity: cal.canNavigate ? 1 : 0.35 }}>‹</button>
              <button type="button" className="btn-glass" onClick={cal.goToday} style={{ ...navBtn, width: 'auto', padding: '0 13px', fontSize: 12.5, fontWeight: 500 }}>Today</button>
              <button type="button" className="btn-glass" onClick={cal.goNext} disabled={!cal.canNavigate} style={{ ...navBtn, opacity: cal.canNavigate ? 1 : 0.35 }}>›</button>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', padding: 3, background: 'rgba(22,26,34,.05)', border: '1px solid rgba(26,30,36,.06)', borderRadius: 12, gap: 2, backdropFilter: 'blur(14px)', flexShrink: 0 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => cal.setView(v)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: cal.view === v ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  ...(cal.view === v
                    ? { background: 'rgba(28,32,38,.95)', color: '#FFFFFF', boxShadow: '0 3px 10px rgba(22,26,34,.10)' }
                    : { background: 'transparent', color: 'rgba(35,38,43,.72)' }),
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            {onSignOut && (
              <button
                type="button"
                className="btn-glass"
                onClick={() => onSignOut()}
                style={{ height: 34, padding: '0 12px', borderRadius: 11, fontSize: 12.5, fontWeight: 550, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Sign out
              </button>
            )}
            <button type="button" className="btn-glass-strong" onClick={() => cal.setAddMenu(!cal.addMenu)} style={addBtn}>+ Add</button>
            {cal.addMenu && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 220, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(30px) saturate(160%)', border: '1px solid rgba(26,30,36,.08)', borderRadius: 16, boxShadow: '0 24px 60px rgba(22,26,34,.10)', padding: 6, zIndex: 60, animation: 'dgIn .16s ease' }}>
                {ADD_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    className="btn-row"
                    onClick={() => cal.openAddEvent(option.kind)}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'transparent', borderRadius: 10, fontSize: 13, color: '#3A3E45', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <span>{option.icon}</span>{option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="app-body">
          <Sidebar
            kind={cal.kind}
            hidden={cal.hidden}
            courses={cal.courses}
            onSetKind={(k) => cal.setKind(k as typeof cal.kind)}
            onToggleHidden={cal.toggleHidden}
            onManageCourse={cal.openCourseManage}
            onAddCourse={() => cal.setCourseModal()}
          />

          <main className="app-main">
            {cal.view === 'Week' && (
              <WeekView
                events={cal.events}
                visibleEvents={cal.visibleEvents}
                kind={cal.kind}
                hidden={cal.hidden}
                done={cal.done}
                onOpen={cal.openEvent}
              />
            )}
            {cal.view === 'Month' && <MonthView events={cal.visibleEvents} hidden={cal.hidden} done={cal.done} onOpen={cal.openEvent} monthStart={cal.monthStart} />}
            {cal.view === 'Agenda' && <AgendaView events={cal.visibleEvents} done={cal.done} onOpen={cal.openEvent} />}
            {cal.view === 'Semester' && (
              <SemesterView
                events={cal.events}
                courses={cal.courses}
                hidden={cal.hidden}
                deletedCourses={cal.deletedCourseIds}
                done={cal.done}
                weekStart={cal.weekStart}
                onOpen={cal.openEvent}
              />
            )}
          </main>

          <RightRail
            events={cal.visibleEvents}
            hidden={cal.hidden}
            done={cal.done}
            rail={cal.rail}
            added={cal.added}
            onSetRail={cal.setRail}
            onToggleDone={cal.toggleDone}
            onOpen={cal.openEvent}
            onAddStudy={cal.addStudy}
          />
        </div>

        <div className="beezy-dock">
          {cal.duey ? (
            <BeezyPanel chat={cal.chat} onClose={cal.closeBeezy} onAsk={cal.ask} onAddStudy={cal.addStudy} />
          ) : (
            <button type="button" className="btn-fab app-fab" onClick={cal.setDuey}>
              ✨ Ask Beezy
            </button>
          )}
        </div>
      </div>

      {cal.detail && (
        <DetailModal
          detail={cal.detail}
          isComplete={
            !!cal.done[cal.detail.eventId] ||
            !!cal.events.find((e) => e.id === cal.detail!.eventId)?.done
          }
          onClose={() => cal.setDetail(null)}
          onAddStudy={cal.addStudy}
          onToggleComplete={cal.toggleDetailComplete}
          onDelete={() => cal.deleteEvent(cal.detail!.eventId)}
          onDeleteCourse={() => cal.deleteCourse(cal.detail!.courseId)}
          onSave={(patch) => cal.updateEvent(cal.detail!.eventId, patch)}
        />
      )}

      {cal.courseManage && (
        <CourseManageModal
          course={cal.courseManage}
          onClose={cal.closeCourseManage}
          onToggleHidden={() => {
            cal.toggleHidden(cal.courseManage!.id);
            cal.closeCourseManage();
          }}
          onDeleteCourse={() => cal.deleteCourse(cal.courseManage!.id)}
          onUpdateCourse={(patch) => cal.updateCourse(cal.courseManage!.id, patch)}
          onUpdateColor={(hex) => cal.updateCourseColor(cal.courseManage!.id, hex)}
          onUpdateSchedule={(meetings) => cal.updateCourseSchedule(cal.courseManage!.id, meetings)}
        />
      )}

      {cal.addEventKind && (
        <AddEventModal
          kind={cal.addEventKind}
          courses={cal.courses}
          onClose={cal.closeAddEvent}
          onCreate={cal.createEvent}
          onAddCourse={() => {
            cal.closeAddEvent();
            cal.setCourseModal();
            cal.setCourseStage('manual');
          }}
        />
      )}

      {cal.courseModal && (
        <CourseModal
          stage={cal.courseStage}
          pasteText={cal.pasteText}
          preview={cal.importPreview}
          onClose={cal.closeCourseModal}
          onNavigate={cal.setCourseStage}
          onPasteChange={cal.setPasteText}
          onBuild={cal.buildPreview}
          onCommit={cal.commitImport}
          onCreateManual={cal.createCourse}
          onShowToast={cal.showToast}
        />
      )}

      {cal.toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)', padding: '12px 20px', borderRadius: 26, background: 'rgba(34,37,42,.88)', backdropFilter: 'blur(28px) saturate(170%)', border: '1px solid rgba(26,30,36,.1)', boxShadow: '0 22px 54px rgba(22,26,34,.10)', color: '#FFFFFF', fontSize: 13, fontWeight: 550, zIndex: 120, animation: 'dgIn .2s ease' }}>
          {cal.toast}
        </div>
      )}
    </div>
    </CalendarDateContext.Provider>
    </CourseContext.Provider>
  );
}

const navBtn: React.CSSProperties = {
  width: 31,
  height: 31,
  borderRadius: 10,
  border: '1px solid rgba(26,30,36,.09)',
  background: 'rgba(26,30,36,.05)',
  color: '#3A3E45',
  fontSize: 15,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
};

const addBtn: React.CSSProperties = {
  height: 34,
  padding: '0 15px',
  borderRadius: 11,
  border: 'none',
  background: '#22252A',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 6px 18px rgba(22,26,34,.10)',
};
