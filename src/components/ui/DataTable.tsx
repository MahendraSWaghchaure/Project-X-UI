import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { Skeleton } from './Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  /** Renders the cell. */
  cell: (row: T) => ReactNode;
  /** Extra classes for both the header and body cell (e.g. `text-right`, `w-32`). */
  className?: string;
  /** Mobile card: this column becomes the card title (use for the name / number column). Only the first `primary` column is used. */
  primary?: boolean;
  /** Mobile card: this column is shown in the card footer as the action area (buttons, menus), without a label. */
  actions?: boolean;
  /** Mobile card: label shown next to the value. Defaults to `header` when it is a string. */
  mobileLabel?: string;
  /** Mobile card: omit this column from the card entirely. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T) => string | number;
  /** Accessible table name (sr-only caption). */
  caption: string;
  isLoading?: boolean;
  /** Rendered (usually an <EmptyState>) when `rows` is empty. */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  zebra?: boolean;
  dense?: boolean;
  /** Below this width the table becomes a list of cards. Default: Tailwind `md` (768px). */
  cardBreakpoint?: string;
  skeletonRows?: number;
  className?: string;
}

/**
 * Reusable data list. Desktop: bordered table with sticky header, hover and optional zebra / dense rows.
 * Phones: one card per row (primary column = title, other columns = label/value pairs, `actions` column = footer).
 * Only one of the two layouts is in the DOM at a time.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  isLoading,
  empty,
  onRowClick,
  stickyHeader,
  zebra,
  dense,
  cardBreakpoint = '(max-width: 767px)',
  skeletonRows = 5,
  className,
}: DataTableProps<T>) {
  const isCards = useMediaQuery(cardBreakpoint);
  const captionId = useId();

  const keyActivate = (row: T) => (e: KeyboardEvent) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-3 p-4', className)} aria-busy="true" aria-live="polite">
        <span className="sr-only">{caption}</span>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) return <>{empty ?? null}</>;

  if (isCards) {
    const primary = columns.find((c) => c.primary) ?? columns[0];
    const actionCols = columns.filter((c) => c.actions);
    const bodyCols = columns.filter((c) => c !== primary && !c.actions && !c.hideOnMobile);
    return (
      <ul aria-label={caption} className={cn('flex flex-col gap-3', className)}>
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={onRowClick ? keyActivate(row) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn(
              'rounded-xl border border-slate-200 bg-surface p-4 shadow-card',
              onRowClick && 'cursor-pointer active:bg-slate-50',
            )}
          >
            <div className="text-base font-semibold text-slate-900">{primary.cell(row)}</div>
            <dl className="mt-3 grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              {bodyCols.map((col) => (
                <div key={col.key} className="contents">
                  <dt className="text-slate-500">{col.mobileLabel ?? (typeof col.header === 'string' ? col.header : '')}</dt>
                  <dd className="min-w-0 break-words text-slate-800">{col.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actionCols.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                {actionCols.map((col) => (
                  <div key={col.key} className="contents">
                    {col.cell(row)}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-surface', className)}>
      <Table stickyHeader={stickyHeader} zebra={zebra} dense={dense} aria-labelledby={captionId}>
        <caption id={captionId} className="sr-only">
          {caption}
        </caption>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHeaderCell key={col.key} scope="col" className={col.className}>
                {col.header}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? keyActivate(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(onRowClick && 'cursor-pointer focus-visible:bg-slate-50')}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
