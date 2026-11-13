import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

type StatTone = 'default' | 'safe' | 'pending' | 'alert';

const TONE: Record<StatTone, { chip: string; value: string; bar: string }> = {
  default: { chip: 'bg-primary-soft text-primary-text', value: 'text-slate-900', bar: 'from-primary to-accent' },
  safe: { chip: 'bg-safe-100 text-safe-700', value: 'text-slate-900', bar: 'from-safe-600 to-safe-300' },
  pending: { chip: 'bg-pending-100 text-pending-700', value: 'text-slate-900', bar: 'from-pending-600 to-pending-300' },
  alert: { chip: 'bg-alert-100 text-alert-700', value: 'text-alert-700', bar: 'from-alert-600 to-alert-300' },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatTone;
  /** Makes the whole card a link. */
  to?: string;
  className?: string;
}

/** Dashboard KPI tile: label, big display-face number, optional hint + icon chip; a thin gradient edge marks its tone. */
export function StatCard({ label, value, hint, icon: Icon, tone = 'default', to, className }: StatCardProps) {
  const t = TONE[tone];
  const body = (
    <Card interactive={Boolean(to)} className={cn('relative h-full overflow-hidden', className)}>
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', t.bar)} />
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={cn('mt-1.5 font-display text-3xl font-bold leading-none tabular-nums', t.value)}>{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.chip)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : to ? (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : null}
      </div>
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}
