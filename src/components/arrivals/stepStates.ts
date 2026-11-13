import type { Arrival } from '@/types/attendance';

export type StepState = 'done' | 'pending' | 'alert';

export interface StepperArrival {
  kind: Arrival['kind'];
  schoolConfirm: Arrival['schoolConfirm'];
  parentResponse: Arrival['parentResponse'];
}

/** Maps the three independent confirmations of an Arrival onto the stepper's three steps. */
export function stepStates(arrival: StepperArrival): [StepState, StepState, StepState] {
  const school: StepState =
    arrival.schoolConfirm === 'PRESENT' ? 'done' : arrival.schoolConfirm === 'ABSENT' ? 'alert' : 'pending';
  const parent: StepState =
    arrival.parentResponse === 'APPROVED' ? 'done' : arrival.parentResponse === 'DISPUTED' ? 'alert' : 'pending';
  // Step 1 exists only because the driver recorded the event, so it is always done.
  return ['done', school, parent];
}
