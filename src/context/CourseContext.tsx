import { createContext, useContext } from 'react';
import type { Course } from '../types';
export const CourseContext = createContext<Record<string, Course>>({});

export function useCourseMap(): Record<string, Course> {
  return useContext(CourseContext);
}
