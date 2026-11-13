import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { homeIcon } from '@/lib/leafletIcons';

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (point: { latitude: number; longitude: number }) => void;
  label?: string;
  height?: number;
  /**
   * B3: when set (e.g. once country+state+district are all chosen on the school onboarding form), the map flies
   * there automatically - this only moves the view, it never changes the picked point itself. Pass a new object
   * (or the same lat/lng again) to re-trigger the fly; `null`/`undefined` does nothing.
   */
  flyTo?: { latitude: number; longitude: number } | null;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Imperatively flies the map to `target` whenever it changes, without touching the picked marker. */
function FlyToTarget({ target }: { target: { latitude: number; longitude: number } | null | undefined }) {
  const map = useMap();
  const lastRef = useRef<string | null>(null);
  useEffect(() => {
    if (!target) return;
    const key = `${target.latitude},${target.longitude}`;
    if (lastRef.current === key) return;
    lastRef.current = key;
    map.flyTo([target.latitude, target.longitude], 11, { duration: 1.1 });
  }, [target, map]);
  return null;
}

/** Click-to-drop-a-pin location input, used anywhere a lat/lng pair used to be typed by hand. */
export function LocationPicker({ latitude, longitude, onChange, label, height = 280, flyTo }: LocationPickerProps) {
  const { t } = useTranslation();
  const hasValue = latitude != null && longitude != null;
  const center: [number, number] = hasValue ? [latitude, longitude] : INDIA_CENTER;

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <label className="text-sm font-medium text-slate-700">{label ?? t('geo.location')}</label>
      <div className="overflow-hidden rounded-md border border-slate-300" style={{ height }}>
        <MapContainer center={center} zoom={hasValue ? 15 : 5} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(lat, lng) => onChange({ latitude: lat, longitude: lng })} />
          <FlyToTarget target={flyTo} />
          {hasValue && <Marker position={[latitude, longitude]} icon={homeIcon} />}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        {hasValue ? t('geo.pinned', { lat: latitude.toFixed(5), lng: longitude.toFixed(5) }) : t('geo.clickToPin')}
      </p>
    </div>
  );
}
