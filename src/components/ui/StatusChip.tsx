import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock, TriangleAlert, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ArrivalOutcome } from '@/types/attendance';

export type StatusTone = 'safe' | 'pending' | 'alert' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  safe: 'bg-safe-100 text-safe-700 ring-safe-200',
  pending: 'bg-pending-100 text-pending-700 ring-pending-200',
  alert: 'bg-alert-100 text-alert-700 ring-alert-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const TONE_ICON = { safe: Check, pending: Clock, alert: TriangleAlert, neutral: Minus } as const;

interface StatusChipProps {
  tone: StatusTone;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * A status pill that always carries an icon next to the colour, so safe / pending / alert stay
 * distinguishable without relying on hue alone (colour-blind safe, and readable in sunlight on a
 * driver's phone).
 */
export function StatusChip({ tone, children, size = 'md', className }: StatusChipProps) {
  const Icon = TONE_ICON[tone];
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset',
        size === 'sm' && 'px-2 py-0.5 text-[11px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className={cn('shrink-0', size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden="true" />
      {children}
    </span>
  );
}

const OUTCOME_TONE: Record<ArrivalOutcome, StatusTone> = {
  SAFE: 'safe',
  PENDING: 'pending',
  ALERT: 'alert',
};

/** StatusChip for an ArrivalOutcome with the localized label ("Safe" / "Pending" / "Alert"). */
export function ArrivalOutcomeChip({
  outcome,
  size,
  className,
}: {
  outcome: ArrivalOutcome;
  size?: StatusChipProps['size'];
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <StatusChip tone={OUTCOME_TONE[outcome]} size={size} className={className}>
      {t(`arrival.outcome.${outcome}`)}
    </StatusChip>
  );
}
