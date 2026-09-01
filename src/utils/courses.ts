import type { Course } from '../types';

export const COURSE_COLORS: { hex: string; rgb: string }[] = [
  { hex: '#6E5BD8', rgb: '110,91,216' },
  { hex: '#2F87C4', rgb: '47,135,196' },
  { hex: '#3F9366', rgb: '63,147,102' },
  { hex: '#C97F2E', rgb: '201,127,46' },
  { hex: '#BC5A82', rgb: '188,90,130' },
  { hex: '#2E8E85', rgb: '46,142,133' },
  { hex: '#8B6BB8', rgb: '139,107,184' },
  { hex: '#D95542', rgb: '217,85,66' },
  { hex: '#5C6BC0', rgb: '92,107,192' },
  { hex: '#E07A5F', rgb: '224,122,95' },
  { hex: '#4A7C59', rgb: '74,124,89' },
  { hex: '#9B5DE5', rgb: '155,93,229' },
];

const PALETTE = COURSE_COLORS;

export function hexToRgbString(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '110,91,216';
  return `${r},${g},${b}`;
}

export function courseColorFromHex(hex: string): { hex: string; rgb: string } {
  const match = COURSE_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase());
  if (match) return match;
  return { hex, rgb: hexToRgbString(hex) };
}

export function slugFromCourseCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'course';
}

export function buildCourse(code: string, name: string, index: number, idSuffix?: number): Course {
  const color = PALETTE[index % PALETTE.length];
  const baseId = slugFromCourseCode(code);
  const id = idSuffix && idSuffix > 1 ? `${baseId}${idSuffix}` : baseId;
  return {
    id,
    code: code.trim(),
    name: name.trim() || code.trim(),
    hex: color.hex,
    rgb: color.rgb,
  };
}

export function uniqueCourseId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) {
    used.add(baseId);
    return baseId;
  }
  let n = 2;
  while (used.has(`${baseId}${n}`)) n++;
  const id = `${baseId}${n}`;
  used.add(id);
  return id;
}

export function mergeCourseMaps(
  base: Record<string, Course>,
  imported: Course[]
): Record<string, Course> {
  const out = { ...base };
  for (const c of imported) out[c.id] = c;
  return out;
}

export function getCourse(
  cmap: Record<string, Course>,
  id: string,
  fallbackCode?: string
): Course {
  return (
    cmap[id] ?? {
      id,
      code: fallbackCode ?? id,
      name: fallbackCode ?? id,
      hex: '#6E5BD8',
      rgb: '110,91,216',
    }
  );
}
