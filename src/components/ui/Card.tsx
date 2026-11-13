import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift - use when the whole card is a link / button. */
  interactive?: boolean;
}

/** Elevated surface: hairline border + soft shadow in day, border + cobalt under-glow at night. */
export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-surface shadow-card',
        interactive &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-pop motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-slate-200/70 px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold tracking-tight text-slate-900', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}
