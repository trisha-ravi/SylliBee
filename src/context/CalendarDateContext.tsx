import { createContext, useContext } from 'react';
import type { ViewMode } from '../types';
import type { DayDescriptor } from '../utils/dates';

export interface CalendarDateContextValue {
  anchorDate: Date;
  weekStart: Date;
  monthStart: Date;
  days: DayDescriptor[];
  view: ViewMode;
  periodLabel: string;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  canNavigate: boolean;
}

export const CalendarDateContext = createContext<CalendarDateContextValue | null>(null);

export function useCalendarDates(): CalendarDateContextValue {
  const ctx = useContext(CalendarDateContext);
  if (!ctx) throw new Error('useCalendarDates must be used within CalendarDateContext');
  return ctx;
}
