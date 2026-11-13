import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, ClipboardList, Lock, SendHorizonal } from 'lucide-react';
import {
  createCorrectionRequest,
  getAttendanceSheet,
  listCorrectionRequests,
  listSchoolArrivals,
  saveAttendanceBulk,
} from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { todayIst } from '@/lib/dates';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ArrivalOutcomeChip } from '@/components/ui/StatusChip';
import { ArrivalAlertDetail } from '@/components/arrivals/ArrivalAlertDetail';
import { SubscriptionBadge } from './components/SubscriptionBadge';
import type { Arrival, AttendanceRow, AttendanceStatus } from '@/types/attendance';

const CORRECTION_STATUS_TONE: Record<string, BadgeTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

const correctionSchema = z.object({
  requestedStatus: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  reason: z.string().trim().min(1, 'validation.required').max(500),
});
type CorrectionFormValues = z.infer<typeof correctionSchema>;

/** Teacher-only: ask the school admin to change an already-submitted row instead of editing it directly (C3). */
function RequestChangeModal({
  schoolId,
  classroomId,
  date,
  row,
  onClose,
}: {
  schoolId: number;
  classroomId: number;
  date: string;
  row: AttendanceRow | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const err = (m?: string) => (m ? t(m) : undefined);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionFormValues>({ resolver: zodResolver(correctionSchema), defaultValues: { requestedStatus: 'PRESENT', reason: '' } });

  useEffect(() => {
    if (row) reset({ requestedStatus: row.status === 'PRESENT' ? 'ABSENT' : 'PRESENT', reason: '' });
  }, [row, reset]);

  const mutation = useMutation({
    mutationFn: (values: CorrectionFormValues) =>
      createCorrectionRequest(schoolId, { classroomId, date, studentId: row!.studentId, requestedStatus: values.requestedStatus, reason: values.reason }),
    onSuccess: () => {
      toast.success(t('sheet.correction.submitted'));
      void queryClient.invalidateQueries({ queryKey: ['correction-requests', schoolId] });
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('sheet.correction.submitFailed'))),
  });

  return (
    <Modal open={row !== null} onClose={onClose} title={t('sheet.correction.requestTitle', { name: row?.name ?? '' })}>
      {row && (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">{t('sheet.correction.currentStatus', { status: t(`sheet.status.${row.status}`) })}</p>
          <Select label={t('sheet.correction.requestedStatus')} required {...register('requestedStatus')}>
            {(['PRESENT', 'ABSENT', 'LATE'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`sheet.status.${s}`)}
              </option>
            ))}
          </Select>
          <Textarea label={t('sheet.correction.reason')} required rows={3} error={err(errors.reason?.message)} {...register('reason')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
              <SendHorizonal className="h-4 w-4" />
              {t('sheet.correction.submit')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Teacher-only: their own recent correction requests with status, under the sheet. */
function MyCorrectionRequests({ schoolId, classroomId }: { schoolId: number; classroomId: number }) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const { data } = useQuery({
    queryKey: ['correction-requests', schoolId],
    queryFn: () => listCorrectionRequests(schoolId, { size: 50 }),
  });
  const rows = (data?.content ?? []).filter((r) => r.classroomId === classroomId);
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sheet.correction.yourRequests')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="flex flex-col divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <span className="font-semibold text-slate-900">{r.studentName ?? `#${r.studentId}`}</span>{' '}
                <span className="text-slate-500">
                  {r.date} &middot; {t(`sheet.status.${r.previousStatus ?? 'ABSENT'}`)} &rarr; {t(`sheet.status.${r.requestedStatus}`)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={CORRECTION_STATUS_TONE[r.status] ?? 'neutral'}>{t(`sheet.correction.status.${r.status}`)}</Badge>
                <span className="text-xs text-slate-400">{formatDateTime(r.createdAt, locale)}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE'];

const ACTIVE_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: 'border-safe-600 bg-safe-600 text-white',
  ABSENT: 'border-alert-600 bg-alert-600 text-white',
  LATE: 'border-pending-600 bg-pending-200 text-pending-700',
};

function StatusToggle({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string;
  value: AttendanceStatus | null;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('sheet.markFor', { name })} className="grid grid-cols-3 gap-1.5">
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          disabled={disabled}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={cn(
            'min-h-11 min-w-[4.25rem] rounded-md border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            value === status ? ACTIVE_CLASSES[status] : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50',
          )}
        >
          {t(`sheet.status.${status}`)}
        </button>
      ))}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number | string; tone?: 'safe' | 'pending' | 'alert' }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        tone === 'safe' && 'border-safe-200 bg-safe-50',
        tone === 'pending' && 'border-pending-200 bg-pending-50',
        tone === 'alert' && 'border-alert-200 bg-alert-50',
        !tone && 'border-slate-200 bg-surface',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          tone === 'safe' && 'text-safe-700',
          tone === 'pending' && 'text-pending-700',
          tone === 'alert' && 'text-alert-700',
          !tone && 'text-slate-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * One classroom's attendance sheet for a chosen day (default today): one-tap Present/Absent/Late, "mark all
 * present" for unmarked rows only, and a single idempotent bulk save. Used inside the classroom detail page.
 */
export function AttendanceSheet({ classroomId, canMark = true }: { classroomId: number; canMark?: boolean }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'PLATFORM_ADMIN';
  // C3: a TEACHER can no longer directly edit a row once it has a saved status - they must request a change;
  // SCHOOL_ADMIN/PLATFORM_ADMIN keep direct editing of every row.
  const isTeacher = role === 'TEACHER';
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIst());
  /** Unsaved changes only: studentId -> chosen status. Layered over the server's rows so live refetches (arrival chips) never wipe a teacher's in-progress marking. */
  const [edits, setEdits] = useState<Record<number, AttendanceStatus>>({});
  const [correctionRow, setCorrectionRow] = useState<AttendanceRow | null>(null);

  useEffect(() => setEdits({}), [date, classroomId]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['attendance-sheet', schoolId, date, classroomId],
    queryFn: () => getAttendanceSheet(schoolId!, date, classroomId),
    enabled: schoolId != null,
  });

  // Mismatched rows explain themselves (school absent vs parent dispute, plus the parent's note): the sheet only carries the outcome, so fetch the day's ALERT arrivals (admin-only endpoint).
  const { data: alertArrivals } = useQuery({
    queryKey: ['school-arrivals', schoolId, date, 'ALERT', 'attendance-sheet'],
    queryFn: () => listSchoolArrivals(schoolId!, { date, outcome: 'ALERT', page: 0, size: 100 }),
    enabled: schoolId != null && isAdmin,
    retry: false,
  });
  const alertByStudent = useMemo(() => {
    const map = new Map<number, Arrival>();
    for (const a of alertArrivals?.content ?? []) {
      if (a.studentId == null) continue;
      const existing = map.get(a.studentId);
      if (!existing || (!existing.parentNote && a.parentNote)) map.set(a.studentId, a);
    }
    return map;
  }, [alertArrivals]);

  // Arrival chips/mismatches change when drivers, parents or other teachers act: refetch, edits survive.
  useLiveTopic(
    [schoolId != null && isAdmin ? `/topic/school/${schoolId}/arrivals` : null],
    () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance-sheet', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['school-arrivals', schoolId] });
    },
    { refetchOnConnect: true },
  );

  const effectiveStatus = (row: AttendanceRow): AttendanceStatus | null => edits[row.studentId] ?? row.status;

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, unmarked: 0, mismatches: 0 };
    for (const row of rows ?? []) {
      const status = edits[row.studentId] ?? row.status;
      if (status) c[status]++;
      else c.unmarked++;
      if (row.arrival === 'ALERT') c.mismatches++;
    }
    return c;
  }, [rows, edits]);

  const editCount = Object.keys(edits).length;

  const saveMutation = useMutation({
    mutationFn: () =>
      saveAttendanceBulk(schoolId!, {
        date,
        classroomId,
        entries: Object.entries(edits).map(([studentId, status]) => ({ studentId: Number(studentId), status })),
      }),
    onSuccess: () => {
      toast.success(t('sheet.saved'));
      setEdits({});
      void queryClient.invalidateQueries({ queryKey: ['attendance-sheet', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classroom-summary', schoolId] });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('sheet.saveFailed'))),
  });

  function markAllPresent() {
    // Only fill the gaps: a saved ABSENT/LATE (or an edit already made this session) is never overwritten.
    setEdits((prev) => ({
      ...prev,
      ...Object.fromEntries(
        (rows ?? []).filter((r) => r.status == null && prev[r.studentId] == null).map((r) => [r.studentId, 'PRESENT' as const]),
      ),
    }));
  }

  const columns: DataColumn<AttendanceRow>[] = [
    { key: 'roll', header: t('students.rollNo'), cell: (r) => r.rollNo ?? '—', className: 'w-24' },
    {
      key: 'name',
      header: t('common.name'),
      primary: true,
      cell: (r) => (
        <div>
          <span className="font-semibold text-slate-900">{r.name}</span>
          {r.arrival === 'ALERT' && (
            <ArrivalAlertDetail
              arrival={alertByStudent.get(r.studentId) ?? { outcome: 'ALERT', schoolConfirm: 'PENDING', parentResponse: 'PENDING' }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'bus',
      header: t('students.subscription'),
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <SubscriptionBadge subscription={r.subscription} />
          {r.arrival && <ArrivalOutcomeChip outcome={r.arrival} size="sm" />}
        </div>
      ),
    },
    {
      key: 'mark',
      header: t('sheet.markColumn'),
      actions: true,
      cell: (r) => {
        // C3 (matches the real backend rule, see AttendanceService.bulk()): today's sheet stays freely re-editable
        // for a teacher (re-marking PRESENT -> ABSENT -> LATE the same day must keep working, same as Phase 2) -
        // only a PAST date's already-saved row is locked once a teacher tries to change it; admin always keeps
        // direct one-tap editing on any date.
        const locked = isTeacher && r.status != null && date < todayIst() && edits[r.studentId] == null;
        if (locked) {
          return (
            <div className="flex items-center gap-2">
              <Badge tone="neutral">
                <Lock className="mr-1 inline h-3 w-3" aria-hidden="true" />
                {t(`sheet.status.${r.status}`)}
              </Badge>
              <Button size="sm" variant="secondary" onClick={() => setCorrectionRow(r)}>
                {t('sheet.correction.requestChange')}
              </Button>
            </div>
          );
        }
        return (
          <StatusToggle
            name={r.name}
            value={effectiveStatus(r)}
            disabled={!canMark}
            onChange={(next) => setEdits((prev) => ({ ...prev, [r.studentId]: next }))}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={t('sheet.summaryLabel')} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label={t('sheet.status.PRESENT')} value={rows ? counts.PRESENT : '—'} tone="safe" />
        <SummaryTile label={t('sheet.status.ABSENT')} value={rows ? counts.ABSENT : '—'} />
        <SummaryTile label={t('sheet.status.LATE')} value={rows ? counts.LATE : '—'} tone="pending" />
        <SummaryTile label={t('sheet.unmarked')} value={rows ? counts.unmarked : '—'} />
        <SummaryTile label={t('sheet.mismatches')} value={rows ? counts.mismatches : '—'} tone={counts.mismatches > 0 ? 'alert' : undefined} />
      </section>

      <Card>
        <CardBody className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            {t('sheet.date')}
            <input
              type="date"
              value={date}
              max={todayIst()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="min-h-11 rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm"
            />
          </label>
          {canMark && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="lg" disabled={!rows || !rows.some((r) => r.status == null)} onClick={markAllPresent}>
                <CheckCheck className="h-5 w-5" />
                {t('sheet.markAllPresent')}
              </Button>
              <Button variant="accent" size="lg" isLoading={saveMutation.isPending} disabled={editCount === 0} onClick={() => saveMutation.mutate()}>
                {t('sheet.save')}
                {editCount > 0 && <span className="rounded-full bg-white/60 px-2 text-sm">{editCount}</span>}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <DataTable
        caption={t('sheet.title')}
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        getRowKey={(r) => r.studentId}
        empty={<EmptyState icon={ClipboardList} title={t('sheet.noStudentsTitle')} description={t('sheet.noStudentsBody')} />}
      />

      {isTeacher && schoolId != null && <MyCorrectionRequests schoolId={schoolId} classroomId={classroomId} />}
      {isTeacher && schoolId != null && (
        <RequestChangeModal schoolId={schoolId} classroomId={classroomId} date={date} row={correctionRow} onClose={() => setCorrectionRow(null)} />
      )}
    </div>
  );
}
