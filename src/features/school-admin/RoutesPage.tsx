import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Route as RouteIcon, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignRoute, createRoute, listRoutes, updateRoute, type RouteStopRequest } from '@/lib/api/routes';
import { listVehicles } from '@/lib/api/vehicles';
import { listDrivers } from '@/lib/api/drivers';
import { useAuthStore } from '@/lib/authStore';
import { shortTime } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import type { Route } from '@/types/school';

const stopSchema = z.object({
  stopId: z.number().optional(),
  label: z.string().trim().min(1, 'validation.required'),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.coerce.number().min(20, 'validation.min').optional(),
  scheduledTime: z.string().optional(),
});
const schema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  zoneMinRadiusMeters: z.union([z.literal(''), z.coerce.number().min(0, 'validation.positive')]).optional(),
  zoneMaxRadiusMeters: z.union([z.literal(''), z.coerce.number().min(0, 'validation.positive')]).optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  active: z.boolean(),
  stops: z.array(stopSchema).min(1, 'routes.atLeastOneStop'),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const blankStop = { label: '', latitude: 0, longitude: 0, radiusMeters: 150, scheduledTime: '' };

function defaultsFor(route?: Route): FormValues {
  return {
    name: route?.name ?? '',
    zoneMinRadiusMeters: route?.zoneMinRadiusMeters ?? '',
    zoneMaxRadiusMeters: route?.zoneMaxRadiusMeters ?? '',
    vehicleId: route?.vehicleId != null ? String(route.vehicleId) : '',
    driverId: route?.driverId != null ? String(route.driverId) : '',
    active: route?.active ?? true,
    stops: route?.stops.length
      ? [...route.stops]
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((s) => ({
            stopId: s.id,
            label: s.label,
            latitude: s.location.latitude,
            longitude: s.location.longitude,
            radiusMeters: s.radiusMeters,
            scheduledTime: s.scheduledTime ? s.scheduledTime.slice(0, 5) : '',
          }))
      : [{ ...blankStop }],
  };
}

const optionalNumber = (v: number | '' | undefined): number | undefined => (v === '' || v == null ? undefined : Number(v));

/** Create / edit a route: name, zone, vehicle + driver, and the ordered stop list (add, reorder, remove). */
function RouteFormModal({ open, onClose, schoolId, route }: { open: boolean; onClose: () => void; schoolId: number; route?: Route }) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m, { min: 20 }) : undefined);
  const queryClient = useQueryClient();
  const editing = route != null;
  const { data: vehicles } = useQuery({ queryKey: ['vehicles', schoolId], queryFn: () => listVehicles(schoolId), enabled: open });
  const { data: drivers } = useQuery({ queryKey: ['drivers', schoolId], queryFn: () => listDrivers(schoolId), enabled: open });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: defaultsFor(route) });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'stops' });
  const watchedStops = watch('stops');

  useEffect(() => {
    if (open) reset(defaultsFor(route));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, route?.id]);

  const mutation = useMutation({
    mutationFn: async (v: FormOutput) => {
      const stops: RouteStopRequest[] = v.stops.map((s, index) => ({
        id: s.stopId,
        sequenceNumber: index,
        label: s.label,
        latitude: s.latitude,
        longitude: s.longitude,
        radiusMeters: s.radiusMeters,
        scheduledTime: s.scheduledTime || undefined,
      }));
      const body = {
        name: v.name,
        zoneMinRadiusMeters: optionalNumber(v.zoneMinRadiusMeters),
        zoneMaxRadiusMeters: optionalNumber(v.zoneMaxRadiusMeters),
        stops,
      };
      const saved = editing ? await updateRoute(schoolId, route.id, { ...body, active: v.active }) : await createRoute(schoolId, body);
      const vehicleId = v.vehicleId ? Number(v.vehicleId) : undefined;
      const driverId = v.driverId ? Number(v.driverId) : undefined;
      // The assignment endpoint takes both; only call it when the pair is set and changed.
      if (vehicleId && driverId && (vehicleId !== saved.vehicleId || driverId !== saved.driverId)) {
        return assignRoute(schoolId, saved.id, vehicleId, driverId);
      }
      return saved;
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['routes', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles', schoolId] });
      toast.success(editing ? t('routes.updated') : t('routes.created', { name: saved.name }));
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, editing ? t('routes.updateFailed') : t('routes.createFailed'))),
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? t('routes.editTitle') : t('routes.createTitle')}>
      <p className="-mt-1 mb-4 text-sm text-slate-500">{t('routes.zoneHelp')}</p>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        <Input label={t('routes.name')} required error={err(errors.name?.message)} {...register('name')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('routes.zoneMin')} type="number" {...register('zoneMinRadiusMeters')} />
          <Input label={t('routes.zoneMax')} type="number" {...register('zoneMaxRadiusMeters')} />
          <Select label={t('routes.vehicle')} {...register('vehicleId')}>
            <option value="">{t('routes.noVehicle')}</option>
            {vehicles?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.registrationNumber}
              </option>
            ))}
          </Select>
          <Select label={t('routes.driver')} {...register('driverId')}>
            <option value="">{t('routes.noDriver')}</option>
            {drivers?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </Select>
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" {...register('active')} />
            {t('routes.activeLabel')}
          </label>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{t('routes.stopsInOrder')}</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ ...blankStop })}>
              {t('routes.addStop')}
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 sm:col-span-3">
                <Badge tone="info">{t('routes.stopNumber', { n: index + 1 })}</Badge>
                <div className="ml-auto flex gap-1">
                  <Button type="button" size="sm" variant="ghost" disabled={index === 0} aria-label={t('routes.moveUp', { n: index + 1 })} onClick={() => move(index, index - 1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={index === fields.length - 1} aria-label={t('routes.moveDown', { n: index + 1 })} onClick={() => move(index, index + 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={fields.length === 1} aria-label={t('routes.removeStop', { n: index + 1 })} onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Input label={t('routes.stopLabel')} required error={err(errors.stops?.[index]?.label?.message)} {...register(`stops.${index}.label` as const)} />
              <Input label={t('routes.stopTime')} type="time" {...register(`stops.${index}.scheduledTime` as const)} />
              <Input label={t('routes.stopRadius')} type="number" error={err(errors.stops?.[index]?.radiusMeters?.message)} {...register(`stops.${index}.radiusMeters` as const)} />
              <div className="sm:col-span-3">
                <LocationPicker
                  label={t('routes.stopLocation')}
                  latitude={watchedStops?.[index]?.latitude}
                  longitude={watchedStops?.[index]?.longitude}
                  onChange={(point) => {
                    setValue(`stops.${index}.latitude` as const, point.latitude);
                    setValue(`stops.${index}.longitude` as const, point.longitude);
                  }}
                  height={200}
                />
              </div>
            </div>
          ))}
          {errors.stops?.message && <p className="text-sm text-red-600">{err(errors.stops.message)}</p>}
          {errors.stops?.root?.message && <p className="text-sm text-red-600">{err(errors.stops.root.message)}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {editing ? t('common.saveChanges') : t('routes.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StopsDrawer({ route, onClose }: { route: Route | null; onClose: () => void }) {
  const { t } = useTranslation();
  const stops = route ? [...route.stops].sort((a, b) => a.sequenceNumber - b.sequenceNumber) : [];
  return (
    <Drawer open={route !== null} onClose={onClose} title={t('routes.stopsTitle', { name: route?.name ?? '' })}>
      {stops.length === 0 ? (
        <p className="text-sm text-slate-500">{t('routes.noStops')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {stops.map((s, i) => (
            <li key={s.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{s.label}</p>
                <p className="text-sm text-slate-500">
                  {t('routes.stopTimeValue', { time: shortTime(s.scheduledTime) })} &middot; {t('routes.stopRadiusValue', { m: s.radiusMeters })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}

export function RoutesPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((state) => state.schoolId);
  const [formRoute, setFormRoute] = useState<Route | 'new' | null>(null);
  const [stopsRoute, setStopsRoute] = useState<Route | null>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes', schoolId],
    queryFn: () => listRoutes(schoolId!),
    enabled: schoolId != null,
  });

  const columns: DataColumn<Route>[] = [
    { key: 'name', header: t('routes.name'), primary: true, cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'vehicle', header: t('routes.vehicle'), cell: (r) => r.vehicleRegistrationNumber ?? (r.vehicleId ? `#${r.vehicleId}` : '—') },
    {
      key: 'stops',
      header: t('routes.stops'),
      cell: (r) => (
        <Button size="sm" variant="secondary" onClick={() => setStopsRoute(r)} aria-label={t('routes.viewStops', { count: r.stopCount ?? r.stops.length, name: r.name })}>
          {r.stopCount ?? r.stops.length}
        </Button>
      ),
    },
    {
      key: 'zone',
      header: t('routes.zone'),
      cell: (r) =>
        r.zoneMinRadiusMeters != null && r.zoneMaxRadiusMeters != null
          ? t('routes.zoneValue', { min: r.zoneMinRadiusMeters, max: r.zoneMaxRadiusMeters })
          : t('routes.noZone'),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (r) => {
        const active = (r.status ?? (r.active ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE';
        return <Badge tone={active ? 'success' : 'neutral'}>{t(active ? 'routes.statusActive' : 'routes.statusInactive')}</Badge>;
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (r) => (
        <Button size="sm" variant="secondary" onClick={() => setFormRoute(r)}>
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('routes.title')} actions={<Button onClick={() => setFormRoute('new')}>{t('routes.createButton')}</Button>} />
      {schoolId != null && (
        <RouteFormModal
          open={formRoute !== null}
          onClose={() => setFormRoute(null)}
          schoolId={schoolId}
          route={formRoute === 'new' ? undefined : (formRoute ?? undefined)}
        />
      )}
      <StopsDrawer route={stopsRoute} onClose={() => setStopsRoute(null)} />
      <DataTable
        caption={t('routes.title')}
        columns={columns}
        rows={routes}
        isLoading={isLoading}
        getRowKey={(r) => r.id}
        empty={<EmptyState icon={RouteIcon} title={t('routes.emptyTitle')} description={t('routes.emptyBody')} />}
      />
    </div>
  );
}
