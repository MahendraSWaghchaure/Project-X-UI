import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import type { Arrival } from '@/types/attendance';
import { alertReason } from './alertReason';

/**
 * The reason line for an ALERT arrival plus, for school staff only, the parent's note.
 * Staff screens render this; the driver screen deliberately does not (the backend also strips
 * parentNote from driver payloads).
 */
export function ArrivalAlertDetail({
  arrival,
}: {
  arrival: Pick<Arrival, 'outcome' | 'schoolConfirm' | 'parentResponse' | 'parentNote'> | null;
}) {
  const { t } = useTranslation();
  if (!arrival) return null;
  const note = arrival.parentNote?.trim();
  const isAlert = arrival.outcome === 'ALERT';
  if (!isAlert && !note) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {isAlert && (
        <p data-testid="alert-reason" className="flex items-start gap-1.5 text-xs font-semibold text-alert-700">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t(`arrival.alertReason.${alertReason(arrival)}`)}
        </p>
      )}
      {note && (
        <p className={isAlert ? 'ml-5 text-xs text-slate-700' : 'text-xs text-slate-700'}>
          <span className="font-semibold">{t('arrival.parentNote')}:</span>{' '}
          <span className="whitespace-pre-wrap break-words">{note}</span>
        </p>
      )}
    </div>
  );
}
