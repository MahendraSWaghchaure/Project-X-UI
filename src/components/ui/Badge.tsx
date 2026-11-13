import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'safe' | 'pending' | 'alert';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-info-100 text-info-700',
  // Safe-arrival status tokens (index.css) - see StatusChip for the icon-bearing variant.
  safe: 'bg-safe-100 text-safe-700',
  pending: 'bg-pending-100 text-pending-700',
  alert: 'bg-alert-100 text-alert-700',
};

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-current/15',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
