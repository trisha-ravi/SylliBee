import { useEffect, useRef, useState } from 'react';
import type { DetailState, CourseStage, ChatMessage, ImportPreview, CourseManageState, EventEditPatch, ClassMeetingEdit, CreateCourseInput } from '../types';
import { defaultClassMeeting, WEEKDAY_OPTIONS } from '../utils/classSchedule';
import { COURSE_COLORS } from '../utils/courses';
import { SYLLABI_IMPORT_PROMPT } from '../data/importPrompt';
import { useCalendarDates } from '../context/CalendarDateContext';
import { dueToTimeInput, hoursToTimeInput, timeInputToDue, timeInputToHours } from '../utils/time';
import { BeezyMessage } from './BeezyMessage';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(232,233,237,.66)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'dgFade .16s ease',
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

interface DetailModalProps {
  detail: DetailState;
  isComplete: boolean;
  onClose: () => void;
  onAddStudy: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onDeleteCourse: () => void;
  onSave: (patch: EventEditPatch) => void;
}

function isCompletableKind(kind: DetailState['kind']): boolean {
  return kind === 'assignment' || kind === 'reading' || kind === 'quiz' || kind === 'presentation' || kind === 'exam' || kind === 'study';
}

function usesDueTime(detail: DetailState): boolean {
  return detail.kind === 'assignment'
    || detail.kind === 'reading'
    || (!!detail.due && detail.s == null);
}

function showLocationField(kind: DetailState['kind']): boolean {
  return kind === 'class' || kind === 'club' || kind === 'exam';
}

export function DetailModal({ detail, isComplete, onClose, onAddStudy, onToggleComplete, onDelete, onDeleteCourse, onSave }: DetailModalProps) {
  const { days } = useCalendarDates();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(detail.title);
  const [sub, setSub] = useState(detail.sub);
  const [loc, setLoc] = useState(detail.loc ?? '');
  const [day, setDay] = useState(detail.d);
  const [start, setStart] = useState(detail.s != null ? hoursToTimeInput(detail.s) : '09:00');
  const [end, setEnd] = useState(detail.e != null ? hoursToTimeInput(detail.e) : '10:15');
  const [dueTime, setDueTime] = useState(detail.due ? dueToTimeInput(detail.due) : '23:59');
  const dueMode = usesDueTime(detail);
  const locationField = showLocationField(detail.kind);
  const completable = isCompletableKind(detail.kind);
  const wantsStudyPlan = detail.kind === 'class' || detail.kind === 'exam';

  useEffect(() => {
    setEditing(false);
    setTitle(detail.title);
    setSub(detail.sub);
    setLoc(detail.loc ?? '');
    setDay(detail.d);
    setStart(detail.s != null ? hoursToTimeInput(detail.s) : '09:00');
    setEnd(detail.e != null ? hoursToTimeInput(detail.e) : '10:15');
    setDueTime(detail.due ? dueToTimeInput(detail.due) : '23:59');
  }, [detail]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const patch: EventEditPatch = {
      d: day,
      t: trimmedTitle,
      sub: sub.trim() || detail.sub,
    };
    if (locationField) patch.loc = loc.trim() || undefined;

    if (dueMode) {
      patch.due = timeInputToDue(dueTime);
    } else {
      const s = timeInputToHours(start);
      const e = timeInputToHours(end);
      if (s == null || e == null || e <= s) return;
      patch.s = s;
      patch.e = e;
    }

    onSave(patch);
    setEditing(false);
  };

  return (
    <div onClick={onClose} style={{ ...overlayStyle, zIndex: 90 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 428, maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              marginTop: 7,
              flexShrink: 0,
              background: detail.dotColor,
              boxShadow: `0 0 12px ${detail.dotGlow}`,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19.5, fontWeight: 600, letterSpacing: '-.4px', lineHeight: 1.2 }}>{detail.title}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 4 }}>{detail.course}</div>
          </div>
          <button type="button" className="btn-glass" onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {editing ? (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={fieldLabel}>
              Title
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={fieldInput} />
            </label>
            {(detail.kind === 'class' || detail.kind === 'club') && (
              <label style={fieldLabel}>
                {detail.kind === 'class' ? 'Section / notes' : 'Description'}
                <input type="text" value={sub} onChange={(e) => setSub(e.target.value)} style={fieldInput} />
              </label>
            )}
            {detail.kind !== 'class' && detail.kind !== 'club' && (
              <label style={fieldLabel}>
                Details
                <input type="text" value={sub} onChange={(e) => setSub(e.target.value)} style={fieldInput} />
              </label>
            )}
            {locationField && (
              <label style={fieldLabel}>
                Location
                <input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Room or building" style={fieldInput} />
              </label>
            )}
            <label style={fieldLabel}>
              Day
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} style={fieldInput}>
                {days.map((d, i) => (
                  <option key={d.dow + i} value={i}>{d.full}</option>
                ))}
              </select>
            </label>
            {dueMode ? (
              <label style={fieldLabel}>
                Due time
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={fieldInput} />
              </label>
            ) : (
              <>
                <label style={fieldLabel}>
                  Start
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={fieldInput} />
                </label>
                <label style={fieldLabel}>
                  End
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={fieldInput} />
                </label>
              </>
            )}
            {detail.kind === 'study' && (
              <div style={{ fontSize: 12, color: 'rgba(45,49,56,.6)', lineHeight: 1.45 }}>
                Move this study block to another day or adjust how long you want to study.
              </div>
            )}
            {detail.kind === 'class' && (
              <div style={{ fontSize: 12, color: 'rgba(45,49,56,.6)', lineHeight: 1.45 }}>
                To change the course name or code for all events, use the ··· menu in the sidebar.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn-primary" onClick={handleSave} style={{ ...actionBtn, flex: 1, background: 'rgba(26,30,36,.12)' }}>
                Save changes
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)} style={actionBtn}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 18, borderRadius: 14, overflow: 'hidden', background: 'rgba(22,26,34,.045)', border: '1px solid rgba(26,30,36,.05)' }}>
              {detail.rows.map((r) => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid rgba(26,30,36,.04)' }}>
                  <span style={{ width: 96, flexShrink: 0, fontSize: 11.5, color: 'rgba(45,49,56,.55)' }}>{r.k}</span>
                  <span style={{ fontSize: 13, fontWeight: 550 }}>{r.v}</span>
                </div>
              ))}
              {completable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                  <span style={{ width: 96, flexShrink: 0, fontSize: 11.5, color: 'rgba(45,49,56,.55)' }}>Status</span>
                  <button
                    type="button"
                    onClick={onToggleComplete}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      color: isComplete ? '#2F7A4F' : 'rgba(35,38,43,.85)',
                      background: isComplete ? 'rgba(63,147,102,.12)' : 'rgba(26,30,36,.05)',
                      border: `1px solid ${isComplete ? 'rgba(63,147,102,.35)' : 'rgba(26,30,36,.1)'}`,
                      borderRadius: 20,
                      padding: '5px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {isComplete ? '● Complete' : '○ Not started'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, padding: 14, borderRadius: 15, background: 'linear-gradient(150deg, rgba(110,91,216,.22), rgba(26,30,36,.03))', border: '1px solid rgba(110,91,216,.30)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#4B3CC4', letterSpacing: '.2px' }}>✨ Beezy&apos;s recommendation</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 7, color: 'rgba(35,38,43,.92)' }}>{detail.tip}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {wantsStudyPlan ? (
                <button type="button" className="btn-primary" onClick={onAddStudy} style={{ ...actionBtn, flex: 1, background: 'rgba(26,30,36,.11)' }}>
                  Add to study plan
                </button>
              ) : completable ? (
                <button type="button" className="btn-primary" onClick={onToggleComplete} style={{ ...actionBtn, flex: 1, background: 'rgba(26,30,36,.11)' }}>
                  {isComplete ? 'Mark incomplete' : 'Mark complete'}
                </button>
              ) : null}
              {!wantsStudyPlan && (
                <button type="button" className="btn-secondary" onClick={onAddStudy} style={actionBtn}>Add study time</button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)} style={actionBtn}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  ...actionBtn,
                  width: '100%',
                  color: '#B84A3A',
                  border: '1px solid rgba(184,74,58,.28)',
                  background: 'rgba(217,85,66,.08)',
                }}
              >
                Delete this event only
              </button>
              <button
                type="button"
                onClick={onDeleteCourse}
                style={{
                  ...actionBtn,
                  width: '100%',
                  color: 'rgba(45,49,56,.72)',
                  border: '1px solid rgba(26,30,36,.1)',
                  background: 'transparent',
                  fontSize: 12.5,
                }}
              >
                Delete entire class ({detail.courseCode} · {detail.courseEventCount} events)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CourseManageModalProps {
  course: CourseManageState;
  onClose: () => void;
  onToggleHidden: () => void;
  onDeleteCourse: () => void;
  onUpdateCourse: (patch: { code: string; name: string }) => void;
  onUpdateColor: (hex: string) => void;
  onUpdateSchedule: (meetings: ClassMeetingEdit[]) => void;
}

export function CourseManageModal({
  course,
  onClose,
  onToggleHidden,
  onDeleteCourse,
  onUpdateCourse,
  onUpdateColor,
  onUpdateSchedule,
}: CourseManageModalProps) {
  const label = course.club ? 'organization' : 'class';
  const scheduleLabel = course.club ? 'Meeting schedule' : 'Class schedule';
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(course.code);
  const [name, setName] = useState(course.name);
  const [colorHex, setColorHex] = useState(course.hex);
  const [meetings, setMeetings] = useState<ClassMeetingEdit[]>(course.classMeetings);

  useEffect(() => {
    setEditing(!!course.startEditing);
    setCode(course.code);
    setName(course.name);
    setColorHex(course.hex);
    setMeetings(course.classMeetings);
  }, [course]);

  const handleSave = () => {
    if (!code.trim() || !name.trim()) return;
    onUpdateCourse({ code: code.trim(), name: name.trim() });
    setEditing(false);
  };

  const updateMeeting = (index: number, patch: Partial<ClassMeetingEdit>) => {
    setMeetings((prev) => prev.map((meeting, i) => (i === index ? { ...meeting, ...patch } : meeting)));
  };

  const handleSaveSchedule = () => {
    onUpdateSchedule(meetings);
  };

  const activeColor = COURSE_COLORS.find((c) => c.hex.toLowerCase() === colorHex.toLowerCase()) ?? { hex: colorHex, rgb: course.rgb };

  return (
    <div onClick={onClose} style={{ ...overlayStyle, zIndex: 92 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalStyle, width: 460, maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: course.club ? '50%' : 4,
              marginTop: 7,
              flexShrink: 0,
              background: activeColor.hex,
              boxShadow: `0 0 12px rgba(${activeColor.rgb},.7)`,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19.5, fontWeight: 600, letterSpacing: '-.4px', lineHeight: 1.2 }}>{course.code}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 4 }}>{course.name}</div>
          </div>
          <button type="button" className="btn-glass" onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 14, background: 'rgba(22,26,34,.045)', border: '1px solid rgba(26,30,36,.05)', fontSize: 13, color: 'rgba(35,38,43,.85)' }}>
          {course.eventCount} event{course.eventCount === 1 ? '' : 's'} on your calendar this week
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(35,38,43,.92)', marginBottom: 10 }}>Color</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COURSE_COLORS.map((color) => {
              const selected = colorHex.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  aria-label={`Set color ${color.hex}`}
                  onClick={() => {
                    setColorHex(color.hex);
                    onUpdateColor(color.hex);
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: course.club ? '50%' : 9,
                    border: selected ? '2px solid rgba(26,30,36,.85)' : '2px solid rgba(255,255,255,.9)',
                    background: color.hex,
                    boxShadow: selected
                      ? `0 0 0 2px rgba(${color.rgb},.35), 0 4px 12px rgba(${color.rgb},.45)`
                      : `0 2px 8px rgba(${color.rgb},.28)`,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(35,38,43,.92)' }}>{scheduleLabel}</div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMeetings((prev) => [...prev, defaultClassMeeting()])}
              style={{ ...actionBtn, padding: '7px 11px', fontSize: 12 }}
            >
              + Add meeting
            </button>
          </div>

          {meetings.length === 0 ? (
            <div style={{ padding: '14px 12px', borderRadius: 14, border: '1px dashed rgba(26,30,36,.12)', fontSize: 12.5, color: 'rgba(45,49,56,.62)', lineHeight: 1.45 }}>
              No meeting times yet. Add when and where this {label} meets each week.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meetings.map((meeting, index) => (
                <div
                  key={meeting.id ?? `new-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(108px, 1.1fr) 88px 88px minmax(0, 1.4fr) 32px',
                    gap: 8,
                    alignItems: 'end',
                    padding: '10px 10px 10px 12px',
                    borderRadius: 14,
                    border: '1px solid rgba(26,30,36,.08)',
                    background: 'rgba(26,30,36,.025)',
                  }}
                >
                  <label style={compactFieldLabel}>
                    Day
                    <select
                      value={meeting.day}
                      onChange={(e) => updateMeeting(index, { day: Number(e.target.value) })}
                      style={compactFieldInput}
                    >
                      {WEEKDAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={compactFieldLabel}>
                    Start
                    <input
                      type="time"
                      value={meeting.start}
                      onChange={(e) => updateMeeting(index, { start: e.target.value })}
                      style={compactFieldInput}
                    />
                  </label>
                  <label style={compactFieldLabel}>
                    End
                    <input
                      type="time"
                      value={meeting.end}
                      onChange={(e) => updateMeeting(index, { end: e.target.value })}
                      style={compactFieldInput}
                    />
                  </label>
                  <label style={compactFieldLabel}>
                    Location
                    <input
                      type="text"
                      value={meeting.location}
                      onChange={(e) => updateMeeting(index, { location: e.target.value })}
                      placeholder="Room or building"
                      style={compactFieldInput}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setMeetings((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove meeting"
                    style={removeMeetingBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveSchedule}
            style={{ ...actionBtn, width: '100%', marginTop: 12, background: 'rgba(26,30,36,.12)' }}
          >
            Save schedule
          </button>
        </div>

        {editing ? (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={fieldLabel}>
              Course code
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} style={fieldInput} />
            </label>
            <label style={fieldLabel}>
              Course name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={handleSave} style={{ ...actionBtn, flex: 1, background: 'rgba(26,30,36,.12)' }}>
                Save changes
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)} style={actionBtn}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)} style={{ ...actionBtn, width: '100%' }}>
            Edit {label} info
          </button>
          <button type="button" className="btn-secondary" onClick={onToggleHidden} style={{ ...actionBtn, width: '100%' }}>
            {course.hidden ? 'Show on calendar' : 'Hide on calendar'}
          </button>
          <button
            type="button"
            onClick={onDeleteCourse}
            style={{
              ...actionBtn,
              width: '100%',
              color: '#B84A3A',
              border: '1px solid rgba(184,74,58,.28)',
              background: 'rgba(217,85,66,.08)',
            }}
          >
            Delete entire {label}
          </button>
        </div>
        )}
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'rgba(45,49,56,.55)', lineHeight: 1.45 }}>
          Deleting removes this {label} and all {course.eventCount} of its events. To remove one item, open that event instead.
        </div>
      </div>
    </div>
  );
}

interface CourseModalProps {
  stage: CourseStage;
  pasteText: string;
  preview: ImportPreview | null;
  onClose: () => void;
  onNavigate: (stage: CourseStage) => void;
  onPasteChange: (text: string) => void;
  onBuild: () => void;
  onCommit: () => void;
  onCreateManual: (input: CreateCourseInput) => void;
  onShowToast: (msg: string) => void;
}

export function CourseModal({
  stage,
  pasteText,
  preview,
  onClose,
  onNavigate,
  onPasteChange,
  onBuild,
  onCommit,
  onCreateManual,
  onShowToast,
}: CourseModalProps) {
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualClub, setManualClub] = useState(false);
  const [manualMeetings, setManualMeetings] = useState<ClassMeetingEdit[]>([]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(SYLLABI_IMPORT_PROMPT);
      setCopied(true);
      onShowToast('✓ Prompt copied — paste it into ChatGPT, Claude, or Gemini');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy — select and copy the prompt manually');
    }
  };

  const width = stage === 'preview' ? 468 : stage === 'manual' ? 460 : 520;

  return (
    <div onClick={onClose} style={{ ...overlayStyle, zIndex: 95 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalStyle, width, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        {stage === 'intro' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.4px' }}>Add Your Classes</div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 6, lineHeight: 1.5 }}>
              We need your course information to build your calendar. Use any AI to organize your syllabus, then paste the result here.
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Step n={1} title="Copy the prompt" detail="This tells the AI exactly how to format your course info.">
                <button type="button" className="btn-syllabus" onClick={copyPrompt} style={{ ...syllabusBtn, marginTop: 0 }}>
                  <span style={{ fontSize: 20 }}>🐝</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{copied ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </Step>
              <Step n={2} title="Paste into ChatGPT, Claude, or Gemini" detail="Open your favorite AI chat and paste the prompt." />
              <Step n={3} title="Give the AI your syllabus + schedule" detail="Attach or paste your syllabus PDF, course schedule, and deadline list." />
              <Step n={4} title="Copy the organized response" detail="The AI will return structured course blocks — copy all of it." />
            </div>

            <button type="button" className="btn-primary" onClick={() => onNavigate('paste')} style={{ ...actionBtn, width: '100%', marginTop: 20, background: 'rgba(26,30,36,.12)' }}>
              Import with AI →
            </button>
            <button type="button" className="btn-secondary" onClick={() => onNavigate('manual')} style={{ ...actionBtn, width: '100%', marginTop: 8 }}>
              Add course manually
            </button>
          </>
        )}

        {stage === 'manual' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <button type="button" className="btn-glass" onClick={() => onNavigate('intro')} style={backBtn} aria-label="Back">‹</button>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.4px' }}>Add course manually</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 4, marginLeft: 36, lineHeight: 1.45 }}>
              Enter the basics now. You can add assignments and more meeting times anytime.
            </div>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={fieldLabel}>
                Course code
                <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="e.g. CS 1331" style={fieldInput} />
              </label>
              <label style={fieldLabel}>
                Course name
                <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Intro to Object-Oriented Programming" style={fieldInput} />
              </label>
              <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={manualClub} onChange={(e) => setManualClub(e.target.checked)} />
                Club or organization
              </label>

              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(35,38,43,.88)' }}>Weekly meeting (optional)</div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setManualMeetings((prev) => [...prev, defaultClassMeeting()])}
                    style={{ ...actionBtn, padding: '6px 10px', fontSize: 12 }}
                  >
                    + Add time
                  </button>
                </div>
                {manualMeetings.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'rgba(45,49,56,.58)' }}>Skip for now and add class times from the course menu later.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {manualMeetings.map((meeting, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr 80px 80px 1fr 28px', gap: 8, alignItems: 'end' }}>
                        <label style={compactFieldLabel}>
                          Day
                          <select
                            value={meeting.day}
                            onChange={(e) => setManualMeetings((prev) => prev.map((item, i) => i === index ? { ...item, day: Number(e.target.value) } : item))}
                            style={compactFieldInput}
                          >
                            {WEEKDAY_OPTIONS.map((day) => (
                              <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                          </select>
                        </label>
                        <label style={compactFieldLabel}>
                          Start
                          <input
                            type="time"
                            value={meeting.start}
                            onChange={(e) => setManualMeetings((prev) => prev.map((item, i) => i === index ? { ...item, start: e.target.value } : item))}
                            style={compactFieldInput}
                          />
                        </label>
                        <label style={compactFieldLabel}>
                          End
                          <input
                            type="time"
                            value={meeting.end}
                            onChange={(e) => setManualMeetings((prev) => prev.map((item, i) => i === index ? { ...item, end: e.target.value } : item))}
                            style={compactFieldInput}
                          />
                        </label>
                        <label style={compactFieldLabel}>
                          Location
                          <input
                            type="text"
                            value={meeting.location}
                            onChange={(e) => setManualMeetings((prev) => prev.map((item, i) => i === index ? { ...item, location: e.target.value } : item))}
                            placeholder="Room"
                            style={compactFieldInput}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setManualMeetings((prev) => prev.filter((_, i) => i !== index))}
                          style={removeMeetingBtn}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => onCreateManual({
                  code: manualCode,
                  name: manualName,
                  club: manualClub || undefined,
                  meetings: manualMeetings,
                })}
                style={{ ...actionBtn, width: '100%', marginTop: 6, background: 'rgba(26,30,36,.12)' }}
              >
                Create course
              </button>
            </div>
          </>
        )}

        {stage === 'paste' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <button type="button" className="btn-glass" onClick={() => onNavigate('intro')} style={backBtn} aria-label="Back">‹</button>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.4px' }}>Paste your organized course information</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(45,49,56,.6)', marginTop: 4, marginLeft: 36 }}>
              Step 5 — paste everything the AI returned below.
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => onPasteChange(e.target.value)}
              placeholder="Paste your AI-generated course information here…"
              style={pasteArea}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={onBuild}
              disabled={!pasteText.trim()}
              style={{
                ...actionBtn,
                width: '100%',
                marginTop: 14,
                background: pasteText.trim() ? 'rgba(26,30,36,.12)' : 'rgba(26,30,36,.05)',
                opacity: pasteText.trim() ? 1 : 0.55,
                cursor: pasteText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              🐝 Build My Calendar
            </button>
          </>
        )}

        {stage === 'preview' && preview && (
          <>
            <div style={{ fontSize: 12, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(45,49,56,.55)' }}>
              {preview.primaryLabel || `${preview.summary.totalCourses} courses`}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.6px', marginTop: 7 }}>
              Found {preview.summary.totalEvents} academic event{preview.summary.totalEvents === 1 ? '' : 's'}.
            </div>
            {preview.errors.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: preview.summary.totalEvents > 0 ? '#9A6B1A' : '#B84A3A',
                  lineHeight: 1.45,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: preview.summary.totalEvents > 0 ? 'rgba(201,127,46,.10)' : 'rgba(217,85,66,.08)',
                  border: `1px solid ${preview.summary.totalEvents > 0 ? 'rgba(201,127,46,.25)' : 'rgba(184,74,58,.22)'}`,
                }}
              >
                {preview.summary.totalEvents > 0 && (
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Some courses need attention:</div>
                )}
                {preview.errors.map((e) => (
                  <div key={e}>{e}</div>
                ))}
              </div>
            )}
            {(preview.courseBreakdown?.length ?? 0) > 1 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {preview.courseBreakdown!.map((row) => (
                  <div key={row.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(35,38,43,.82)' }}>
                    <span>{row.code}</span>
                    <span style={{ color: row.eventCount === 0 ? '#B84A3A' : 'rgba(45,49,56,.55)' }}>
                      {row.eventCount} event{row.eventCount === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              {[
                { n: preview.summary.assignments, label: 'assignments' },
                { n: preview.summary.exams, label: 'exams' },
                { n: preview.summary.readings, label: 'readings' },
                { n: preview.summary.classMeetings, label: 'class meetings' },
              ].map((f) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderRadius: 14, background: 'rgba(22,26,34,.045)', border: '1px solid rgba(26,30,36,.05)' }}>
                  <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', minWidth: 26 }}>{f.n}</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(35,38,43,.82)' }}>{f.label}</span>
                </div>
              ))}
            </div>
            {preview.summary.totalCourses > 1 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'rgba(45,49,56,.65)' }}>
                Importing {preview.summary.totalCourses} courses: {preview.courses.map((c) => c.code).join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => onNavigate('paste')} style={{ ...actionBtn, flex: 1 }}>
                Edit paste
              </button>
              <button type="button" className="btn-primary" onClick={onCommit} style={{ ...actionBtn, flex: 2, background: 'rgba(26,30,36,.12)' }}>
                Add to my calendar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, detail, children }: { n: number; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(26,30,36,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(45,49,56,.6)', marginTop: 3, lineHeight: 1.45 }}>{detail}</div>
        {children}
      </div>
    </div>
  );
}

interface BeezyPanelProps {
  chat: ChatMessage[];
  onClose: () => void;
  onAsk: (q: string) => void;
  onAddStudy: () => void;
}

export function BeezyPanel({ chat, onClose, onAsk, onAddStudy }: BeezyPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const suggestions = [
    'What should I work on today?',
    'How many assignments are due this week?',
    'How busy is my week?',
    'Anything due tomorrow?',
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    onAsk(q);
    setInput('');
  };

  return (
    <div className="beezy-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(26,30,36,.06)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 9, background: 'linear-gradient(150deg, #22252A, #3A3F47)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✨</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Beezy</div>
        <button type="button" className="btn-glass" onClick={onClose} style={{ ...closeBtn, marginLeft: 'auto' }}>✕</button>
      </div>
      <div className="beezy-chat-scroll">
        {chat.map((m, i) => (
          <div key={i} className={`beezy-chat-row ${m.who === 'me' ? 'beezy-chat-row-me' : 'beezy-chat-row-beezy'}`}>
            <div className={`beezy-bubble ${m.who === 'me' ? 'beezy-bubble-me' : 'beezy-bubble-beezy'}`}>
              {m.who === 'me' ? (
                m.text.split('\n').map((line, j) => (
                  <span key={j} className="beezy-msg-line">
                    {line}
                  </span>
                ))
              ) : (
                <BeezyMessage text={m.text} />
              )}
            </div>
            {m.act && (
              <button type="button" className="beezy-action-btn" onClick={onAddStudy}>
                {m.act}
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ padding: '10px 14px', borderTop: '1px solid rgba(26,30,36,.06)', display: 'flex', gap: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your week…"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(26,30,36,.1)',
            background: 'rgba(26,30,36,.03)',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-primary"
          style={{
            ...actionBtn,
            padding: '10px 14px',
            background: input.trim() ? 'rgba(26,30,36,.12)' : 'rgba(26,30,36,.05)',
            opacity: input.trim() ? 1 : 0.55,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Send
        </button>
      </form>
      <div className="beezy-suggestions">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="beezy-suggestion-chip"
            onClick={() => {
              onAsk(s);
              setInput('');
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

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

const syllabusBtn: React.CSSProperties = {
  width: '100%',
  marginTop: 18,
  padding: 18,
  borderRadius: 18,
  border: '1px solid rgba(110,91,216,.38)',
  background: 'linear-gradient(150deg, rgba(110,91,216,.26), rgba(26,30,36,.04))',
  color: '#23262B',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const backBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 9,
  border: '1px solid rgba(26,30,36,.08)',
  background: 'rgba(26,30,36,.04)',
  color: '#3A3E45',
  cursor: 'pointer',
  fontSize: 16,
  flexShrink: 0,
};

const pasteArea: React.CSSProperties = {
  width: '100%',
  minHeight: 220,
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  border: '1px solid rgba(26,30,36,.1)',
  background: 'rgba(26,30,36,.03)',
  color: '#23262B',
  fontSize: 12.5,
  lineHeight: 1.55,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  resize: 'vertical',
  outline: 'none',
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

const compactFieldLabel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 10.5,
  fontWeight: 600,
  color: 'rgba(45,49,56,.62)',
  letterSpacing: '.15px',
  minWidth: 0,
};

const compactFieldInput: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '8px 8px',
  borderRadius: 10,
  border: '1px solid rgba(26,30,36,.1)',
  background: 'rgba(255,255,255,.72)',
  color: '#23262B',
  fontSize: 12.5,
  fontFamily: 'inherit',
  outline: 'none',
};

const removeMeetingBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: '1px solid rgba(26,30,36,.08)',
  background: 'rgba(26,30,36,.04)',
  color: 'rgba(45,49,56,.7)',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  fontFamily: 'inherit',
};
