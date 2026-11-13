import { useTranslation } from 'react-i18next';
import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { stepStates, type StepperArrival, type StepState } from './stepStates';

const CIRCLE: Record<StepState, string> = {
  done: 'bg-safe-600 text-white',
  pending: 'bg-pending-100 text-pending-700 ring-2 ring-pending-300',
  alert: 'bg-alert-600 text-white',
};

const LABEL: Record<StepState, string> = {
  done: 'text-safe-700',
  pending: 'text-pending-700',
  alert: 'text-alert-700',
};

const CONNECTOR: Record<StepState, string> = {
  done: 'bg-safe-500',
  pending: 'bg-slate-200',
  alert: 'bg-alert-300',
};

interface SafeArrivalStepperProps {
  arrival: StepperArrival;
  /** "lg" for the driver checklist (bigger circles and text), "sm" for dense lists. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Dropped -> School confirmed -> Parent approved. Each step carries an icon (check / clock / cross)
 * and a text state, not just a colour, and the whole thing is an ordered list so screen readers read
 * "Dropped at school: done, School confirmed: waiting, ...".
 */
export function SafeArrivalStepper({ arrival, size = 'sm', className }: SafeArrivalStepperProps) {
  const { t } = useTranslation();
  const states = stepStates(arrival);
  const labels = [
    t(`arrival.stepper.driver.${arrival.kind}`),
    t(`arrival.stepper.school.${arrival.schoolConfirm}`),
    t(`arrival.stepper.parent.${arrival.parentResponse}`),
  ];
  const big = size === 'lg';

  return (
    <ol className={cn('flex w-full items-start', className)} aria-label={t('arrival.stepper.label')}>
      {states.map((state, i) => {
        const Icon = state === 'done' ? Check : state === 'alert' ? X : Clock;
        return (
          <li
            key={i}
            data-state={state}
            data-step={i + 1}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn('absolute right-1/2 h-0.5 w-full', big ? 'top-4' : 'top-3', CONNECTOR[states[i - 1] === 'done' ? state : 'pending'])}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex items-center justify-center rounded-full',
                big ? 'h-8 w-8' : 'h-6 w-6',
                CIRCLE[state],
              )}
            >
              <Icon className={big ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
            </span>
            <span className={cn('mt-1 px-0.5 font-semibold leading-tight', big ? 'text-xs' : 'text-[11px]', LABEL[state])}>
              {labels[i]}
              <span className="sr-only">: {t(`arrival.stepper.state.${state}`)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
