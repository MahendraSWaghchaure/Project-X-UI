import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getMyChildDriver, getMyChildRoute, listMyChildren } from '@/lib/api/children';
import { getMyChildVehicleLocation } from '@/lib/api/tracking';
import { getTodaysTripForMyChild, recordParentHomeArrival } from '@/lib/api/trips';
import { useLiveVehicleLocation } from '@/hooks/useLiveVehicleLocation';
import { useSosSubscription } from '@/hooks/useSosSubscription';
import { stopIcon, vehicleIcon } from '@/lib/leafletIcons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India, used only before any position is known

/**
 * react-leaflet's MapContainer `center`/`zoom` props only apply on first mount - they don't
 * recenter an already-mounted map when route/location data arrives later (which it always does
 * here, since both load asynchronously after the map itself renders). This effect is what
 * actually moves the view once real positions are known.
 */
function MapAutoFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export function TrackBusPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const { data: children } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const childId = selectedChildId ?? children?.[0]?.id ?? null;

  const { data: restLocation } = useQuery({
    queryKey: ['child-vehicle-location', childId],
    queryFn: () => getMyChildVehicleLocation(childId!),
    enabled: childId != null,
    retry: false,
  });

  const { location: liveLocation, connected } = useLiveVehicleLocation(restLocation?.vehicleId ?? null);
  const location = liveLocation ?? restLocation;
  const sosEvent = useSosSubscription(location?.tripId ?? null);

  const { data: driver } = useQuery({
    queryKey: ['child-driver', childId],
    queryFn: () => getMyChildDriver(childId!),
    enabled: childId != null,
    retry: false,
  });

  const { data: route } = useQuery({
    queryKey: ['child-route', childId],
    queryFn: () => getMyChildRoute(childId!),
    enabled: childId != null,
    retry: false,
  });
  const routeStopPositions = useMemo<[number, number][]>(
    () => route?.stops.map((stop) => [stop.location.latitude, stop.location.longitude] as [number, number]) ?? [],
    [route],
  );

  const homeArrivalMutation = useMutation({
    mutationFn: async () => {
      if (childId == null) throw new Error('No child selected');
      const trip = await getTodaysTripForMyChild(childId, 'AFTERNOON_DROP');
      return recordParentHomeArrival(trip.id, childId);
    },
  });

  const center = useMemo<[number, number]>(
    () => (location ? [location.latitude, location.longitude] : (routeStopPositions[0] ?? DEFAULT_CENTER)),
    [location, routeStopPositions],
  );
  const fitPositions = useMemo<[number, number][]>(
    () => (location ? [[location.latitude, location.longitude], ...routeStopPositions] : routeStopPositions),
    [location, routeStopPositions],
  );

  return (
    <div className="flex flex-col gap-4">
      {sosEvent && !sosEvent.resolved && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {t('trackBus.sosBanner')}
          {sosEvent.note ? `: ${sosEvent.note}` : ''}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('trackBus.title')}</h1>
        {children && children.length > 1 && (
          <Select
            aria-label={t('trackBus.selectChild')}
            value={childId ?? ''}
            onChange={(e) => setSelectedChildId(Number(e.target.value))}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="h-[420px] w-full">
          <MapContainer center={center} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoFit positions={fitPositions} />
            {routeStopPositions.length > 1 && (
              <Polyline positions={routeStopPositions} pathOptions={{ color: '#16a34a', weight: 3, dashArray: '6 6' }} />
            )}
            {route?.stops.map((stop) => (
              <Marker key={stop.id} position={[stop.location.latitude, stop.location.longitude]} icon={stopIcon}>
                <Popup>{stop.label}</Popup>
              </Marker>
            ))}
            {location && (
              <Marker position={[location.latitude, location.longitude]} icon={vehicleIcon}>
                <Popup>
                  {location.speedKmh != null
                    ? t('parentApp.speedKmh', { speed: Math.round(location.speedKmh) })
                    : t('parentApp.speedUnknown')}
                  <br />
                  {t('parentApp.lastUpdate', { time: new Date(location.recordedAt).toLocaleTimeString(locale) })}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </Card>

      {driver && (
        <Card>
          <CardBody className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{t('trackBus.yourDriver')}</p>
              <p className="font-medium text-slate-900">
                {driver.firstName} {driver.lastName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={driver.verificationStatus === 'VERIFIED' ? 'success' : driver.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}>
                {driver.verificationStatus === 'VERIFIED' ? t('trackBus.verified') : driver.verificationStatus === 'REJECTED' ? t('trackBus.rejected') : t('trackBus.pending')}
              </Badge>
              <a
                href={`tel:${driver.phone}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('trackBus.callDriver')}
              </a>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('trackBus.status')}</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            {t('trackBus.liveConnection')}:{' '}
            {connected ? <span className="text-green-600">{t('trackBus.connected')}</span> : <span className="text-slate-400">{t('trackBus.connecting')}</span>}
          </p>
          {!location && <p className="text-sm text-slate-500">{t('trackBus.noPosition')}</p>}
          <Button
            variant="secondary"
            isLoading={homeArrivalMutation.isPending}
            disabled={childId == null}
            onClick={() => homeArrivalMutation.mutate()}
          >
            {t('trackBus.confirmHomeArrival')}
          </Button>
          {homeArrivalMutation.isSuccess && <p className="text-sm text-green-600">{t('trackBus.confirmSuccess')}</p>}
          {homeArrivalMutation.isError && <p className="text-sm text-red-600">{t('trackBus.confirmError')}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
