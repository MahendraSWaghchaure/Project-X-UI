import { useQuery } from '@tanstack/react-query';
import { listMyClassrooms } from '@/lib/api/attendance';
import { splitTeacherClassrooms } from '@/features/teacher/useTeacherAccess';
import type { Role } from '@/types/auth';

/**
 * Single source of truth for every role's sidebar. `labelKey` is an i18n key under `nav.`.
 * `group` (optional, also an i18n key under `nav.group.`) lets the shell render a collapsible /
 * headed section (e.g. Transport); a shell that ignores it can simply render the flat list.
 */
export interface NavItem {
  /** Deprecated: pre-i18n literal label, kept only so older shell code that reads `item.label` still type-checks. Always unset. */
  label?: string;
  labelKey: string;
  to: string;
  group?: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PLATFORM_ADMIN: [
    { labelKey: 'dashboard', to: '/platform-admin/dashboard' },
    { labelKey: 'schools', to: '/platform-admin/schools' },
    { labelKey: 'grievances', to: '/platform-admin/grievances' },
    { labelKey: 'payments', to: '/platform-admin/payments' },
    { labelKey: 'leads', to: '/platform-admin/leads' },
    { labelKey: 'inquiries', to: '/platform-admin/inquiries' },
    { labelKey: 'partners', to: '/platform-admin/partners' },
  ],
  SCHOOL_ADMIN: [
    { labelKey: 'dashboard', to: '/school-admin/dashboard' },
    { labelKey: 'classrooms', to: '/school-admin/classrooms' },
    { labelKey: 'teachers', to: '/school-admin/teachers' },
    { labelKey: 'vehicles', to: '/school-admin/vehicles', group: 'transport' },
    { labelKey: 'drivers', to: '/school-admin/drivers', group: 'transport' },
    { labelKey: 'routes', to: '/school-admin/routes', group: 'transport' },
    { labelKey: 'trips', to: '/school-admin/trips', group: 'transport' },
    { labelKey: 'riders', to: '/school-admin/children', group: 'transport' },
    { labelKey: 'arrivals', to: '/school/arrivals', group: 'transport' },
    { labelKey: 'correctionRequests', to: '/school-admin/attendance/corrections' },
    { labelKey: 'timetable', to: '/school-admin/timetable' },
    { labelKey: 'grievances', to: '/school-admin/grievances' },
  ],
  TEACHER: [
    { labelKey: 'dashboard', to: '/teacher/dashboard' },
    { labelKey: 'myClass', to: '/teacher/class' },
    { labelKey: 'myPeriods', to: '/teacher/periods' },
    { labelKey: 'exams', to: '/teacher/exams' },
    { labelKey: 'alerts', to: '/teacher/alerts' },
  ],
  DRIVER: [
    { labelKey: 'dashboard', to: '/driver/dashboard' },
    { labelKey: 'todaysTrips', to: '/driver/trips' },
    { labelKey: 'grievances', to: '/driver/grievances' },
    { labelKey: 'payroll', to: '/driver/payroll' },
  ],
  PARENT: [
    { labelKey: 'dashboard', to: '/parent/dashboard' },
    { labelKey: 'trackBus', to: '/parent/track' },
    { labelKey: 'myChildren', to: '/parent/children' },
    { labelKey: 'notifications', to: '/parent/notifications' },
    { labelKey: 'myProfile', to: '/parent/profile' },
    { labelKey: 'grievances', to: '/parent/grievances' },
    { labelKey: 'payments', to: '/parent/payments' },
  ],
};

/**
 * The sidebar for a role. For teachers, "My Class" only appears for a class teacher and "Exams" only for someone who
 * lectures at least one class (both shown until the server has answered, so the menu does not flicker).
 */
export function useNavItems(role: Role | null): NavItem[] {
  const isTeacher = role === 'TEACHER';
  const { data } = useQuery({ queryKey: ['my-classrooms'], queryFn: listMyClassrooms, enabled: isTeacher });
  if (!role) return [];
  const items = NAV_BY_ROLE[role];
  if (!isTeacher || !data) return items;
  const { classTeacherOf, lecturerOf } = splitTeacherClassrooms(data);
  return items.filter((i) => (i.labelKey === 'myClass' ? !!classTeacherOf : i.labelKey === 'exams' ? lecturerOf.length > 0 : true));
}
