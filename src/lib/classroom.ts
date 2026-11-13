import type { Classroom } from '@/types/attendance';

/** "5-A", or just "5" when the classroom has no section (section is optional server-side). */
export function classroomLabel(c: Pick<Classroom, 'name' | 'section'>): string {
  return c.section ? `${c.name}-${c.section}` : c.name;
}
