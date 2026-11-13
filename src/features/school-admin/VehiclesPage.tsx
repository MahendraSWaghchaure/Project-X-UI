import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Bus, MapPin } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignVehicleDriver,
  createVehicle,
  listVehicles,
  retireVehicle,
  updateVehicle,
  type CreateVehicleRequest,
} from '@/lib/api/vehicles';
import { listDrivers } from '@/lib/api/drivers';
import { listRoutes } from '@/lib/api/routes';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { optionalPhoneSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RouteFilterSelect } from '@/components/ui/RouteFilterSelect';
import type { Vehicle } from '@/types/school';
import { VehicleLiveMapModal } from './VehicleLiveMapModal';

// Uppercase, letters and digits only - matches the backend's validation exactly (see
// CreateVehicleRequest/UpdateVehicleRequest) so a rejected value fails fast client-side instead
// of round-tripping to the server first.
const registrationNumberField = z
  .string()
  .min(1, 'validation.required')
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9]+$/.test(v), 'vehicles.regInvalid');

const schema = z
  .object({
    registrationNumber: registrationNumberField,
    type: z.enum(['VAN', 'BUS']),
    seatCapacity: z.coerce.number().int().min(1, 'validation.positive'),
    gpsDeviceId: z.string().optional(),
    ownershipType: z.enum(['SCHOOL', 'PRIVATE']),
    ownerName: z.string().optional(),
    ownerPhone: optionalPhoneSchema,
    ownerAddress: z.string().optional(),
    assignedDriverId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.ownershipType === 'PRIVATE' && !v.ownerName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ownerName'], message: 'validation.required' });
    }
  });
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function defaultsFor(v?: Vehicle): FormValues {
  return {
    registrationNumber: v?.registrationNumber ?? '',
    type: v?.type ?? 'VAN',
    seatCapacity: v?.seatCapacity ?? 20,
    gpsDeviceId: v?.gpsDeviceId ?? '',
    ownershipType: v?.ownershipType ?? 'SCHOOL',
    ownerName: v?.ownerName ?? '',
    ownerPhone: v?.ownerPhone ?? '',
    ownerAddress: v?.ownerAddress ?? '',
    assignedDriverId: v?.assignedDriverId != null ? String(v.assignedDriverId) : '',
  };
}

/** Add / edit form: vehicle details, owner details and driver allocation. */
function VehicleFormModal({ open, onClose, schoolId, vehicle }: { open: boolean; onClose: () => void; schoolId: number; vehicle?: Vehicle }) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const editing = vehicle != null;
  const { data: drivers } = useQuery({
    queryKey: ['drivers', schoolId],
    queryFn: () => listDrivers(schoolId),
    enabled: open,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: defaultsFor(vehicle) });
  const ownership = watch('ownershipType');

  useEffect(() => {
    if (open) reset(defaultsFor(vehicle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id]);

  const mutation = useMutation({
    mutationFn: async (v: FormOutput) => {
      const driverId = v.assignedDriverId ? Number(v.assignedDriverId) : undefined;
      const body: CreateVehicleRequest = {
        registrationNumber: v.registrationNumber,
        type: v.type,
        seatCapacity: v.seatCapacity,
        gpsDeviceId: v.gpsDeviceId?.trim() || undefined,
        ownershipType: v.ownershipType,
        ownerName: v.ownerName?.trim() || undefined,
        ownerPhone: v.ownerPhone?.trim() || undefined,
        ownerAddress: v.ownerAddress?.trim() || undefined,
        assignedDriverId: driverId,
      };
      if (!editing) return createVehicle(schoolId, body);
      const updated = await updateVehicle(schoolId, vehicle.id, body);
      // updateVehicle leaves the allocation alone when no driver is sent, so an explicit "none" is a separate call.
      if (driverId == null && vehicle.assignedDriverId != null) return assignVehicleDriver(schoolId, vehicle.id, null);
      return updated;
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['drivers', schoolId] });
      toast.success(editing ? t('vehicles.updated') : t('vehicles.added', { number: saved.registrationNumber }));
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, editing ? t('vehicles.updateFailed') : t('vehicles.addFailed'))),
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? t('vehicles.editTitle') : t('vehicles.addTitle')}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('vehicles.regNo')} required error={err(errors.registrationNumber?.message)} {...register('registrationNumber')} />
        <Select label={t('vehicles.type')} required {...register('type')}>
          <option value="VAN">{t('enums.vehicleType.VAN')}</option>
          <option value="BUS">{t('enums.vehicleType.BUS')}</option>
        </Select>
        <Input label={t('vehicles.seats')} type="number" required error={err(errors.seatCapacity?.message)} {...register('seatCapacity')} />
        <Input label={t('vehicles.gps')} {...register('gpsDeviceId')} />

        <div className="border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700 sm:col-span-2">{t('vehicles.ownerSection')}</div>
        <Select label={t('vehicles.ownership')} required {...register('ownershipType')}>
          <option value="SCHOOL">{t('enums.ownershipType.SCHOOL')}</option>
          <option value="PRIVATE">{t('enums.ownershipType.PRIVATE')}</option>
        </Select>
        <Input
          label={ownership === 'PRIVATE' ? t('vehicles.ownerNameRequired') : t('vehicles.ownerName')}
          required={ownership === 'PRIVATE'}
          error={err(errors.ownerName?.message)}
          {...register('ownerName')}
        />
        <Input label={t('vehicles.ownerPhone')} error={err(errors.ownerPhone?.message)} {...register('ownerPhone')} />
        <Input label={t('vehicles.ownerAddress')} {...register('ownerAddress')} />

        <div className="border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700 sm:col-span-2">{t('vehicles.driverSection')}</div>
        <Select label={t('vehicles.assignedDriver')} className="sm:col-span-2" {...register('assignedDriverId')}>
          <option value="">{t('vehicles.noDriver')}</option>
          {drivers
            ?.filter((d) => d.employmentStatus === 'ACTIVE' || d.id === vehicle?.assignedDriverId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
                {d.vehicleRegistrationNumber && d.vehicleId !== vehicle?.id
                  ? ` (${t('vehicles.driverOn', { number: d.vehicleRegistrationNumber })})`
                  : ''}
              </option>
            ))}
        </Select>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {editing ? t('common.saveChanges') : t('vehicles.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function VehiclesPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((state) => state.schoolId);
  const queryClient = useQueryClient();
  const [formVehicle, setFormVehicle] = useState<Vehicle | 'new' | null>(null);
  const [tracking, setTracking] = useState<Vehicle | null>(null);
  const [routeFilter, setRouteFilter] = useState<number | undefined>(undefined);
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', schoolId],
    queryFn: () => listVehicles(schoolId!),
    enabled: schoolId != null,
  });
  const { data: routes } = useQuery({
    queryKey: ['routes', schoolId],
    queryFn: () => listRoutes(schoolId!),
    enabled: schoolId != null && routeFilter != null,
  });
  const routeVehicleId = routeFilter != null ? routes?.find((r) => r.id === routeFilter)?.vehicleId : undefined;
  const visibleVehicles = routeFilter == null ? vehicles : vehicles?.filter((v) => v.id === routeVehicleId);

  const retireMutation = useMutation({
    mutationFn: (vehicleId: number) => retireVehicle(schoolId!, vehicleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles', schoolId] });
      toast.success(t('vehicles.retired'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('vehicles.retireFailed'))),
  });

  const columns: DataColumn<Vehicle>[] = [
    { key: 'regNo', header: t('vehicles.regNo'), primary: true, cell: (v) => <span className="font-semibold">{v.registrationNumber}</span> },
    { key: 'driver', header: t('vehicles.driver'), cell: (v) => v.driverName ?? <span className="text-slate-500">{t('vehicles.unassigned')}</span> },
    { key: 'students', header: t('vehicles.students'), cell: (v) => v.studentCount ?? 0, className: 'tabular-nums' },
    { key: 'route', header: t('vehicles.route'), cell: (v) => v.routeName ?? '—' },
    {
      key: 'status',
      header: t('common.status'),
      cell: (v) => <Badge tone={v.status === 'ACTIVE' ? 'success' : 'warning'}>{t(`enums.vehicleStatus.${v.status}`, { defaultValue: v.status })}</Badge>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (v) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={v.status === 'RETIRED'}
            onClick={() => setTracking(v)}
            aria-label={t('vehicles.trackOne', { number: v.registrationNumber })}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {t('vehicles.trackLive')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setFormVehicle(v)}>
            {t('common.edit')}
          </Button>
          {v.status !== 'RETIRED' && (
            <Button
              size="sm"
              variant="danger"
              isLoading={retireMutation.isPending && retireMutation.variables === v.id}
              onClick={() => {
                if (window.confirm(t('vehicles.retireConfirm', { number: v.registrationNumber }))) retireMutation.mutate(v.id);
              }}
            >
              {t('vehicles.retire')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('vehicles.title')}
        actions={<Button onClick={() => setFormVehicle('new')}>{t('vehicles.addButton')}</Button>}
      />

      {schoolId != null && (
        <VehicleFormModal
          open={formVehicle !== null}
          onClose={() => setFormVehicle(null)}
          schoolId={schoolId}
          vehicle={formVehicle === 'new' ? undefined : (formVehicle ?? undefined)}
        />
      )}
      {schoolId != null && <VehicleLiveMapModal schoolId={schoolId} vehicle={tracking} onClose={() => setTracking(null)} />}

      <RouteFilterSelect schoolId={schoolId!} value={routeFilter} onChange={setRouteFilter} />

      <DataTable
        caption={t('vehicles.title')}
        columns={columns}
        rows={visibleVehicles}
        isLoading={isLoading}
        getRowKey={(v) => v.id}
        empty={
          <EmptyState
            icon={Bus}
            title={routeFilter != null ? t('vehicles.noneOnRoute') : t('vehicles.emptyTitle')}
            description={routeFilter == null ? t('vehicles.emptyBody') : undefined}
          />
        }
      />
    </div>
  );
}
