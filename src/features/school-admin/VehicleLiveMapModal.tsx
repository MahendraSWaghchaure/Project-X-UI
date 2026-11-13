import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getVehicleLocation } from '@/lib/api/tracking';
import { listRoutes } from '@/lib/api/routes';
import { useLiveVehicleLocation } from '@/hooks/useLiveVehicleLocation';
import { useIntlLocale } from '@/lib/format';
import { stopIcon, vehicleIcon } from '@/lib/leafletIcons';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Vehicle } from '@/types/school';

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India, used only before any position is known

/** MapContainer's center/zoom only apply on first mount, so move the view once real positions arrive. */
function MapAutoFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) map.setView(positions[0], 15);
    else map.fitBounds(positions, { padding: [40, 40] });
  }, [map, positions]);
  return null;
}

interface Props {
  schoolId: number;
  vehicle: Vehicle | null;
  onClose: () => void;
}

/** School-admin "Track live": the vehicle's last known position plus live STOMP updates, with its route's stops. */
export function VehicleLiveMapModal({ schoolId, vehicle, onClose }: Props) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const vehicleId = vehicle?.id ?? null;

  const { data: restLocation, isError } = useQuery({
    queryKey: ['vehicle-location', schoolId, vehicleId],
    queryFn: () => getVehicleLocation(schoolId, vehicleId!),
    enabled: vehicleId != null,
    retry: false,
  });
  const { data: routes } = useQuery({
    queryKey: ['routes', schoolId],
    queryFn: () => listRoutes(schoolId),
    enabled: vehicleId != null,
  });
  const { location: live, connected } = useLiveVehicleLocation(vehicleId);
  const location = live ?? restLocation ?? null;
  const route = routes?.find((r) => r.vehicleId === vehicleId);
  const stopPositions = useMemo<[number, number][]>(
    () => route?.stops.map((s) => [s.location.latitude, s.location.longitude] as [number, number]) ?? [],
    [route],
  );
  const fit = useMemo<[number, number][]>(
    () => (location ? [[location.latitude, location.longitude], ...stopPositions] : stopPositions),
    [location, stopPositions],
  );

  return (
    <Modal
      open={vehicle !== null}
      onClose={onClose}
      size="lg"
      title={t('vehicles.trackTitle', { number: vehicle?.registrationNumber ?? '' })}
    >
      {vehicle && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={connected ? 'success' : 'neutral'}>{connected ? t('vehicles.liveOn') : t('vehicles.liveConnecting')}</Badge>
            {location ? (
              <span>{t('vehicles.lastUpdate', { time: new Date(location.recordedAt).toLocaleTimeString(locale) })}</span>
            ) : (
              <span>{isError ? t('vehicles.noPosition') : t('common.loading')}</span>
            )}
          </div>
          <div className="h-[380px] w-full overflow-hidden rounded-lg">
            <MapContainer center={fit[0] ?? DEFAULT_CENTER} zoom={13} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoFit positions={fit} />
              {stopPositions.length > 1 && (
                <Polyline positions={stopPositions} pathOptions={{ color: '#16a34a', weight: 3, dashArray: '6 6' }} />
              )}
              {route?.stops.map((stop) => (
                <Marker key={stop.id} position={[stop.location.latitude, stop.location.longitude]} icon={stopIcon}>
                  <Popup>{stop.label}</Popup>
                </Marker>
              ))}
              {location && (
                <Marker position={[location.latitude, location.longitude]} icon={vehicleIcon}>
                  <Popup>
                    {vehicle.registrationNumber}
                    {location.speedKmh != null && (
                      <>
                        <br />
                        {t('parentApp.speedKmh', { speed: Math.round(location.speedKmh) })}
                      </>
                    )}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </Modal>
  );
}
