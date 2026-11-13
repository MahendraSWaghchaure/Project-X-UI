import type { ConsentStatus, InviteStatus, Student, Teacher } from '@/types/attendance';

/** What the roster knows about a student's consent: older servers only send the boolean. */
export function consentStatusOf(student: Pick<Student, 'consentStatus' | 'marketingConsent'>): ConsentStatus {
  return student.consentStatus ?? (student.marketingConsent ? 'GRANTED' : 'NOT_REQUESTED');
}

/** Prefer the explicit inviteStatus; older servers only send `status`. */
export function inviteStatusOf(teacher: Pick<Teacher, 'inviteStatus' | 'status'>): InviteStatus {
  if (teacher.inviteStatus) return teacher.inviteStatus;
  return teacher.status === 'ACTIVE' ? 'ACTIVE' : 'INVITED';
}
