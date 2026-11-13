/** YYYY-MM-DD in the user's LOCAL timezone. (`toISOString().slice(0, 10)` is UTC, which is yesterday for the first 5.5 hours of an Indian day.) */
export function toLocalIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayLocal(): string {
  return toLocalIsoDate(new Date());
}

export function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalIsoDate(d);
}

/** The school/attendance backend validates "today" in India time, regardless of where the browser is. */
export const SCHOOL_TIME_ZONE = 'Asia/Kolkata';

const istDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD of the given instant on the Asia/Kolkata calendar. */
export function toIstIsoDate(d: Date): string {
  const parts = Object.fromEntries(istDateFormat.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayIst(): string {
  return toIstIsoDate(new Date());
}

/** The IST calendar date n days before today (pure calendar arithmetic, so DST in the browser's zone cannot skew it). */
export function daysAgoIst(n: number): string {
  const [y, m, d] = todayIst().split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d - n));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
