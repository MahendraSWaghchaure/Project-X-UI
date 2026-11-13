import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyGrievances, raiseGrievance } from '@/lib/api/grievances';
import { listMyTripsAsDriver } from '@/lib/api/trips';
import { todayLocal } from '@/lib/dates';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { GrievanceStatusBadge } from '@/components/grievance/GrievanceStatusBadge';
import { grievanceTypeLabel } from '@/features/grievances/grievanceLabels';
import { DRIVER_GRIEVANCE_TYPES } from '@/types/grievance';

const schema = z
  .object({
    type: z.enum(DRIVER_GRIEVANCE_TYPES as [string, ...string[]]),
    otherDescription: z.string().trim().max(500).optional(),
    tripId: z.string().optional(),
    subject: z.string().trim().min(1, 'validation.required'),
    description: z.string().trim().min(1, 'validation.required'),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'OTHER' && !v.otherDescription?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['otherDescription'], message: 'validation.required' });
    }
  });
type FormValues = z.infer<typeof schema>;

export function DriverGrievancesPage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const locale = useIntlLocale();
  const userId = useAuthStore((state) => state.userId);
  const queryClient = useQueryClient();
  const { data: grievances, isLoading } = useQuery({ queryKey: ['my-grievances'], queryFn: listMyGrievances });
  const { data: trips } = useQuery({ queryKey: ['driver-trips-for-grievance'], queryFn: () => listMyTripsAsDriver(todayLocal()), retry: false });

  useLiveTopic([userId ? `/topic/users/${userId}/grievances` : null], () => {
    void queryClient.invalidateQueries({ queryKey: ['my-grievances'] });
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'OTHER' } });
  const type = watch('type');

  const raiseMutation = useMutation({
    mutationFn: (v: FormValues) =>
      raiseGrievance({
        type: v.type as (typeof DRIVER_GRIEVANCE_TYPES)[number],
        otherDescription: v.type === 'OTHER' ? v.otherDescription?.trim() : undefined,
        tripId: v.tripId ? Number(v.tripId) : undefined,
        subject: v.subject,
        description: v.description,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-grievances'] });
      reset({ type: 'OTHER' });
      toast.success(t('driverGrievances.submitted'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('driverGrievances.submitFailed'))),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('grievances.title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('driverGrievances.raiseTitle')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t('driverGrievances.raiseHelp')}</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit((values) => raiseMutation.mutate(values))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label={t('grievances.col.type')} required {...register('type')}>
              {DRIVER_GRIEVANCE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`enums.grievanceType.${x}`)}
                </option>
              ))}
            </Select>
            {type === 'OTHER' && (
              <Input label={t('driverGrievances.otherLabel')} required error={err(errors.otherDescription?.message)} maxLength={500} {...register('otherDescription')} />
            )}
            {trips && trips.length > 0 && (
              <Select label={t('driverGrievances.linkedTrip')} {...register('tripId')}>
                <option value="">{t('driverGrievances.noTrip')}</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {t('driverGrievances.tripOption', { id: trip.id, status: t(`enums.tripStatus.${trip.status}`, { defaultValue: trip.status }) })}
                  </option>
                ))}
              </Select>
            )}
            <Input label={t('driverGrievances.subject')} required className="sm:col-span-2" error={err(errors.subject?.message)} {...register('subject')} />
            <div className="sm:col-span-2">
              <Textarea label={t('common.description')} required rows={4} error={err(errors.description?.message)} {...register('description')} />
            </div>
            <Button type="submit" isLoading={isSubmitting || raiseMutation.isPending} className="sm:col-span-2 sm:w-fit">
              {t('common.submit')}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('driverGrievances.yourTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={4} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {grievances?.map((g) => (
              <li key={g.id} className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-900">{g.subject}</p>
                  <GrievanceStatusBadge status={g.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {grievanceTypeLabel(t, g)} &middot; {formatDateTime(g.createdAt, locale)}
                </p>
                <p className="text-sm text-slate-600">{g.description}</p>
                {g.resolutionNote && (
                  <p className="mt-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                    <span className="font-medium">{t('driverGrievances.response')} </span>
                    {g.resolutionNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {grievances?.length === 0 && <EmptyState title={t('driverGrievances.none')} />}
        </CardBody>
      </Card>
    </div>
  );
}
