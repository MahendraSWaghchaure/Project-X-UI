import { useState } from 'react';
import { usePendingArrivals, useRespondToArrival } from '@/hooks/useParentArrivals';
import { ArrivalApprovalDialog } from '@/components/arrivals/ArrivalApprovalDialog';

/**
 * Mounted once in AppShell for PARENT users so the approval prompt appears on whatever screen the
 * parent is on - not only on "My Children". "Decide later" hides an arrival for this session only;
 * it stays pending on the server and reappears on the next page load.
 */
export function ParentArrivalApproval() {
  const { data: pending } = usePendingArrivals();
  const [dismissed, setDismissed] = useState<number[]>([]);
  const respond = useRespondToArrival();

  const queue = (pending ?? []).filter((a) => a.parentResponse === 'PENDING' && !dismissed.includes(a.id));
  const current = queue[0] ?? null;

  return (
    <ArrivalApprovalDialog
      arrival={current}
      moreWaiting={Math.max(0, queue.length - 1)}
      isSubmitting={respond.isPending}
      onRespond={(response, note) => current && respond.mutate({ arrivalId: current.id, response, note })}
      onClose={() => current && setDismissed((d) => [...d, current.id])}
    />
  );
}
