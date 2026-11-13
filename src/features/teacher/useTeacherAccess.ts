import { useQuery } from '@tanstack/react-query';
import { listMyClassrooms } from '@/lib/api/attendance';
import type { TeacherClassroom } from '@/types/attendance';

/**
 * Splits a teacher's classes by the role the server gave them: class teacher of at most one class (full access),
 * lecturer of the others (assessments only). The UI mirrors, never replaces, the server's authorization.
 */
export function splitTeacherClassrooms(entries: TeacherClassroom[] | undefined) {
  const classTeacherOf = entries?.find((e) => e.role === 'CLASS_TEACHER');
  const lecturerOf = (entries ?? []).filter((e) => e.role === 'LECTURER');
  return { classTeacherOf, lecturerOf };
}

export function useTeacherClassroomAccess() {
  const query = useQuery({ queryKey: ['my-classrooms'], queryFn: listMyClassrooms });
  return { ...splitTeacherClassrooms(query.data), isLoading: query.isLoading };
}
