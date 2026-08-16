import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyBankDetails, listMyPayroll, upsertMyBankDetails } from '@/lib/api/payments';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const schema = z.object({
  accountHolderName: z.string().min(1),
  accountNumber: z.string().regex(/^\d{6,20}$/, 'must be 6-20 digits'),
  ifscCode: z
    .string()
    .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'must be a valid IFSC code, e.g. HDFC0001234')
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

export function DriverPayrollPage() {
  const queryClient = useQueryClient();
  const { data: bankDetails, isLoading: bankLoading } = useQuery({
    queryKey: ['my-bank-details'],
    queryFn: getMyBankDetails,
    retry: false,
  });
  const { data: payroll, isLoading: payrollLoading } = useQuery({ queryKey: ['my-payroll'], queryFn: listMyPayroll });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const ifscLookup = useIfscLookup(watch('ifscCode') ?? '');

  useEffect(() => {
    if (bankDetails) {
      reset({ accountHolderName: bankDetails.accountHolderName, accountNumber: '', ifscCode: bankDetails.ifscCode });
    }
  }, [bankDetails, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => upsertMyBankDetails(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bank-details'] });
      toast.success('Bank details saved');
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not save bank details')),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Bank details</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Required to receive your monthly salary, disbursed on the 10th of each month.
          </p>
        </CardHeader>
        <CardBody>
          {bankLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
          {bankDetails && (
            <p className="mb-3 text-sm text-slate-600">
              Currently on file: {bankDetails.accountHolderName}, account ending {bankDetails.maskedAccountNumber.slice(-4)},{' '}
              {bankDetails.ifscCode}
            </p>
          )}
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
            <Input
              label="Account holder name"
              error={errors.accountHolderName?.message}
              {...register('accountHolderName')}
            />
            <Input
              label="Account number"
              error={errors.accountNumber?.message}
              placeholder={bankDetails ? 're-enter to change' : undefined}
              {...register('accountNumber')}
            />
            <Input label="IFSC code" error={errors.ifscCode?.message} placeholder="HDFC0001234" {...register('ifscCode')} />
            {ifscLookup === 'loading' && <p className="-mt-2 text-sm text-slate-400">Looking up branch&hellip;</p>}
            {ifscLookup === 'not-found' && <p className="-mt-2 text-sm text-amber-600">Code not recognized - double-check it</p>}
            {ifscLookup && typeof ifscLookup === 'object' && (
              <p className="-mt-2 text-sm text-green-700">
                {ifscLookup.bank}, {ifscLookup.branch}, {ifscLookup.city}
              </p>
            )}
            {mutation.isError && (
              <p className="text-sm text-red-600">{backendErrorMessage(mutation.error, 'Could not save bank details')}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-fit">
              Save bank details
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardBody>
          {payrollLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
          <ul className="flex flex-col divide-y divide-slate-100">
            {payroll?.map((record) => (
              <li key={record.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-900">{record.periodStart}</p>
                  <Badge tone={record.status === 'PAID' ? 'success' : record.status === 'FAILED' ? 'danger' : 'neutral'}>
                    {record.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  Base ₹{record.baseSalary.toFixed(2)}
                  {record.incentiveAmount > 0 && ` + incentive ₹${record.incentiveAmount.toFixed(2)}`}
                  {record.totalPaid != null && ` = ₹${record.totalPaid.toFixed(2)} paid`}
                </p>
                {record.transactionReference && (
                  <p className="text-sm text-slate-500">
                    Transaction #{record.transactionReference}
                    {record.disbursedAt && ` · ${new Date(record.disbursedAt).toLocaleString()}`}
                  </p>
                )}
                {record.failureReason && <p className="text-sm text-red-600">{record.failureReason}</p>}
              </li>
            ))}
            {payroll?.length === 0 && <p className="py-3 text-sm text-slate-500">No payroll history yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
