import { useTranslation } from 'react-i18next';

/** Intl locale for the active UI language, so dates/numbers follow the language switch. */
export function intlLocale(language: string | undefined): string {
  return language === 'hi' ? 'hi-IN' : 'en-IN';
}

export function useIntlLocale(): string {
  const { i18n } = useTranslation();
  return intlLocale(i18n.resolvedLanguage);
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  // Bare YYYY-MM-DD is a calendar date: parse as local to avoid a UTC off-by-one.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "HH:mm:ss" / "HH:mm" -> "HH:mm". */
export function shortTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '—';
}

/** Whole days between an ISO instant and now (>= 0). */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}

/** "ABCD1234" -> "XXXX1234": everything but the last 4 shown as a mask, tolerant of already-masked input. */
export function maskAccount(account: string): string {
  const last4 = account.slice(-4);
  return `${'•'.repeat(Math.max(0, account.length - 4))}${last4}`;
}
