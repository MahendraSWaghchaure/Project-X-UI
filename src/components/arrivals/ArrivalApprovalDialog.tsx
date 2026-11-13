import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SafeArrivalStepper } from '@/components/arrivals/SafeArrivalStepper';
import { formatTime } from '@/lib/dates';
import type { Arrival } from '@/types/attendance';

export type ApprovalResponse = 'APPROVED' | 'DISPUTED';

interface ArrivalApprovalDialogProps {
  arrival: Arrival | null;
  /** How many other arrivals are waiting behind this one. */
  moreWaiting?: number;
  isSubmitting?: boolean;
  onRespond: (response: ApprovalResponse, note?: string) => void;
  /** "Decide later" - the arrival stays pending server-side and is reachable from My Children. */
  onClose: () => void;
}

/**
 * The parent's "did your child arrive safely?" prompt. Presentational: the app-wide container
 * (ParentArrivalApproval) owns fetching, live updates and the mutation.
 */
export function ArrivalApprovalDialog({ arrival, moreWaiting = 0, isSubmitting, onRespond, onClose }: ArrivalApprovalDialogProps) {
  const { t } = useTranslation();
  const messageId = useId();
  // Key the note to the arrival so a half-typed note never leaks onto the next child's prompt.
  const [note, setNote] = useState('');
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const currentNote = noteFor === arrival?.id ? note : '';

  if (!arrival) return null;

  const respond = (response: ApprovalResponse) => onRespond(response, currentNote.trim() || undefined);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('approval.title')}
      descriptionId={messageId}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="danger" size="lg" disabled={isSubmitting} onClick={() => respond('DISPUTED')}>
            {t('approval.wrong')}
          </Button>
          <Button variant="safe" size="lg" disabled={isSubmitting} isLoading={isSubmitting} onClick={() => respond('APPROVED')}>
            {t('approval.safe')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p id={messageId} className="text-base text-slate-800">
          {t(`approval.message.${arrival.kind}`, { name: arrival.childName, time: formatTime(arrival.driverEventAt) })}
        </p>
        <SafeArrivalStepper arrival={arrival} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {t('approval.noteLabel')}
          <textarea
            rows={2}
            maxLength={500}
            value={currentNote}
            onChange={(e) => {
              setNoteFor(arrival.id);
              setNote(e.target.value);
            }}
            placeholder={t('approval.notePlaceholder')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{moreWaiting > 0 ? t('approval.moreWaiting', { count: moreWaiting }) : ''}</span>
          <button type="button" onClick={onClose} className="min-h-11 px-2 font-semibold text-slate-600 underline">
            {t('approval.later')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
