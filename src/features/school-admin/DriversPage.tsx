import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  claimDriver,
  createDriver,
  listDrivers,
  listIndependentDrivers,
  updateDriver,
  updateDriverEmploymentStatus,
  updateDriverVerification,
  type CreateDriverRequest,
  type UpdateDriverRequest,
} from '@/lib/api/drivers';
import { listRoutes } from '@/lib/api/routes';
import { useAuthStore } from '@/lib/authStore';
import { formatDate, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RouteFilterSelect } from '@/components/ui/RouteFilterSelect';
import type { Driver, DriverEmploymentStatus } from '@/types/people';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { phoneSchema } from '@/lib/validation';

const createSchema = z.object({
  firstName: z.string().min(1, 'validation.required'),
  lastName: z.string().min(1, 'validation.required'),
  email: z.string().email('validation.email'),
  password: z.string().min(8, 'validation.passwordMin'),
  phone: phoneSchema,
  address: z.string().optional(),
  licenseNumber: z.string().min(1, 'validation.required'),
  licenseExpiry: z.string().optional(),
  baseSalaryMonthly: z.union([z.literal(''), z.coerce.number().min(0, 'validation.positive')]).optional(),
});
type CreateValues = z.input<typeof createSchema>;

const editSchema = createSchema.omit({ email: true, password: true });

const EMPLOYMENT_TONE: Record<DriverEmploymentStatus, BadgeTone> = {
  ACTIVE: 'success',
  ON_LEAVE: 'warning',
  SUSPENDED: 'warning',
  TERMINATED: 'danger',
};

function salaryOf(v: { baseSalaryMonthly?: number | '' | undefined }): number | undefined {
  return v.baseSalaryMonthly === '' || v.baseSalaryMonthly == null ? undefined : Number(v.baseSalaryMonthly);
}

function DriverFormModal({ open, onClose, schoolId, driver }: { open: boolean; onClose: () => void; schoolId: number; driver?: Driver }) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const editing = driver != null;
  const defaults = (d?: Driver): CreateValues => ({
    firstName: d?.firstName ?? '',
    lastName: d?.lastName ?? '',
    email: '',
    password: '',
    phone: d?.phone ?? '',
    address: d?.address ?? '',
    licenseNumber: d?.licenseNumber ?? '',
    licenseExpiry: d?.licenseExpiry ?? '',
    baseSalaryMonthly: d?.baseSalaryMonthly ? Number(d.baseSalaryMonthly) : '',
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(editing ? (editSchema as unknown as typeof createSchema) : createSchema), defaultValues: defaults(driver) });

  useEffect(() => {
    if (open) reset(defaults(driver));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, driver?.id]);

  const mutation = useMutation({
    mutationFn: (v: CreateValues) => {
      const common = {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone,
        address: v.address?.trim() || undefined,
        licenseNumber: v.licenseNumber,
        licenseExpiry: v.licenseExpiry || undefined,
        baseSalaryMonthly: salaryOf(v),
      };
      if (editing) return updateDriver(schoolId, driver.id, common satisfies UpdateDriverRequest);
      return createDriver(schoolId, { ...common, email: v.email, password: v.password } satisfies CreateDriverRequest);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(editing ? t('drivers.updated') : t('drivers.added', { name: `${saved.firstName} ${saved.lastName}` }));
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, editing ? t('drivers.updateFailed') : t('drivers.addFailed'))),
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? t('drivers.editTitle') : t('drivers.addTitle')}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
        <Input label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
        {!editing && (
          <>
            <Input label={t('common.email')} type="email" required error={err(errors.email?.message)} {...register('email')} />
            <Input label={t('drivers.tempPassword')} type="password" required error={err(errors.password?.message)} {...register('password')} />
          </>
        )}
        <Input label={t('common.phone')} required error={err(errors.phone?.message)} {...register('phone')} />
        <Input label={t('common.address')} {...register('address')} />
        <Input label={t('drivers.licenseNumber')} required error={err(errors.licenseNumber?.message)} {...register('licenseNumber')} />
        <Input label={t('drivers.licenseExpiry')} type="date" {...register('licenseExpiry')} />
        <Input label={t('drivers.baseSalary')} type="number" error={err(errors.baseSalaryMonthly?.message)} {...register('baseSalaryMonthly')} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {editing ? t('common.saveChanges') : t('drivers.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type StatusAction = { driver: Driver; status: 'SUSPENDED' | 'TERMINATED' };

/** Suspend / terminate: a reason is mandatory and stored with the status change. */
export function StatusReasonModal({
  schoolId,
  action,
  onClose,
}: {
  schoolId: number;
  action: StatusAction | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (action) {
      setReason('');
      setTouched(false);
    }
  }, [action]);

  const mutation = useMutation({
    mutationFn: () => updateDriverEmploymentStatus(schoolId, action!.driver.id, action!.status, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(action!.status === 'SUSPENDED' ? t('drivers.suspendedToast') : t('drivers.terminatedToast'));
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('drivers.statusFailed'))),
  });

  const missing = touched && reason.trim().length === 0;
  const kind = action?.status === 'TERMINATED' ? 'terminate' : 'suspend';
  const name = action ? `${action.driver.firstName} ${action.driver.lastName}` : '';
  return (
    <Modal open={action !== null} onClose={onClose} title={t(`drivers.${kind}Title`, { name })}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (reason.trim().length > 0) mutation.mutate();
        }}
      >
        <p className="text-sm text-slate-600">{t(`drivers.${kind}Help`)}</p>
        <Textarea
          label={t('common.reason')}
          required
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          error={missing ? t('common.reasonRequired') : undefined}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" isLoading={mutation.isPending}>
            {t(`drivers.${kind}`)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function IndependentDriversCard({ schoolId }: { schoolId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: independentDrivers, isLoading } = useQuery({
    queryKey: ['drivers-independent'],
    queryFn: listIndependentDrivers,
  });

  const claimMutation = useMutation({
    mutationFn: (driverId: number) => claimDriver(schoolId, driverId),
    onSuccess: (driver) => {
      void queryClient.invalidateQueries({ queryKey: ['drivers-independent'] });
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(t('drivers.hired', { name: `${driver.firstName} ${driver.lastName}` }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('drivers.hireFailed'))),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('drivers.independentTitle')}</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{t('drivers.independentHelp')}</p>
      </CardHeader>
      <CardBody>
        {isLoading && <SkeletonTable rows={4} columns={3} />}
        <ul className="divide-y divide-slate-100">
          {independentDrivers?.map((driver) => (
            <li key={driver.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">
                  {driver.firstName} {driver.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {driver.phone} &middot; {t('drivers.licenseShort', { number: driver.licenseNumber })}
                  {driver.vehicleId ? ` · ${t('drivers.hasOwnVehicle')}` : ''}
                </p>
              </div>
              <Button
                variant="secondary"
                isLoading={claimMutation.isPending && claimMutation.variables === driver.id}
                onClick={() => claimMutation.mutate(driver.id)}
              >
                {t('drivers.hire')}
              </Button>
            </li>
          ))}
          {independentDrivers?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('drivers.noIndependent')}</p>}
        </ul>
      </CardBody>
    </Card>
  );
}

export function DriversPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const schoolId = useAuthStore((state) => state.schoolId);
  const queryClient = useQueryClient();
  const [formDriver, setFormDriver] = useState<Driver | 'new' | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [routeFilter, setRouteFilter] = useState<number | undefined>(undefined);
  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers', schoolId],
    queryFn: () => listDrivers(schoolId!),
    enabled: schoolId != null,
  });
  const { data: routes } = useQuery({
    queryKey: ['routes', schoolId],
    queryFn: () => listRoutes(schoolId!),
    enabled: schoolId != null && routeFilter != null,
  });
  const routeDriverId = routeFilter != null ? routes?.find((r) => r.id === routeFilter)?.driverId : undefined;
  const visibleDrivers = routeFilter == null ? drivers : drivers?.filter((d) => d.id === routeDriverId);

  const verifyMutation = useMutation({
    mutationFn: ({ driverId, status }: { driverId: number; status: 'VERIFIED' | 'REJECTED' }) =>
      updateDriverVerification(schoolId!, driverId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(t('drivers.verificationUpdated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('drivers.verificationFailed'))),
  });

  const reinstateMutation = useMutation({
    mutationFn: (driverId: number) => updateDriverEmploymentStatus(schoolId!, driverId, 'ACTIVE'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(t('drivers.reinstatedToast'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('drivers.statusFailed'))),
  });

  const verificationTone = (s: Driver['verificationStatus']): BadgeTone => (s === 'VERIFIED' ? 'success' : s === 'REJECTED' ? 'danger' : 'warning');

  const columns: DataColumn<Driver>[] = [
    {
      key: 'name',
      header: t('common.name'),
      primary: true,
      cell: (d) => (
        <span className="font-semibold">
          {d.firstName} {d.lastName}
        </span>
      ),
    },
    { key: 'phone', header: t('common.phone'), cell: (d) => d.phone },
    { key: 'address', header: t('common.address'), cell: (d) => d.address || '—' },
    {
      key: 'license',
      header: t('drivers.license'),
      cell: (d) => (
        <div>
          <p>{d.licenseNumber}</p>
          <p className="text-xs text-slate-500">{t('drivers.expires', { date: formatDate(d.licenseExpiry, locale) })}</p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: t('drivers.vehicle'),
      cell: (d) => d.vehicleRegistrationNumber ?? (d.vehicleId ? `#${d.vehicleId}` : <span className="text-slate-500">{t('drivers.unallocated')}</span>),
    },
    {
      key: 'employment',
      header: t('drivers.employment'),
      cell: (d) => (
        <div>
          <Badge tone={EMPLOYMENT_TONE[d.employmentStatus]}>{t(`enums.employmentStatus.${d.employmentStatus}`, { defaultValue: d.employmentStatus })}</Badge>
          {d.statusReason && d.employmentStatus !== 'ACTIVE' && <p className="mt-1 max-w-48 text-xs text-slate-500">{d.statusReason}</p>}
        </div>
      ),
    },
    {
      key: 'verification',
      header: t('drivers.verification'),
      cell: (d) => <Badge tone={verificationTone(d.verificationStatus)}>{t(`enums.verificationStatus.${d.verificationStatus}`, { defaultValue: d.verificationStatus })}</Badge>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (d) => (
        <div className="flex flex-wrap justify-end gap-2">
          {d.verificationStatus !== 'VERIFIED' && (
            <Button
              size="sm"
              variant="secondary"
              isLoading={verifyMutation.isPending && verifyMutation.variables?.driverId === d.id}
              onClick={() => verifyMutation.mutate({ driverId: d.id, status: 'VERIFIED' })}
            >
              {t('drivers.markVerified')}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setFormDriver(d)}>
            {t('common.edit')}
          </Button>
          {d.employmentStatus === 'ACTIVE' && (
            <Button size="sm" variant="secondary" onClick={() => setStatusAction({ driver: d, status: 'SUSPENDED' })}>
              {t('drivers.suspend')}
            </Button>
          )}
          {d.employmentStatus === 'SUSPENDED' && (
            <Button
              size="sm"
              variant="secondary"
              isLoading={reinstateMutation.isPending && reinstateMutation.variables === d.id}
              onClick={() => reinstateMutation.mutate(d.id)}
            >
              {t('drivers.reinstate')}
            </Button>
          )}
          {d.employmentStatus !== 'TERMINATED' && (
            <Button size="sm" variant="danger" onClick={() => setStatusAction({ driver: d, status: 'TERMINATED' })}>
              {t('drivers.terminate')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('drivers.title')} actions={<Button onClick={() => setFormDriver('new')}>{t('drivers.addButton')}</Button>} />

      {schoolId != null && (
        <>
          <DriverFormModal
            open={formDriver !== null}
            onClose={() => setFormDriver(null)}
            schoolId={schoolId}
            driver={formDriver === 'new' ? undefined : (formDriver ?? undefined)}
          />
          <StatusReasonModal schoolId={schoolId} action={statusAction} onClose={() => setStatusAction(null)} />
        </>
      )}

      <RouteFilterSelect schoolId={schoolId!} value={routeFilter} onChange={setRouteFilter} />

      <DataTable
        caption={t('drivers.title')}
        columns={columns}
        rows={visibleDrivers}
        isLoading={isLoading}
        getRowKey={(d) => d.id}
        empty={
          <EmptyState icon={UserRound} title={routeFilter != null ? t('drivers.noneOnRoute') : t('drivers.emptyTitle')} />
        }
      />

      {schoolId != null && <IndependentDriversCard schoolId={schoolId} />}
    </div>
  );
}
