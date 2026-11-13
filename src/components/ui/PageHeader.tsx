import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small uppercase label above the title (a section / group name). */
  eyebrow?: ReactNode;
  /** Right-aligned buttons; wraps below the title on phones. */
  actions?: ReactNode;
  className?: string;
}

/** Consistent page title block. The title is the page's single <h1>. */
export function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3 animate-fade-up', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary-text">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
