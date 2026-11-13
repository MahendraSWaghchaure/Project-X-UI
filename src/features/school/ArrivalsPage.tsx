import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { BusFront } from 'lucide-react';
import { listSchoolArrivals } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { formatTime, todayIst } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ArrivalOutcomeChip } from '@/components/ui/StatusChip';
import { SafeArrivalStepper } from '@/components/arrivals/SafeArrivalStepper';
import { ArrivalAlertDetail } from '@/components/arrivals/ArrivalAlertDetail';
import type { ArrivalOutcome } from '@/types/attendance';

const PAGE_SIZE = 20;
const FILTERS: ('ALL' | ArrivalOutcome)[] = ['ALL', 'ALERT', 'PENDING', 'SAFE'];

export function ArrivalsPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIst());
  const [outcome, setOutcome] = useState<'ALL' | ArrivalOutcome>('ALL');
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [date, outcome]);

  const { data, isLoading } = useQuery({
    queryKey: ['school-arrivals', schoolId, date, outcome, page],
    queryFn: () =>
      listSchoolArrivals(schoolId!, {
        date,
        outcome: outcome === 'ALL' ? undefined : outcome,
        page,
        size: PAGE_SIZE,
      }),
    enabled: schoolId != null,
    placeholderData: keepPreviousData,
  });

  useLiveTopic(
    [schoolId != null ? `/topic/school/${schoolId}/arrivals` : null],
    () => {
      queryClient.invalidateQueries({ queryKey: ['school-arrivals', schoolId] });
    },
    { refetchOnConnect: true },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('arrivals.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('arrivals.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {t('sheet.date')}
          <input
            type="date"
            value={date}
            max={todayIst()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <div role="group" aria-label={t('arrivals.filterLabel')} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={outcome === f}
              onClick={() => setOutcome(f)}
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
                outcome === f
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              {f === 'ALL' ? t('arrivals.filterAll') : t(`arrival.outcome.${f}`)}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-safe-500" aria-hidden="true" />
          {t('arrivals.live')}
        </span>
      </div>

      {isLoading && <SkeletonCards count={4} />}

      {data && data.content.length === 0 && (
        <Card>
          <EmptyState icon={BusFront} title={t('arrivals.emptyTitle')} description={t('arrivals.emptyBody')} />
        </Card>
      )}

      {data && data.content.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.content.map((a) => (
            <li
              key={a.id}
              data-outcome={a.outcome}
              className={cn(
                'grid gap-3 rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(22,35,63,0.06)] md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_auto] md:items-center',
                a.outcome === 'ALERT' ? 'border-alert-300 border-l-4 border-l-alert-600 bg-alert-50' : 'border-slate-200',
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{a.childName}</p>
                <p className="text-sm text-slate-500">
                  {t(`arrival.kind.${a.kind}`)} &middot; {formatTime(a.driverEventAt)}
                </p>
                <ArrivalAlertDetail arrival={a} />
              </div>
              <SafeArrivalStepper arrival={a} />
              <ArrivalOutcomeChip outcome={a.outcome} size="lg" className="justify-self-start md:justify-self-end" />
            </li>
          ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
