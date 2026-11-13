import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { decideCorrectionRequest, listCorrectionRequests } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { toast } from '@/lib/toastStore';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import type { CorrectionRequest, CorrectionStatus } from '@/types/attendance';

const STATUS_TONE: Record<string, BadgeTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
type Tab = 'ALL' | CorrectionStatus;

function RejectModal({ request, onClose }: { request: CorrectionRequest | null; onClose: () => void }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: () => decideCorrectionRequest(schoolId!, request!.id, { decision: 'REJECT', note: note.trim() }),
    onSuccess: () => {
      toast.success(t('sheet.correction.decided'));
      void queryClient.invalidateQueries({ queryKey: ['correction-requests-queue', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['correction-requests', schoolId] });
      onClose();
      setNote('');
      setTouched(false);
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('sheet.correction.decideFailed'))),
  });

  const missing = touched && note.trim().length === 0;
  return (
    <Modal open={request !== null} onClose={onClose} title={t('sheet.correction.reject')}>
      {request && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (note.trim().length > 0) mutation.mutate();
          }}
        >
          <Textarea
            label={t('sheet.correction.rejectNote')}
            required
            rows={3}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            error={missing ? t('sheet.correction.rejectNoteRequired') : undefined}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="danger" isLoading={mutation.isPending}>
              {t('sheet.correction.reject')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** School admin: approve/reject attendance correction requests teachers submitted for already-locked rows (C3). */
export function CorrectionRequestsPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [rejecting, setRejecting] = useState<CorrectionRequest | null>(null);
  const status = tab === 'ALL' ? undefined : tab;

  const { data, isLoading } = useQuery({
    queryKey: ['correction-requests-queue', schoolId, status],
    queryFn: () => listCorrectionRequests(schoolId!, { status, size: 100 }),
    enabled: schoolId != null,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => decideCorrectionRequest(schoolId!, id, { decision: 'APPROVE' }),
    onSuccess: () => {
      toast.success(t('sheet.correction.decided'));
      void queryClient.invalidateQueries({ queryKey: ['correction-requests-queue', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['correction-requests', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sheet', schoolId] });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('sheet.correction.decideFailed'))),
  });

  const columns: DataColumn<CorrectionRequest>[] = [
    {
      key: 'student',
      header: t('common.name'),
      primary: true,
      cell: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.studentName ?? `#${r.studentId}`}</p>
          <p className="text-xs text-slate-500">{r.classroomName ?? `#${r.classroomId}`}</p>
        </div>
      ),
    },
    { key: 'date', header: t('common.date'), cell: (r) => r.date },
    {
      key: 'change',
      header: t('sheet.correction.requestedStatus'),
      cell: (r) => (
        <span>
          {t(`sheet.status.${r.previousStatus ?? 'ABSENT'}`)} &rarr; <span className="font-semibold">{t(`sheet.status.${r.requestedStatus}`)}</span>
        </span>
      ),
    },
    { key: 'reason', header: t('sheet.correction.reason'), cell: (r) => <span className="text-sm text-slate-600">{r.reason}</span> },
    { key: 'status', header: t('common.status'), cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`sheet.correction.status.${r.status}`)}</Badge> },
    { key: 'created', header: t('common.date'), cell: (r) => formatDateTime(r.createdAt, locale) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" isLoading={approveMutation.isPending && approveMutation.variables === r.id} onClick={() => approveMutation.mutate(r.id)}>
              {t('sheet.correction.approve')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejecting(r)}>
              {t('sheet.correction.reject')}
            </Button>
          </div>
        ) : (
          r.decisionNote && <span className="text-xs text-slate-500">{r.decisionNote}</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('sheet.correction.queueTitle')} subtitle={t('sheet.correction.queueSubtitle')} />
      <Tabs
        label={t('sheet.correction.queueTitle')}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'PENDING', label: t('sheet.correction.status.PENDING') },
          { id: 'APPROVED', label: t('sheet.correction.status.APPROVED') },
          { id: 'REJECTED', label: t('sheet.correction.status.REJECTED') },
          { id: 'ALL', label: t('sheet.correction.filterAll') },
        ]}
      />
      <DataTable
        caption={t('sheet.correction.queueTitle')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(r) => r.id}
        empty={<EmptyState icon={ClipboardCheck} title={t('sheet.correction.emptyTitle')} description={t('sheet.correction.emptyBody')} />}
      />
      <RejectModal request={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}
