import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Landmark } from 'lucide-react';
import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteMyBankDetails, getMyBankDetails, listMyPayroll, upsertMyBankDetails } from '@/lib/api/payments';
import { formatDateTime, maskAccount, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTable } from '@/components/ui/Skeleton';
import type { BankDetail, PayrollRecord } from '@/types/payment';

const schema = z.object({
  accountHolderName: z.string().min(1, 'validation.required'),
  accountNumber: z.string().regex(/^\d{6,20}$/, 'payroll.accountInvalid'),
  ifscCode: z
    .string()
    .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'payroll.ifscInvalid')
    .transform((v) => v.toUpperCase()),
});
type FormValues = z.infer<typeof schema>;

interface IfscBranch {
  bank: string;
  branch: string;
  city: string;
}

/**
 * Looks up the bank/branch for a valid-shaped IFSC code via Razorpay's free, no-auth-required
 * public IFSC API (https://ifsc.razorpay.com/{code}) - lets the driver visually confirm they
 * typed the right code before saving, the same way a real banking app would. Debounced so it
 * doesn't fire on every keystroke, and fails silently (no lookup shown) on network error or an
 * unrecognized code rather than blocking the form - this is a confirmation nicety, not validation
 * the submit should depend on.
 */
function useIfscLookup(ifscCode: string) {
  const [result, setResult] = useState<IfscBranch | 'not-found' | 'loading' | null>(null);

  useEffect(() => {
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode)) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResult('loading');
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifscCode.toUpperCase()}`, { signal: controller.signal });
        if (!response.ok) {
          setResult('not-found');
          return;
        }
        const data = await response.json();
        setResult({ bank: data.BANK, branch: data.BRANCH, city: data.CITY });
      } catch {
        if (!controller.signal.aborted) setResult(null);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ifscCode]);

  return result;
}

/** The single line shown at the top once bank details exist: holder, masked account (last 4 visible), IFSC, plus Edit and Delete. */
export function BankSummaryLine({ bank, onEdit, onDelete }: { bank: BankDetail; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-surface p-4">
      <p className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-800">
        <Landmark className="h-5 w-5 shrink-0 text-primary-text" aria-hidden="true" />
        <span className="font-semibold">{bank.accountHolderName}</span>
        <span>
          {t('payroll.accountShort')} <span className="tabular-nums" data-testid="masked-account">{maskAccount(bank.maskedAccountNumber)}</span>
        </span>
        <span>
          {t('payroll.ifsc')} {bank.ifscCode}
        </span>
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          {t('common.edit')}
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}

function BankDetailsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: bankDetails, isLoading } = useQuery({
    queryKey: ['my-bank-details'],
    queryFn: async () => {
      try {
        return await getMyBankDetails();
      } catch (error) {
        // No record yet: the add-form shows. Anything else is a real failure.
        if (error instanceof AxiosError && error.response?.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { accountHolderName: '', accountNumber: '', ifscCode: '' } });
  const ifscLookup = useIfscLookup(watch('ifscCode') ?? '');
  const err = (m?: string) => (m ? t(m) : undefined);

  useEffect(() => {
    if (editing && bankDetails) {
      reset({ accountHolderName: bankDetails.accountHolderName, accountNumber: '', ifscCode: bankDetails.ifscCode });
    }
  }, [editing, bankDetails, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => upsertMyBankDetails(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-bank-details'] });
      toast.success(t('payroll.saved'));
      setEditing(false);
      reset({ accountHolderName: '', accountNumber: '', ifscCode: '' });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('payroll.saveFailed'))),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyBankDetails,
    onSuccess: () => {
      queryClient.setQueryData(['my-bank-details'], null);
      toast.success(t('payroll.deleted'));
      setConfirmDelete(false);
      setEditing(false);
      reset({ accountHolderName: '', accountNumber: '', ifscCode: '' });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('payroll.deleteFailed'))),
  });

  const showForm = !isLoading && (!bankDetails || editing);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t('payroll.bankTitle')}</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{t('payroll.bankHelp')}</p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {isLoading && <SkeletonTable rows={2} columns={3} />}
        {bankDetails && <BankSummaryLine bank={bankDetails} onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)} />}
        {showForm && (
          <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="flex flex-col gap-4" aria-label={t('payroll.bankTitle')}>
            <Input label={t('payroll.holder')} required error={err(errors.accountHolderName?.message)} {...register('accountHolderName')} />
            <Input
              label={t('payroll.accountNumber')}
              inputMode="numeric"
              required
              error={err(errors.accountNumber?.message)}
              placeholder={bankDetails ? t('payroll.reEnter') : undefined}
              {...register('accountNumber')}
            />
            <Input label={t('payroll.ifscCode')} required error={err(errors.ifscCode?.message)} placeholder="HDFC0001234" {...register('ifscCode')} />
            {ifscLookup === 'loading' && <p className="-mt-2 text-sm text-slate-400">{t('payroll.lookingUp')}</p>}
            {ifscLookup === 'not-found' && <p className="-mt-2 text-sm text-pending-700">{t('payroll.ifscNotFound')}</p>}
            {ifscLookup && typeof ifscLookup === 'object' && (
              <p className="-mt-2 text-sm text-safe-700">
                {ifscLookup.bank}, {ifscLookup.branch}, {ifscLookup.city}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>
                {t('payroll.saveBank')}
              </Button>
              {bankDetails && (
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardBody>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title={t('payroll.deleteTitle')}
        descriptionId="delete-bank-text"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p id="delete-bank-text" className="text-sm text-slate-700">
          {t('payroll.deleteConfirm')}
        </p>
      </Modal>
    </Card>
  );
}

const PAY_TONE: Record<string, BadgeTone> = { PAID: 'success', FAILED: 'danger', PROCESSING: 'info', PENDING: 'neutral' };

/** Pay-out amount: the server's explicit payoutAmount, else what was paid, else base + incentive due. */
export function payoutAmountOf(r: PayrollRecord): number {
  return r.payoutAmount ?? r.totalPaid ?? r.baseSalary + (r.incentiveAmount ?? 0);
}

function SalaryHistory() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const { data: payroll, isLoading } = useQuery({ queryKey: ['my-payroll'], queryFn: listMyPayroll });

  const rupees = new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR' });
  const columns: DataColumn<PayrollRecord>[] = [
    {
      key: 'date',
      header: t('common.date'),
      primary: true,
      cell: (r) => (r.disbursedAt ? formatDateTime(r.disbursedAt, locale) : r.periodStart),
    },
    { key: 'amount', header: t('payroll.amount'), cell: (r) => rupees.format(payoutAmountOf(r)), className: 'tabular-nums' },
    {
      key: 'status',
      header: t('common.status'),
      cell: (r) => (
        <div>
          <Badge tone={PAY_TONE[r.status] ?? 'neutral'}>{t(`enums.payStatus.${r.status}`, { defaultValue: r.status })}</Badge>
          {r.failureReason && <p className="mt-1 text-xs text-alert-700">{r.failureReason}</p>}
        </div>
      ),
    },
    {
      key: 'txn',
      header: t('payroll.transactionId'),
      cell: (r) => r.transactionId ?? r.transactionReference ?? '—',
    },
  ];
  return (
    <DataTable
      caption={t('payroll.historyTitle')}
      columns={columns}
      rows={payroll}
      isLoading={isLoading}
      getRowKey={(r) => r.id}
      empty={<EmptyState title={t('payroll.historyEmpty')} />}
    />
  );
}

export function DriverPayrollPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('payroll.title')} />
      <BankDetailsSection />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t('payroll.historyTitle')}</h2>
        <SalaryHistory />
      </section>
    </div>
  );
}
