import type { Arrival } from '@/types/attendance';

export type AlertReason = 'SCHOOL_ABSENT' | 'PARENT_DISPUTED' | 'BOTH' | 'UNKNOWN';

/** Why an arrival is an ALERT: the school said absent, the parent disputed, or both. Never claims a school disagreement when only the parent disputed. */
export function alertReason(arrival: Pick<Arrival, 'schoolConfirm' | 'parentResponse'>): AlertReason {
  const school = arrival.schoolConfirm === 'ABSENT';
  const parent = arrival.parentResponse === 'DISPUTED';
  if (school && parent) return 'BOTH';
  if (school) return 'SCHOOL_ABSENT';
  if (parent) return 'PARENT_DISPUTED';
  return 'UNKNOWN';
}
