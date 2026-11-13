import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPlatformDashboardStats } from '@/lib/api/stats';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

function StatCard({
  label,
  value,
  hint,
  to,
  danger,
}: {
  label: string;
  value: number | string;
  hint?: string;
  to?: string;
  danger?: boolean;
}) {
  const body = (
    <Card className={to ? 'transition-shadow hover:shadow-md' : undefined}>
      <CardBody>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={cn('mt-1 text-3xl font-bold', danger ? 'text-red-600' : 'text-slate-900')}>{value}</p>
        {hint && <p className={cn('mt-1 text-xs', danger ? 'text-red-500' : 'text-slate-400')}>{hint}</p>}
      </CardBody>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function PlatformAdminDashboardPage() {
  const { t } = useTranslation();
  // A single indexed-aggregate call instead of fetching every school/grievance/waiver/driver row
  // just to compute a length - stays cheap as the platform grows, and refetchInterval keeps the
  // numbers live without a full page reload.
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-dashboard-stats'],
    queryFn: getPlatformDashboardStats,
    refetchInterval: 20000,
  });

  const pendingWaivers = stats?.pendingWaivers ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('platformDash.title')}</h1>
        <Link to="/platform-admin/schools" className="text-sm font-medium text-blue-600 hover:underline">
          {t('platformDash.manageSchools')} &rarr;
        </Link>
      </div>

      {pendingWaivers > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('platformDash.waiversBanner', { count: pendingWaivers })}{' '}
          <Link to="/platform-admin/payments" className="font-semibold underline">
            {t('platformDash.reviewNow')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t('platformDash.schoolsOnboarded')} value={isLoading ? '—' : (stats?.schoolsTotal ?? 0)} to="/platform-admin/schools" />
        <StatCard label={t('platformDash.active')} value={isLoading ? '—' : (stats?.schoolsActive ?? 0)} to="/platform-admin/schools" />
        <StatCard label={t('platformDash.suspended')} value={isLoading ? '—' : (stats?.schoolsSuspended ?? 0)} to="/platform-admin/schools" />
        <StatCard label={t('platformDash.openGrievances')} value={stats?.openGrievances ?? 0} to="/platform-admin/grievances" />
        <StatCard
          label={t('platformDash.waiversPending')}
          value={pendingWaivers}
          danger={pendingWaivers > 0}
          to="/platform-admin/payments"
        />
        <StatCard
          label={t('platformDash.independentDrivers')}
          value={stats?.independentDriversUnclaimed ?? 0}
          hint={t('platformDash.unclaimedPool')}
        />
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">
            {t('platformDash.intro')}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
