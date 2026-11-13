import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGrievance, updateGrievanceStatus } from '@/lib/api/grievances';
import { backendErrorMessage } from '@/lib/errorMessage';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GrievanceStatusBadge } from '@/components/grievance/GrievanceStatusBadge';
import type { Grievance, GrievanceStatus } from '@/types/grievance';
import { grievanceTypeLabel } from './grievanceLabels';

const STATUSES: GrievanceStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function StatusForm({ grievance, onSaved }: { grievance: Grievance; onSaved: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GrievanceStatus>(grievance.status === 'OPEN' ? 'IN_PROGRESS' : grievance.status);
  const [note, setNote] = useState(grievance.resolutionNote ?? '');
  const mutation = useMutation({
    mutationFn: () => updateGrievanceStatus(grievance.id, status, note.trim() || undefined),
    onSuccess: () => {
      toast.success(t('grievances.updated'));
      onSaved();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('grievances.updateFailed'))),
  });
  return (
    <form
      className="flex flex-col gap-3 border-t border-slate-200 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Select label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value as GrievanceStatus)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`enums.grievanceStatus.${s}`)}
          </option>
        ))}
      </Select>
      <Input
        label={t('grievances.responseNote')}
        value={note}
        placeholder={t('grievances.responsePlaceholder')}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" isLoading={mutation.isPending} className="self-start">
        {t('common.save')}
      </Button>
    </form>
  );
}

interface Props {
  grievanceId: number | null;
  onClose: () => void;
  /** Route prefix for the complainant link. */
  complainantBase: string;
  invalidateKey: readonly unknown[];
}

/** Full grievance text, linked records and status timeline; admins can update the status here. */
export function GrievanceDetailDrawer({ grievanceId, onClose, complainantBase, invalidateKey }: Props) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const queryClient = useQueryClient();
  const { data: g, isLoading } = useQuery({
    queryKey: ['grievance', grievanceId],
    queryFn: () => getGrievance(grievanceId!),
    enabled: grievanceId != null,
  });

  return (
    <Drawer open={grievanceId != null} onClose={onClose} title={t('grievances.detailTitle')}>
      {isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {g && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold text-slate-900">{g.subject}</p>
            <GrievanceStatusBadge status={g.status} />
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{g.description}</p>
          <dl className="grid grid-cols-2 gap-3">
            <Field label={t('grievances.col.type')}>{grievanceTypeLabel(t, g)}</Field>
            <Field label={t('grievances.col.school')}>{g.schoolName ?? '—'}</Field>
            <Field label={t('grievances.col.complainant')}>
              {g.complainantName ? (
                <Link className="font-medium text-primary-text underline" to={`${complainantBase}/${g.raisedByUserId}`}>
                  {g.complainantName}
                </Link>
              ) : (
                g.raisedByEmail
              )}
            </Field>
            <Field label={t('grievances.col.role')}>{t(`enums.role.${g.raisedByRole}`, { defaultValue: g.raisedByRole })}</Field>
            <Field label={t('grievances.col.driver')}>{g.driverName ?? '—'}</Field>
            <Field label={t('grievances.col.vehicle')}>{g.vehicleNo ?? '—'}</Field>
            <Field label={t('grievances.child')}>{g.childName ?? '—'}</Field>
            <Field label={t('grievances.col.raised')}>{formatDateTime(g.createdAt, locale)}</Field>
            <Field label={t('grievances.col.daysOpen')}>{t('common.daysOpen', { count: g.daysOpen ?? 0 })}</Field>
          </dl>

          <section aria-label={t('grievances.timeline')}>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('grievances.timeline')}</h3>
            {g.timeline && g.timeline.length > 0 ? (
              <ol className="flex flex-col gap-2 border-l-2 border-slate-200 pl-4">
                {g.timeline.map((entry, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <GrievanceStatusBadge status={entry.status} />
                      <span className="text-xs text-slate-500">{formatDateTime(entry.at, locale)}</span>
                    </div>
                    {entry.note && <p className="mt-1 text-slate-700">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">{t('grievances.noTimeline')}</p>
            )}
          </section>

          <StatusForm
            key={`${g.id}-${g.status}-${g.updatedAt}`}
            grievance={g}
            onSaved={() => {
              void queryClient.invalidateQueries({ queryKey: ['grievance', g.id] });
              void queryClient.invalidateQueries({ queryKey: [...invalidateKey] });
            }}
          />
        </div>
      )}
    </Drawer>
  );
}
