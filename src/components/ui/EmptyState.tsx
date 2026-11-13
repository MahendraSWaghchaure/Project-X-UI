import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

/** A calm, centered "nothing here yet" block - used instead of a bare grey sentence so an empty list still tells the user what to do next. */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-12 text-center animate-fade-in', className)}>
      <span className="relative mb-2 flex h-16 w-16 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-primary-soft rotate-6" />
        <span aria-hidden="true" className="absolute inset-0 rounded-2xl border border-slate-200 bg-surface shadow-card -rotate-3" />
        <Icon className="relative h-7 w-7 text-primary-text" />
      </span>
      <p className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
