import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarEvent, ChatMessage, ClassMeetingEdit, Course, CourseManageState, CourseStage, CreateCourseInput, CreateEventInput, DetailState, EventEditPatch, ImportPreview, KindFilter, ManualAddKind, ViewMode } from '../types';
import { prepBeforeClass } from '../utils/classPrep';
import { KIND_LABEL } from '../data/constants';
import { getCourse } from '../utils/courses';
import { beezyTipForEvent, formatEventWorkload } from '../utils/calendarInsights';
import { withScheduleRange } from '../utils/eventSchedule';
import { isVisible } from '../utils/eventStyles';
import { mergeCourseMaps, buildCourse, slugFromCourseCode, uniqueCourseId, courseColorFromHex } from '../utils/courses';
import { parseCourseImport } from '../utils/parseCourseImport';
import { eventDayIndex, eventDayLabel, addDays, addMonths, buildWeekDays, formatPeriodLabel, startOfMonth, startOfWeekMonday, startOfDay, toISODate, isRecurringEvent, mondayDayIndex, parseFlexibleDate, type DayDescriptor } from '../utils/dates';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatSupabaseError } from '../lib/supabaseErrors';
import { loadLocalCalendar, saveLocalCalendar } from '../services/localCalendarStore';
import {
  deleteCourseInDb,
  deleteEventInDb,
  initCalendarFromSupabase,
  replaceImportedCalendar,
  savePreferences,
  setCourseHiddenInDb,
  setEventDoneInDb,
  updateCourseInDb,
  updateEventInDb,
  upsertCourses,
  upsertEvents,
} from '../services/calendarStore';
import { classEventsToMeetings, scheduleKindForCourse, validateClassMeetings } from '../utils/classSchedule';
import { timeInputToHours } from '../utils/time';
import { askBeezy, beezyGreeting } from '../services/beezy';

let uid = 1000;

function makeStudyForEvent(
  target: CalendarEvent,
  weekStart: Date,
  days: DayDescriptor[],
): CalendarEvent {
  const todayIdx = days.findIndex((d) => d.today);
  const dueIdx = eventDayIndex(target, weekStart);
  const studyDay = todayIdx >= 0 ? todayIdx : dueIdx != null ? Math.max(0, dueIdx - 1) : 0;
  const studyDate = addDays(weekStart, studyDay);
  return {
    id: 'e' + ++uid,
    d: studyDay,
    date: toISODate(studyDate),
    k: 'study',
    c: target.c,
    t: `Study: ${target.t}`,
    sub: target.sub || target.t,
    s: 16.5,
    e: 17.25,
    ai: true,
  };
}

export function useCalendar(userId: string | null) {
  const [syncOk, setSyncOk] = useState(true);
  const persistEnabled = isSupabaseConfigured && !!userId;
  const remote = persistEnabled && syncOk;
  const userIdRef = useRef<string | null>(userId);
  const [syncAttempt, setSyncAttempt] = useState(0);

  const [loading, setLoading] = useState(isSupabaseConfigured && !!userId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setViewState] = useState<ViewMode>('Week');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [kind, setKindState] = useState<KindFilter>('all');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [addMenu, setAddMenu] = useState(false);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [courseModal, setCourseModal] = useState(false);
  const [courseStage, setCourseStage] = useState<CourseStage>('intro');
  const [pasteText, setPasteText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);
  const [importedCourses, setImportedCourses] = useState<Course[]>([]);
  const [importedEvents, setImportedEvents] = useState<CalendarEvent[]>([]);
  const [duey, setDuey] = useState(false);
  const [toast, setToast] = useState('');
  const [extra, setExtra] = useState<CalendarEvent[]>([]);
  const [added, setAdded] = useState(false);
  const [rail, setRail] = useState<'next' | 'todo'>('next');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [deletedIds, setDeletedIds] = useState<Record<string, true>>({});
  const [deletedCourseIds, setDeletedCourseIds] = useState<Record<string, true>>({});
  const [eventOverrides, setEventOverrides] = useState<Record<string, Partial<CalendarEvent>>>({});
  const [courseOverrides, setCourseOverrides] = useState<Record<string, Partial<Course>>>({});
  const [courseManage, setCourseManage] = useState<CourseManageState | null>(null);
  const [addEventKind, setAddEventKind] = useState<ManualAddKind | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const beezyGreetedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    userIdRef.current = userId;
    if (!userId && !isSupabaseConfigured) {
      const saved = loadLocalCalendar();
      if (saved) {
        setImportedCourses(saved.courses);
        setImportedEvents(saved.events);
        setHidden(saved.hidden);
        setDone(saved.done);
        setDeletedCourseIds(saved.deletedCourseIds);
        setViewState(saved.view);
        setKindState(saved.kind);
      }
      setLoading(false);
      return;
    }

    if (!userId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSyncOk(true);
    (async () => {
      try {
        const snapshot = await initCalendarFromSupabase(userId);
        if (cancelled || !snapshot) return;
        setDbCourses(snapshot.courses);
        setDbEvents(snapshot.events);
        setHidden(snapshot.hidden);
        setDone(snapshot.done);
        setDeletedCourseIds(snapshot.deletedCourseIds);
        setViewState(snapshot.view);
        setKindState(snapshot.kind);
        setSyncError(null);
        setSyncOk(true);
      } catch (err) {
        if (!cancelled) {
          setSyncOk(false);
          setSyncError(`${formatSupabaseError(err)} Could not load your calendar.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, syncAttempt]);

  const retrySync = useCallback(() => {
    if (!isSupabaseConfigured || !userId) return;
    setSyncOk(true);
    setLoading(true);
    setSyncError(null);
    setSyncAttempt((n) => n + 1);
  }, [userId]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    if (persistEnabled && userIdRef.current) {
      savePreferences(userIdRef.current, next, kind).catch(() => showToast('Could not save view preference'));
    }
  }, [persistEnabled, kind, showToast]);

  const setKind = useCallback((next: KindFilter) => {
    setKindState(next);
    if (persistEnabled && userIdRef.current) {
      savePreferences(userIdRef.current, view, next).catch(() => showToast('Could not save filter preference'));
    }
  }, [persistEnabled, view, showToast]);

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate]);
  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const periodLabel = useMemo(() => formatPeriodLabel(view, anchorDate, weekStart), [view, anchorDate, weekStart]);
  const canNavigate = true;

  const goPrev = useCallback(() => {
    setAnchorDate((d) => (view === 'Month' ? addMonths(d, -1) : addDays(d, -7)));
  }, [view]);

  const goNext = useCallback(() => {
    setAnchorDate((d) => (view === 'Month' ? addMonths(d, 1) : addDays(d, 7)));
  }, [view]);

  const goToday = useCallback(() => {
    setAnchorDate(startOfDay(new Date()));
  }, []);

  const activeCourses = persistEnabled ? dbCourses : importedCourses;

  const courseMap = useMemo(() => {
    const merged = mergeCourseMaps({}, activeCourses);
    for (const [id, patch] of Object.entries(courseOverrides)) {
      if (merged[id]) merged[id] = { ...merged[id], ...patch };
    }
    return merged;
  }, [activeCourses, courseOverrides]);

  const courses = useMemo(() => {
    const source = persistEnabled ? dbCourses : importedCourses;
    return source
      .map((c) => courseMap[c.id] ?? c)
      .filter((c) => !deletedCourseIds[c.id]);
  }, [persistEnabled, dbCourses, courseMap, importedCourses, deletedCourseIds]);

  const rawEvents = useMemo(
    () => (persistEnabled ? dbEvents.concat(extra) : importedEvents.concat(extra)),
    [persistEnabled, dbEvents, extra, importedEvents],
  );

  const applyEvent = useCallback((e: CalendarEvent): CalendarEvent => {
    const patch = eventOverrides[e.id];
    return patch ? { ...e, ...patch } : e;
  }, [eventOverrides]);

  const events = useMemo(
    () =>
      rawEvents
        .filter((e) => !deletedIds[e.id] && !deletedCourseIds[e.c])
        .map(applyEvent)
        .map(withScheduleRange),
    [rawEvents, deletedIds, deletedCourseIds, applyEvent],
  );

  const visibleEvents = useMemo(
    () => events.filter((e) => isVisible(e, kind, hidden)),
    [events, kind, hidden],
  );

  const beezyContext = useMemo(
    () => ({ events, courses, courseMap, hidden, done, weekStart, days }),
    [events, courses, courseMap, hidden, done, weekStart, days],
  );

  useEffect(() => {
    if (loading || beezyGreetedRef.current) return;
    beezyGreetedRef.current = true;
    setChat([{ who: 'duey', text: beezyGreeting(beezyContext) }]);
  }, [loading, beezyContext]);

  const openBeezy = useCallback(() => {
    setDuey(true);
    setChat((prev) => {
      if (prev.length > 0) return prev;
      return [{ who: 'duey', text: beezyGreeting(beezyContext) }];
    });
  }, [beezyContext]);

  const openEvent = useCallback((e: CalendarEvent) => {
    const c = getCourse(courseMap, e.c);
    const insightCtx = { events, courseMap, weekStart, days, hidden, done };
    const rows: { k: string; v: string }[] = [];
    if (e.due) rows.push({ k: 'Due', v: eventDayLabel(e, weekStart, days) + ' at ' + e.due });
    else if (e.s != null && e.e != null) rows.push({ k: 'When', v: eventDayLabel(e, weekStart, days) + ' · ' + formatTime(e.s) + ' – ' + formatTime(e.e) });
    else rows.push({ k: 'When', v: eventDayLabel(e, weekStart, days) });
    rows.push({ k: 'Type', v: KIND_LABEL[e.k] + (e.ai ? ' · suggested by Beezy' : '') });
    if (e.loc) rows.push({ k: 'Location', v: e.loc });
    if (e.k === 'class') {
      const prepItems = prepBeforeClass(e, events, weekStart, hidden, done);
      if (prepItems.length) {
        rows.push({
          k: 'Before class',
          v: prepItems.map((item) => item.t).join(' · '),
        });
      }
    }
    if (e.sub) rows.push({ k: e.k === 'class' || e.k === 'club' ? 'Section' : 'Details', v: e.sub });
    rows.push({ k: 'Workload', v: formatEventWorkload(e) });

    const courseEventCount = rawEvents.filter((x) => x.c === e.c && !deletedIds[x.id] && !deletedCourseIds[x.c]).length;

    setDetail({
      eventId: e.id,
      courseId: e.c,
      courseCode: c.code,
      courseEventCount,
      kind: e.k,
      title: e.t,
      sub: e.sub,
      course: c.code + ' — ' + c.name,
      rows,
      tip: beezyTipForEvent(e, insightCtx),
      primary: '',
      dotColor: e.k === 'exam' ? '#D95542' : c.hex,
      dotGlow: e.k === 'exam' ? 'rgba(217,85,66,.9)' : `rgba(${c.rgb},.7)`,
      d: eventDayIndex(e, weekStart) ?? e.d,
      s: e.s,
      e: e.e,
      due: e.due,
      loc: e.loc,
    });
  }, [courseMap, done, events, hidden, rawEvents, deletedIds, deletedCourseIds, weekStart, days]);

  const addStudy = useCallback(() => {
    const graded: CalendarEvent['k'][] = ['assignment', 'reading', 'quiz', 'presentation', 'exam'];
    const openGraded = events
      .filter((e) => !hidden[e.c] && graded.includes(e.k) && !done[e.id] && !e.done)
      .sort((a, b) => (eventDayIndex(a, weekStart) ?? 99) - (eventDayIndex(b, weekStart) ?? 99));

    const target =
      (detail?.eventId ? events.find((e) => e.id === detail.eventId) : undefined) ??
      openGraded[0];

    if (!target) {
      showToast('Import courses first, then Beezy can suggest study time');
      return;
    }

    const already = events.some(
      (e) => e.k === 'study' && e.c === target.c && e.t.includes(target.t) && !deletedIds[e.id],
    );
    if (already || added) {
      showToast('Study session already on your calendar');
      return;
    }

    const study = makeStudyForEvent(target, weekStart, days);
    setAdded(true);
    setDetail(null);

    if (persistEnabled && userIdRef.current) {
      setDbEvents((prev) => [...prev, study]);
      upsertEvents(userIdRef.current, [study]).catch(() => showToast('Could not save study session'));
    } else {
      setExtra((prev) => [...prev, study]);
    }

    const when = eventDayLabel(study, weekStart, days);
    showToast(`✨ Added study session — ${when}, ${formatTime(study.s!)} – ${formatTime(study.e!)}`);
  }, [added, detail, done, events, hidden, persistEnabled, showToast, weekStart, days, deletedIds]);

  const ask = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const reply = askBeezy(trimmed, beezyContext);
    setChat((prev) =>
      prev.concat([
        { who: 'me', text: trimmed },
        { who: 'duey', text: reply.text, act: reply.act },
      ]),
    );
  }, [beezyContext]);

  const toggleHidden = useCallback((id: string) => {
    setHidden((h) => {
      const next = { ...h, [id]: !h[id] };
      if (persistEnabled && userIdRef.current) {
        setCourseHiddenInDb(userIdRef.current, id, !!next[id]).catch(() => showToast('Could not save visibility'));
      }
      return next;
    });
  }, [persistEnabled, showToast]);

  const toggleDone = useCallback((id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    const next = !done[id] && !event.done;

    setDone((d) => {
      const updated = { ...d };
      if (next) updated[id] = true;
      else delete updated[id];
      return updated;
    });

    const patched = { ...event, done: next };

    if (persistEnabled && userIdRef.current) {
      setEventDoneInDb(userIdRef.current, patched, next).catch(() => showToast('Could not save status'));
      setDbEvents((prev) => prev.map((e) => (e.id === id ? patched : e)));
    } else {
      const apply = (list: CalendarEvent[]) => list.map((e) => (e.id === id ? patched : e));
      setImportedEvents((prev) => apply(prev));
      setExtra((prev) => apply(prev));
    }
  }, [events, done, persistEnabled, showToast]);

  const toggleDetailComplete = useCallback(() => {
    if (!detail) return;
    const wasComplete = !!done[detail.eventId] || !!events.find((e) => e.id === detail.eventId)?.done;
    toggleDone(detail.eventId);
    showToast(wasComplete ? '○ Marked incomplete' : '✓ Marked complete');
  }, [detail, toggleDone, done, events, showToast]);

  const deleteEvent = useCallback((id: string) => {
    setDeletedIds((prev) => ({ ...prev, [id]: true }));
    setDetail(null);

    if (persistEnabled && userIdRef.current) {
      setDbEvents((prev) => prev.filter((e) => e.id !== id));
      deleteEventInDb(userIdRef.current, id).catch(() => showToast('Could not delete event'));
    } else {
      setExtra((prev) => prev.filter((e) => e.id !== id));
      setImportedEvents((prev) => prev.filter((e) => e.id !== id));
    }
    showToast('Removed this event from your calendar');
  }, [persistEnabled, showToast]);

  const deleteCourse = useCallback((courseId: string) => {
    const course = getCourse(courseMap, courseId);
    const ids = rawEvents.filter((e) => e.c === courseId).map((e) => e.id);

    setDeletedCourseIds((prev) => ({ ...prev, [courseId]: true }));
    setDeletedIds((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = true;
      return next;
    });

    if (persistEnabled && userIdRef.current) {
      setDbCourses((prev) => prev.filter((c) => c.id !== courseId));
      setDbEvents((prev) => prev.filter((e) => e.c !== courseId));
      deleteCourseInDb(userIdRef.current, courseId).catch(() => showToast('Could not delete class'));
    } else {
      setImportedCourses((prev) => prev.filter((c) => c.id !== courseId));
      setImportedEvents((prev) => prev.filter((e) => e.c !== courseId));
      setExtra((prev) => prev.filter((e) => e.c !== courseId));
    }

    setCourseManage(null);
    setDetail((d) => (d?.courseId === courseId ? null : d));
    showToast(`Removed ${course?.code ?? 'class'} and ${ids.length} events`);
  }, [courseMap, rawEvents, persistEnabled, showToast]);

  const updateEvent = useCallback((id: string, patch: Partial<EventEditPatch>) => {
    const existing = events.find((e) => e.id === id);
    if (!existing) return;

    const clean: Partial<CalendarEvent> = {};
    if (patch.d != null) {
      clean.d = patch.d;
      if (!isRecurringEvent(existing)) {
        clean.date = toISODate(addDays(weekStart, patch.d));
      }
    }
    if (patch.t != null) clean.t = patch.t;
    if (patch.sub != null) clean.sub = patch.sub;
    if (patch.loc !== undefined) clean.loc = patch.loc || undefined;
    if (patch.due !== undefined) {
      clean.due = patch.due;
      clean.s = undefined;
      clean.e = undefined;
    } else if (patch.s != null && patch.e != null) {
      clean.s = patch.s;
      clean.e = patch.e;
      clean.due = undefined;
    }

    const merged: CalendarEvent = { ...existing, ...clean };

    const applyToList = (list: CalendarEvent[]) =>
      list.some((e) => e.id === id) ? list.map((e) => (e.id === id ? merged : e)) : list;

    if (persistEnabled && userIdRef.current) {
      updateEventInDb(userIdRef.current, merged).catch(() => showToast('Could not save event'));
      setDbEvents((prev) => applyToList(prev));
      setExtra((prev) => applyToList(prev));
    } else {
      setImportedEvents((prev) => applyToList(prev));
      setExtra((prev) => applyToList(prev));
      setEventOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    openEvent(merged);
    showToast('✓ Event updated');
  }, [events, openEvent, persistEnabled, showToast, weekStart]);

  const updateCourse = useCallback((id: string, patch: Pick<Course, 'code' | 'name'>) => {
    const code = patch.code.trim();
    const name = patch.name.trim();
    if (!code || !name) return;

    const existing = getCourse(courseMap, id);
    const updated: Course = { ...existing, code, name };

    setCourseOverrides((prev) => ({ ...prev, [id]: { code, name } }));

    if (persistEnabled) {
      setDbCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (userIdRef.current) {
        updateCourseInDb(userIdRef.current, updated, !!hidden[id]).catch(() => showToast('Could not save class'));
      }
      const syncTitles = (list: CalendarEvent[]) =>
        list.map((e) =>
          e.c === id && (e.k === 'class' || e.k === 'club') ? { ...e, t: code, sub: name } : e,
        );
      setDbEvents(syncTitles);
      setExtra(syncTitles);
    } else {
      setImportedCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      const syncTitles = (list: CalendarEvent[]) =>
        list.map((e) =>
          e.c === id && (e.k === 'class' || e.k === 'club') ? { ...e, t: code, sub: name } : e,
        );
      setImportedEvents(syncTitles);
      setExtra(syncTitles);
    }

    setCourseManage((prev) => (prev?.id === id ? { ...prev, code, name } : prev));
    setDetail((prev) =>
      prev?.courseId === id
        ? { ...prev, courseCode: code, course: code + ' — ' + name }
        : prev,
    );
    showToast('✓ Class info updated');
  }, [courseMap, hidden, persistEnabled, showToast]);

  const updateCourseColor = useCallback((id: string, hex: string) => {
    const { hex: nextHex, rgb: nextRgb } = courseColorFromHex(hex);
    const existing = getCourse(courseMap, id);
    const updated: Course = { ...existing, hex: nextHex, rgb: nextRgb };

    setCourseOverrides((prev) => ({ ...prev, [id]: { ...prev[id], hex: nextHex, rgb: nextRgb } }));

    if (persistEnabled) {
      setDbCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (userIdRef.current) {
        updateCourseInDb(userIdRef.current, updated, !!hidden[id]).catch(() => showToast('Could not save color'));
      }
    } else {
      setImportedCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }

    setCourseManage((prev) => (prev?.id === id ? { ...prev, hex: nextHex, rgb: nextRgb } : prev));
    setDetail((prev) =>
      prev?.courseId === id
        ? { ...prev, dotColor: prev.kind === 'exam' ? prev.dotColor : nextHex, dotGlow: `rgba(${nextRgb},.7)` }
        : prev,
    );
  }, [courseMap, hidden, persistEnabled, showToast]);

  const markDetailComplete = useCallback(() => {
    toggleDetailComplete();
  }, [toggleDetailComplete]);

  const openCourseManage = useCallback((course: Course, startEditing = false) => {
    const count = rawEvents.filter((e) => e.c === course.id && !deletedIds[e.id] && !deletedCourseIds[e.c]).length;
    const scheduleKind = scheduleKindForCourse(course.club);
    const classMeetings = classEventsToMeetings(
      rawEvents.filter(
        (e) => e.c === course.id && e.k === scheduleKind && !deletedIds[e.id] && !deletedCourseIds[e.c],
      ),
    );
    setCourseManage({
      id: course.id,
      code: course.code,
      name: course.name,
      hex: course.hex,
      rgb: course.rgb,
      eventCount: count,
      hidden: !!hidden[course.id],
      club: course.club,
      startEditing,
      classMeetings,
    });
  }, [rawEvents, deletedIds, deletedCourseIds, hidden]);

  const updateCourseSchedule = useCallback((courseId: string, meetings: ClassMeetingEdit[]) => {
    const validationError = validateClassMeetings(meetings);
    if (validationError) {
      showToast(validationError);
      return;
    }

    const course = getCourse(courseMap, courseId);
    const kind = scheduleKindForCourse(course.club);
    const existing = rawEvents.filter(
      (e) => e.c === courseId && e.k === kind && !deletedIds[e.id] && !deletedCourseIds[e.c],
    );
    const keepIds = new Set(meetings.map((m) => m.id).filter((id): id is string => !!id));
    const removed = existing.filter((e) => !keepIds.has(e.id));

    const nextScheduleEvents = meetings.map((meeting) => {
      const s = timeInputToHours(meeting.start)!;
      const e = timeInputToHours(meeting.end)!;
      const payload = {
        d: meeting.day,
        k: kind,
        c: courseId,
        t: course.code,
        sub: course.name,
        loc: meeting.location.trim() || undefined,
        s,
        e,
        due: undefined,
      };
      if (meeting.id) {
        const existingEvent = existing.find((item) => item.id === meeting.id);
        if (existingEvent) return withScheduleRange({ ...existingEvent, ...payload });
      }
      return withScheduleRange({ id: 'e' + ++uid, ...payload });
    });

    const replaceSchedule = (list: CalendarEvent[]) => {
      const other = list.filter((e) => !(e.c === courseId && e.k === kind));
      return [...other, ...nextScheduleEvents];
    };

    if (persistEnabled && userIdRef.current) {
      const dbUserId = userIdRef.current;
      Promise.all([
        ...removed.map((event) => deleteEventInDb(dbUserId, event.id)),
        upsertEvents(dbUserId, nextScheduleEvents),
      ]).catch(() => showToast('Could not save schedule'));
      setDbEvents((prev) => replaceSchedule(prev));
      setExtra((prev) => replaceSchedule(prev));
    } else {
      setImportedEvents((prev) => replaceSchedule(prev));
      setExtra((prev) => replaceSchedule(prev));
      if (removed.length) {
        setEventOverrides((prev) => {
          const next = { ...prev };
          for (const event of removed) delete next[event.id];
          return next;
        });
      }
    }

    if (removed.length) {
      setDeletedIds((prev) => {
        const next = { ...prev };
        for (const event of removed) next[event.id] = true;
        return next;
      });
    }

    setCourseManage((prev) => {
      if (prev?.id !== courseId) return prev;
      const updatedEvents = replaceSchedule(
        rawEvents.filter((e) => !deletedIds[e.id] && !deletedCourseIds[e.c]),
      );
      const eventCount = updatedEvents.filter((e) => e.c === courseId).length;
      return {
        ...prev,
        classMeetings: classEventsToMeetings(nextScheduleEvents),
        eventCount,
      };
    });
    showToast('✓ Schedule updated');
  }, [courseMap, deletedCourseIds, deletedIds, persistEnabled, rawEvents, showToast]);

  const closeCourseManage = useCallback(() => setCourseManage(null), []);

  const openCourseModal = useCallback(() => {
    setCourseStage('intro');
    setPasteText('');
    setImportPreview(null);
    setCourseModal(true);
  }, []);

  const closeCourseModal = useCallback(() => {
    setCourseModal(false);
    setCourseStage('intro');
    setPasteText('');
    setImportPreview(null);
  }, []);

  const createCourse = useCallback(async (input: CreateCourseInput) => {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) {
      showToast('Enter a course code and name');
      return;
    }

    const usedIds = new Set(courses.map((c) => c.id));
    const id = uniqueCourseId(slugFromCourseCode(code), usedIds);
    const paletteCourse = buildCourse(code, name, courses.length);
    const course: Course = {
      ...paletteCourse,
      id,
      club: input.club || undefined,
    };

    const meetings = input.meetings ?? [];
    if (meetings.length) {
      const validationError = validateClassMeetings(meetings);
      if (validationError) {
        showToast(validationError);
        return;
      }
    }

    const kind = scheduleKindForCourse(course.club);
    const meetingEvents = meetings.map((meeting) => {
      const s = timeInputToHours(meeting.start)!;
      const e = timeInputToHours(meeting.end)!;
      return withScheduleRange({
        id: 'e' + ++uid,
        d: meeting.day,
        k: kind,
        c: course.id,
        t: course.code,
        sub: course.name,
        loc: meeting.location.trim() || undefined,
        s,
        e,
      });
    });

    if (persistEnabled && userIdRef.current) {
      try {
        await upsertCourses(userIdRef.current, [course], hidden);
        if (meetingEvents.length) {
          await upsertEvents(userIdRef.current, meetingEvents);
        }
        setDbCourses((prev) => [...prev, course]);
        setDbEvents((prev) => [...prev, ...meetingEvents]);
        setSyncOk(true);
        setSyncError(null);
      } catch {
        showToast('Could not save course');
        return;
      }
    } else {
      setImportedCourses((prev) => [...prev, course]);
      setImportedEvents((prev) => [...prev, ...meetingEvents]);
    }

    closeCourseModal();
    showToast(`✓ Added ${course.code}`);
  }, [closeCourseModal, courses, hidden, persistEnabled, showToast]);

  const createEvent = useCallback((input: CreateEventInput) => {
    if (!input.courseId) {
      showToast('Choose a course');
      return;
    }

    const course = getCourse(courseMap, input.courseId);
    const title = input.title.trim();
    let event: CalendarEvent | null = null;

    if (input.kind === 'class') {
      if (input.day == null || !input.start || !input.end) {
        showToast('Set day and meeting times');
        return;
      }
      const s = timeInputToHours(input.start);
      const e = timeInputToHours(input.end);
      if (s == null || e == null || e <= s) {
        showToast('Enter valid start and end times');
        return;
      }
      event = {
        id: 'e' + ++uid,
        d: input.day,
        k: 'class',
        c: input.courseId,
        t: title || course.code,
        sub: course.name,
        loc: input.location?.trim() || undefined,
        s,
        e,
      };
    } else if (input.kind === 'assignment' || input.kind === 'reading' || input.kind === 'quiz') {
      if (!title || !input.date) {
        showToast('Enter a title and due date');
        return;
      }
      const parsedDate = parseFlexibleDate(input.date);
      if (!parsedDate) {
        showToast('Enter a valid due date');
        return;
      }
      event = {
        id: 'e' + ++uid,
        d: mondayDayIndex(parsedDate),
        date: input.date,
        k: input.kind,
        c: input.courseId,
        t: title,
        sub: input.details?.trim() || course.code,
        due: input.due || '11:59 PM',
        hrs: input.kind === 'assignment' ? 0.5 : undefined,
      };
    } else if (input.kind === 'study') {
      if (!input.date || !input.start || !input.end) {
        showToast('Set date and study times');
        return;
      }
      const parsedDate = parseFlexibleDate(input.date);
      if (!parsedDate) {
        showToast('Enter a valid date');
        return;
      }
      const s = timeInputToHours(input.start);
      const e = timeInputToHours(input.end);
      if (s == null || e == null || e <= s) {
        showToast('Enter valid start and end times');
        return;
      }
      event = {
        id: 'e' + ++uid,
        d: mondayDayIndex(parsedDate),
        date: input.date,
        k: 'study',
        c: input.courseId,
        t: title || `Study: ${course.code}`,
        sub: input.details?.trim() || course.name,
        s,
        e,
      };
    } else {
      if (!title || !input.date) {
        showToast('Enter a title and date');
        return;
      }
      const parsedDate = parseFlexibleDate(input.date);
      if (!parsedDate) {
        showToast('Enter a valid date');
        return;
      }
      const base = {
        id: 'e' + ++uid,
        d: mondayDayIndex(parsedDate),
        date: input.date,
        k: input.kind,
        c: input.courseId,
        t: title,
        sub: input.details?.trim() || course.code,
        loc: input.location?.trim() || undefined,
      };
      if (!input.start || !input.end) {
        showToast('Set start and end times');
        return;
      }
      const s = timeInputToHours(input.start);
      const e = timeInputToHours(input.end);
      if (s == null || e == null || e <= s) {
        showToast('Enter valid start and end times');
        return;
      }
      event = { ...base, s, e };
    }

    const final = withScheduleRange(event);
    if (persistEnabled && userIdRef.current) {
      upsertEvents(userIdRef.current, [final]).catch(() => showToast('Could not save event'));
      setDbEvents((prev) => [...prev, final]);
    } else {
      setImportedEvents((prev) => [...prev, final]);
    }

    setAddEventKind(null);
    showToast(`✓ Added ${KIND_LABEL[final.k].toLowerCase()}`);
  }, [courseMap, persistEnabled, showToast]);

  const openAddEvent = useCallback((kind: ManualAddKind) => {
    setAddMenu(false);
    setAddEventKind(kind);
  }, []);

  const closeAddEvent = useCallback(() => setAddEventKind(null), []);

  const buildPreview = useCallback(() => {
    const result = parseCourseImport(pasteText);
    const primary = result.courses[0];
    setImportPreview({
      courses: result.courses,
      summary: {
        totalCourses: result.summary.totalCourses,
        classMeetings: result.summary.classMeetings,
        assignments: result.summary.assignments,
        exams: result.summary.exams,
        quizzes: result.summary.quizzes,
        readings: result.summary.readings,
        totalEvents: result.summary.totalEvents,
      },
      errors: result.errors,
      primaryLabel: primary ? `${primary.code} · ${primary.name}` : '',
      courseBreakdown: result.courses.map((c) => ({
        code: c.code,
        eventCount: result.events.filter((e) => e.c === c.id).length,
      })),
    });
    if (result.courses.length > 0 && result.events.length > 0) {
      setCourseStage('preview');
    } else {
      showToast(result.errors[0] || 'Could not parse course information');
    }
  }, [pasteText, showToast]);

  const commitImport = useCallback(async () => {
    const result = parseCourseImport(pasteText);
    if (result.courses.length === 0 || result.events.length === 0) {
      showToast(result.errors[0] || 'Could not parse course information');
      return;
    }

    const nextHidden: Record<string, boolean> = { ...hidden };

    if (persistEnabled && userIdRef.current) {
      try {
        await replaceImportedCalendar(userIdRef.current, result.courses, result.events, nextHidden);
        const clubs = dbCourses.filter((c) => c.club && !result.courses.some((x) => x.id === c.id));
        const clubEvents = dbEvents.filter((e) => clubs.some((c) => c.id === e.c));
        setDbCourses([...result.courses, ...clubs]);
        setDbEvents([...result.events, ...clubEvents]);
        setHidden(nextHidden);
        setSyncOk(true);
        setSyncError(null);
      } catch {
        showToast('Could not save import to Supabase');
        return;
      }
    } else {
      setImportedCourses(result.courses);
      setImportedEvents(result.events);
      setHidden(nextHidden);
    }

    const n = result.events.length;
    const label = result.courses.length === 1 ? result.courses[0].code : `${result.courses.length} courses`;
    closeCourseModal();
    showToast(`✓ ${n} events added from ${label}`);
  }, [pasteText, hidden, persistEnabled, dbCourses, dbEvents, closeCourseModal, showToast]);

  useEffect(() => {
    if (persistEnabled || isSupabaseConfigured) return;
    saveLocalCalendar({
      courses: importedCourses.filter((c) => !deletedCourseIds[c.id]),
      events: importedEvents
        .concat(extra)
        .filter((e) => !deletedIds[e.id] && !deletedCourseIds[e.c]),
      hidden,
      done,
      deletedCourseIds,
      view,
      kind,
    });
  }, [
    persistEnabled,
    importedCourses,
    importedEvents,
    extra,
    hidden,
    done,
    deletedCourseIds,
    deletedIds,
    view,
    kind,
  ]);

  return {
    loading,
    syncError,
    remote,
    persistEnabled,
    view,
    setView,
    kind,
    setKind,
    hidden,
    toggleHidden,
    addMenu,
    setAddMenu,
    addEventKind,
    openAddEvent,
    closeAddEvent,
    createEvent,
    createCourse,
    detail,
    setDetail,
    courseModal,
    setCourseModal: openCourseModal,
    courseStage,
    setCourseStage,
    pasteText,
    setPasteText,
    importPreview,
    buildPreview,
    commitImport,
    closeCourseModal,
    duey,
    setDuey: openBeezy,
    closeBeezy: () => setDuey(false),
    toast,
    showToast,
    added,
    rail,
    setRail,
    done,
    toggleDone,
    chat,
    ask,
    events,
    visibleEvents,
    courses,
    courseMap,
    courseManage,
    openCourseManage,
    closeCourseManage,
    deletedCourseIds,
    openEvent,
    addStudy,
    deleteEvent,
    deleteCourse,
    updateEvent,
    updateCourse,
    updateCourseColor,
    updateCourseSchedule,
    markDetailComplete,
    toggleDetailComplete,
    retrySync,
    anchorDate,
    weekStart,
    monthStart,
    days,
    periodLabel,
    goPrev,
    goNext,
    goToday,
    canNavigate,
  };
}

function formatTime(h: number): string {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return h12 + (m ? ':' + String(m).padStart(2, '0') : ':00') + ' ' + ap;
}
