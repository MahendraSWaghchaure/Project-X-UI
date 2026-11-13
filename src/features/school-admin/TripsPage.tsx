import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listRoutes } from '@/lib/api/routes';
import { listTripsForSchool, scheduleTrip } from '@/lib/api/trips';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { TripDirection, TripStatus } from '@/types/tracking';
import { SkeletonTable } from '@/components/ui/Skeleton';

const STATUS_TONE: Record<TripStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  DELAYED: 'warning',
  CANCELLED: 'danger',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TripsPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((state) => state.schoolId);
  const [date, setDate] = useState(today());
  const [routeId, setRouteId] = useState<number | ''>('');
  const [direction, setDirection] = useState<TripDirection>('MORNING_PICKUP');
  const queryClient = useQueryClient();

  const { data: routes } = useQuery({
    queryKey: ['routes', schoolId],
    queryFn: () => listRoutes(schoolId!),
    enabled: schoolId != null,
  });
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', schoolId, date],
    queryFn: () => listTripsForSchool(schoolId!, date),
    enabled: schoolId != null,
  });

  const scheduleMutation = useMutation({
    mutationFn: () => scheduleTrip(schoolId!, Number(routeId), direction, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', schoolId, date] });
      toast.success(t('schoolTrips.scheduled'));
    },
    onError: () => toast.error(t('schoolTrips.scheduleFailed')),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('schoolTrips.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('schoolTrips.scheduleTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">{t('common.date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <Select
              label={t('schoolTrips.route')}
              value={routeId}
              onChange={(e) => setRouteId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('schoolTrips.chooseRoute')}</option>
              {routes?.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </Select>
            <Select
              label={t('schoolTrips.direction')}
              value={direction}
              onChange={(e) => setDirection(e.target.value as TripDirection)}
            >
              <option value="MORNING_PICKUP">{t('driver.morning')}</option>
              <option value="AFTERNOON_DROP">{t('driver.afternoon')}</option>
            </Select>
            <Button disabled={!routeId} isLoading={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()}>
              {t('schoolTrips.scheduleBtn')}
            </Button>
          </div>
          {scheduleMutation.isError && <p className="mt-2 text-sm text-red-600">{t('schoolTrips.scheduleFailed')}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('schoolTrips.tripsOn', { date })}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={4} columns={3} />}
          <ul className="divide-y divide-slate-100">
            {trips?.map((trip) => (
              <li key={trip.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {t('driver.route', { id: trip.routeId })} &middot;{' '}
                    {trip.direction === 'MORNING_PICKUP' ? t('driver.morning') : t('driver.afternoon')}
                  </p>
                  <p className="text-sm text-slate-500">{t('schoolDash.vehicleDriver', { vehicle: trip.vehicleId, driver: trip.driverId })}</p>
                </div>
                <Badge tone={STATUS_TONE[trip.status]}>{t(`enums.tripStatus.${trip.status}`)}</Badge>
              </li>
            ))}
            {trips?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('schoolTrips.noTrips')}</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
