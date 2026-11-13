import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAllWaiverRequests,
  reviewWaiverRequest,
  triggerAccrueLateFees,
  triggerGenerateInvoices,
  triggerRunPayroll,
} from '@/lib/api/payments';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { WaiverRequest } from '@/types/payment';
import { SkeletonTable } from '@/components/ui/Skeleton';

function WaiverReviewRow({ waiver }: { waiver: WaiverRequest }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => reviewWaiverRequest(waiver.id, status, note || undefined),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['all-waivers'] });
      toast.success(t(`platformPay.waiverToast.${updated.status}`));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('platformPay.reviewFailed'))),
  });

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium text-slate-900">
          {t('platformPay.waiverRef', { invoice: waiver.feeInvoiceId, parent: waiver.parentId, school: waiver.schoolId })}
        </p>
        <Badge tone={waiver.status === 'PENDING' ? 'warning' : waiver.status === 'APPROVED' ? 'success' : 'danger'}>
          {t(`platformPay.waiverStatus.${waiver.status}`)}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-600">{waiver.reason}</p>
      {waiver.status === 'PENDING' ? (
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('platformPay.notePlaceholder')}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <Button isLoading={mutation.isPending} onClick={() => mutation.mutate('APPROVED')}>
            {t('platformPay.approve')}
          </Button>
          <Button variant="danger" isLoading={mutation.isPending} onClick={() => mutation.mutate('REJECTED')}>
            {t('platformPay.reject')}
          </Button>
        </div>
      ) : (
        waiver.reviewNote && <p className="mt-1 text-sm text-slate-500">{t('platformPay.reviewNote', { note: waiver.reviewNote })}</p>
      )}
    </li>
  );
}

export function PlatformAdminPaymentsPage() {
  const { t } = useTranslation();
  const { data: waivers, isLoading } = useQuery({ queryKey: ['all-waivers'], queryFn: listAllWaiverRequests });

  const generateInvoicesMutation = useMutation({
    mutationFn: triggerGenerateInvoices,
    onSuccess: () => toast.success(t('platformPay.invoicesRun')),
    onError: (error) => toast.error(backendErrorMessage(error, t('platformPay.invoicesFailed'))),
  });
  const accrueLateFeesMutation = useMutation({
    mutationFn: triggerAccrueLateFees,
    onSuccess: () => toast.success(t('platformPay.lateFeesRun')),
    onError: (error) => toast.error(backendErrorMessage(error, t('platformPay.lateFeesFailed'))),
  });
  const runPayrollMutation = useMutation({
    mutationFn: triggerRunPayroll,
    onSuccess: () => toast.success(t('platformPay.payrollRun')),
    onError: (error) => toast.error(backendErrorMessage(error, t('platformPay.payrollFailed'))),
  });

  const pendingWaivers = waivers?.filter((w) => w.status === 'PENDING') ?? [];
  const reviewedWaivers = waivers?.filter((w) => w.status !== 'PENDING') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('platformPay.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('platformPay.billingJobs')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('platformPay.billingHint')}
          </p>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button variant="secondary" isLoading={generateInvoicesMutation.isPending} onClick={() => generateInvoicesMutation.mutate()}>
            {t('platformPay.generateInvoices')}
          </Button>
          <Button variant="secondary" isLoading={accrueLateFeesMutation.isPending} onClick={() => accrueLateFeesMutation.mutate()}>
            {t('platformPay.runLateFees')}
          </Button>
          <Button variant="secondary" isLoading={runPayrollMutation.isPending} onClick={() => runPayrollMutation.mutate()}>
            {t('platformPay.runPayroll')}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('platformPay.waiverRequests')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t('platformPay.waiverHint')}</p>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={4} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {pendingWaivers.map((waiver) => (
              <WaiverReviewRow key={waiver.id} waiver={waiver} />
            ))}
            {pendingWaivers.length === 0 && <p className="py-3 text-sm text-slate-500">{t('platformPay.noPending')}</p>}
          </ul>
          {reviewedWaivers.length > 0 && (
            <>
              <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('platformPay.previouslyReviewed')}</p>
              <ul className="flex flex-col divide-y divide-slate-100">
                {reviewedWaivers.map((waiver) => (
                  <WaiverReviewRow key={waiver.id} waiver={waiver} />
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
