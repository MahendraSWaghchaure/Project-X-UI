import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, Check, QrCode, TriangleAlert } from 'lucide-react';
import {
  listMyTripsAsDriver,
  startTrip,
  completeTrip,
  recordDriverMarkedEvent,
  recordScannedEvent,
  getTripManifest,
  listChildTripEvents,
} from '@/lib/api/trips';
import { listTripArrivals } from '@/lib/api/attendance';
import { triggerSos } from '@/lib/api/tracking';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { toast } from '@/lib/toastStore';
import { todayLocal } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrivalOutcomeChip } from '@/components/ui/StatusChip';
import { SafeArrivalStepper } from '@/components/arrivals/SafeArrivalStepper';
import { QrScanner } from '@/components/QrScanner';
import { SkeletonCards } from '@/components/ui/Skeleton';
import type { Arrival } from '@/types/attendance';
import type { ChildTripEvent, ChildTripEventType, Trip, TripManifestEntry, TripStatus } from '@/types/tracking';

const STATUS_TONE: Record<TripStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  DELAYED: 'warning',
  CANCELLED: 'danger',
};

/** Which per-child actions the driver gets for a trip direction. Morning: home pickup, then school drop. Afternoon: school pickup. */
function eventButtons(direction: Trip['direction']): ChildTripEventType[] {
  return direction === 'MORNING_PICKUP'
    ? ['BOARDED', 'DROPPED_AT_SCHOOL', 'ABSENT']
    : ['PICKED_FROM_SCHOOL', 'ABSENT'];
}

const isActive = (trip: Trip) => trip.status === 'IN_PROGRESS' || trip.status === 'DELAYED';

/** One child can have several arrivals in a trip (e.g. home pickup then school drop); the stepper shows the latest. */
function latestArrivalFor(arrivals: Arrival[] | undefined, childId: number): Arrival | undefined {
  return arrivals
    ?.filter((a) => a.childId === childId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function DriverTripsPage() {
  const { t } = useTranslation();
  const { data: trips, isLoading } = useQuery({
    queryKey: ['driver-trips', todayLocal()],
    queryFn: () => listMyTripsAsDriver(todayLocal()),
  });

  // Amber is reserved for ONE hero CTA per screen: the first trip still waiting to start.
  const heroTripId = trips?.find((trip) => trip.status === 'SCHEDULED')?.id;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-900">{t('driver.title')}</h1>
      {isLoading && <SkeletonCards count={2} />}
      {trips?.length === 0 && (
        <Card>
          <EmptyState icon={Bus} title={t('driver.noTripsTitle')} description={t('driver.noTripsBody')} />
        </Card>
      )}
      {trips?.map((trip) => <TripCard key={trip.id} trip={trip} hero={trip.id === heroTripId} />)}
    </div>
  );
}

function TripCard({ trip, hero }: { trip: Trip; hero: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invalidateTrips = () => queryClient.invalidateQueries({ queryKey: ['driver-trips', todayLocal()] });

  const startMutation = useMutation({
    mutationFn: () => startTrip(trip.id),
    onSuccess: () => {
      invalidateTrips();
      toast.success(t('driver.tripStarted'));
    },
    onError: () => toast.error(t('driver.tripStartFailed')),
  });
  const completeMutation = useMutation({
    mutationFn: () => completeTrip(trip.id),
    onSuccess: () => {
      invalidateTrips();
      toast.success(t('driver.tripCompleted'));
    },
    onError: () => toast.error(t('driver.tripCompleteFailed')),
  });
  const sosMutation = useMutation({
    mutationFn: () => triggerSos(trip.id),
    onSuccess: () => toast.success(t('driver.sosSent')),
    onError: () => toast.error(t('driver.sosFailed')),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">
          {trip.direction === 'MORNING_PICKUP' ? t('driver.morning') : t('driver.afternoon')} &middot;{' '}
          {t('driver.route', { id: trip.routeId })}
        </CardTitle>
        <Badge tone={STATUS_TONE[trip.status]}>{t(`driver.tripStatus.${trip.status}`)}</Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {trip.status === 'SCHEDULED' && (
          <Button variant={hero ? 'accent' : 'primary'} size="lg" className="w-full" isLoading={startMutation.isPending} onClick={() => startMutation.mutate()}>
            {t('driver.startTrip')}
          </Button>
        )}
        {isActive(trip) && (
          <>
            <ActiveTripPanel trip={trip} />
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <Button size="lg" isLoading={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
                {t('driver.completeTrip')}
              </Button>
              <Button
                variant="danger"
                size="lg"
                isLoading={sosMutation.isPending}
                onClick={() => {
                  if (window.confirm(t('driver.sosConfirm'))) sosMutation.mutate();
                }}
              >
                {t('driver.sos')}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function ActiveTripPanel({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [scanning, setScanning] = useState(false);

  const { data: arrivals } = useQuery({
    queryKey: ['trip-arrivals', trip.id],
    queryFn: () => listTripArrivals(trip.id),
  });
  const { data: manifest, isLoading: manifestLoading } = useQuery({
    queryKey: ['trip-manifest', trip.id],
    queryFn: () => getTripManifest(trip.id),
  });
  const { data: events } = useQuery({
    queryKey: ['child-trip-events', trip.id],
    queryFn: () => listChildTripEvents(trip.id),
    retry: false,
  });

  // The school confirming attendance or a parent answering changes the stepper without any driver action.
  useLiveTopic([`/topic/trip/${trip.id}/arrivals`], () => {
    queryClient.invalidateQueries({ queryKey: ['trip-arrivals', trip.id] });
  });

  const refreshChecklist = () => {
    queryClient.invalidateQueries({ queryKey: ['child-trip-events', trip.id] });
    queryClient.invalidateQueries({ queryKey: ['trip-arrivals', trip.id] });
    // Arrivals open asynchronously after the event commits (up to ~1s); the live topic normally delivers it, this is the fallback.
    window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['trip-arrivals', trip.id] }), 1500);
  };

  const markMutation = useMutation({
    mutationFn: ({ childId, type }: { childId: number; type: ChildTripEventType }) =>
      recordDriverMarkedEvent(trip.id, childId, type),
    onSuccess: (_, variables) => {
      refreshChecklist();
      toast.success(t('driver.marked', { action: t(`driver.action.${variables.type}`) }));
    },
    onError: () => toast.error(t('driver.markFailed')),
  });

  const scanMutation = useMutation({
    mutationFn: (qrToken: string) =>
      recordScannedEvent(trip.id, qrToken, trip.direction === 'MORNING_PICKUP' ? 'BOARDED' : 'PICKED_FROM_SCHOOL'),
    onSuccess: () => {
      refreshChecklist();
      toast.success(t('driver.scanned'));
      setScanning(false);
    },
    onError: () => toast.error(t('driver.scanFailed')),
  });

  const alerts = (arrivals ?? []).filter((a) => a.outcome === 'ALERT');
  const done = new Set((events ?? []).map((e: ChildTripEvent) => `${e.childId}:${e.eventType}`));

  return (
    <div className="flex flex-col gap-4">
      {alerts.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-xl border border-alert-300 bg-alert-50 p-4 text-alert-700">
          <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-base font-bold">{t('driver.alertBannerTitle', { count: alerts.length })}</p>
            <p className="mt-0.5 text-sm">
              {alerts.map((a) => a.childName).join(', ')} &mdash; {t('driver.alertBannerBody')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={() => setScanning((s) => !s)}>
          <QrCode className="h-5 w-5" aria-hidden="true" />
          {scanning ? t('driver.stopScan') : t('driver.scan')}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('driver.hideChildren') : t('driver.showChildren')}
        </Button>
      </div>
      {scanning && <QrScanner onScan={(token) => scanMutation.mutate(token)} onClose={() => setScanning(false)} />}

      {open && (
        <ul className="flex flex-col gap-3" aria-label={t('driver.checklist')}>
          {manifestLoading && <SkeletonCards count={2} />}
          {manifest?.map((child) => (
            <ChildChecklistItem
              key={child.childId}
              child={child}
              direction={trip.direction}
              arrival={latestArrivalFor(arrivals, child.childId)}
              done={done}
              pendingType={markMutation.isPending && markMutation.variables?.childId === child.childId ? markMutation.variables.type : null}
              onMark={(type) => markMutation.mutate({ childId: child.childId, type })}
            />
          ))}
          {manifest?.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              {t('driver.noChildren')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ChildChecklistItem({
  child,
  direction,
  arrival,
  done,
  pendingType,
  onMark,
}: {
  child: TripManifestEntry;
  direction: Trip['direction'];
  arrival?: Arrival;
  done: Set<string>;
  pendingType: ChildTripEventType | null;
  onMark: (type: ChildTripEventType) => void;
}) {
  const { t } = useTranslation();
  const alert = arrival?.outcome === 'ALERT';

  return (
    <li
      data-alert={alert || undefined}
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4',
        alert ? 'border-alert-300 border-l-4 border-l-alert-600 bg-alert-50' : 'border-slate-200 bg-white',
        child.absentToday && 'bg-slate-50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-lg font-semibold text-slate-900">
          {child.firstName} {child.lastName}
        </p>
        {child.absentToday ? (
          <Badge tone="neutral">{t('driver.markedAbsent')}</Badge>
        ) : (
          arrival && <ArrivalOutcomeChip outcome={arrival.outcome} size="lg" />
        )}
      </div>

      {!child.absentToday && arrival && <SafeArrivalStepper arrival={arrival} size="lg" />}

      {!child.absentToday && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {eventButtons(direction).map((type) => {
            const isDone = done.has(`${child.childId}:${type}`);
            return (
              <Button
                key={type}
                size="lg"
                variant="secondary"
                isLoading={pendingType === type}
                disabled={isDone}
                className={cn(
                  'w-full',
                  isDone && 'border-safe-300 bg-safe-50 text-safe-700 disabled:text-safe-700',
                  type === 'ABSENT' && !isDone && 'text-alert-700',
                )}
                onClick={() => onMark(type)}
              >
                {isDone && <Check className="h-5 w-5" aria-hidden="true" />}
                {t(`driver.action.${type}`)}
              </Button>
            );
          })}
        </div>
      )}
    </li>
  );
}
