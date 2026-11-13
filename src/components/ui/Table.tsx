import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Thin, composable wrappers over the native table elements - not a data-grid abstraction.
 * Usage mirrors Card: <Table><TableHead><TableRow><TableHeaderCell>.../>...
 * For a responsive list that turns into cards on phones, use <DataTable> (DataTable.tsx) instead.
 */
interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Keeps the header row visible while the body scrolls (the table scrolls inside a 70vh box). */
  stickyHeader?: boolean;
  /** Alternating row tint. */
  zebra?: boolean;
  /** Tighter rows for data-heavy screens. */
  dense?: boolean;
}

export function Table({ className, stickyHeader, zebra, dense, ...props }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', stickyHeader && 'max-h-[70vh] overflow-y-auto')}>
      <table
        data-zebra={zebra ? '' : undefined}
        data-dense={dense ? '' : undefined}
        className={cn(
          'w-full min-w-full border-separate border-spacing-0 text-left text-sm',
          '[&[data-zebra]_tbody_tr:nth-child(even)]:bg-slate-50',
          '[&[data-dense]_td]:py-2 [&[data-dense]_th]:py-2',
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child_td]:border-b-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-slate-50', className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-slate-100 px-4 py-3 align-middle text-slate-700', className)} {...props} />;
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {children}
      </td>
    </tr>
  );
}
