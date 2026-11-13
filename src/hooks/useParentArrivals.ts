import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listMyPendingArrivals, respondToArrival } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import type { ApprovalResponse } from '@/components/arrivals/ArrivalApprovalDialog';

export const PENDING_ARRIVALS_KEY = ['parent-pending-arrivals'] as const;

/** Arrivals awaiting THIS parent's approval: fetched on load, refetched on every live /topic/parent/{userId}/arrivals frame. */
export function usePendingArrivals() {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: PENDING_ARRIVALS_KEY,
    queryFn: listMyPendingArrivals,
    retry: false,
  });
  // refetchOnConnect: an arrival that landed while the socket was down must still surface the approval prompt.
  useLiveTopic(
    [userId != null ? `/topic/parent/${userId}/arrivals` : null],
    () => {
      queryClient.invalidateQueries({ queryKey: PENDING_ARRIVALS_KEY });
    },
    { refetchOnConnect: true },
  );
  return query;
}

export function useRespondToArrival(onDone?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arrivalId, response, note }: { arrivalId: number; response: ApprovalResponse; note?: string }) =>
      respondToArrival(arrivalId, { response, note }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: PENDING_ARRIVALS_KEY });
      toast.success(vars.response === 'APPROVED' ? t('approval.thanksSafe') : t('approval.thanksWrong'));
      onDone?.();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('approval.failed'))),
  });
}
