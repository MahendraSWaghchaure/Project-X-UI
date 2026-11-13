import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  /** 0-indexed current page, matching the backend's PageResponse.page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalElements?: number;
  pageSize?: number;
  className?: string;
}

/** Which 1-indexed page numbers to render, with -1 standing in for an ellipsis gap. */
function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const withGaps: number[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withGaps.push(-1);
    withGaps.push(p);
  });
  return withGaps;
}

export function Pagination({ page, totalPages, onPageChange, totalElements, pageSize, className }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  const current = page + 1;

  const rangeLabel =
    totalElements != null && pageSize != null
      ? t('pagination.showing', {
          from: page * pageSize + 1,
          to: Math.min(totalElements, (page + 1) * pageSize),
          total: totalElements,
        })
      : null;

  return (
    <div className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      {rangeLabel && <p className="text-sm text-slate-500">{rangeLabel}</p>}
      <nav className="flex items-center gap-1" aria-label={t('pagination.label')}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label={t('pagination.previous')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(current, totalPages).map((p, i) =>
          p === -1 ? (
            <span key={`gap-${i}`} className="px-1.5 text-sm text-slate-400">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p - 1)}
              aria-current={p === current ? 'page' : undefined}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                p === current ? 'bg-primary text-on-primary shadow-sm' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={current >= totalPages}
          aria-label={t('pagination.next')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
