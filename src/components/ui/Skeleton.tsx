import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-md bg-slate-200', className)} {...props} />;
}

/** A block of skeleton text lines, e.g. to stand in for a paragraph or a list of labels while loading. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Stand-in for a Table (see Table.tsx) while its rows are loading - same column count/row height. */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-40')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stand-in for a stack of list cards (e.g. the driver child checklist or arrival rows) while loading. */
export function SkeletonCards({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-card">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
