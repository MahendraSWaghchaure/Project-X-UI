import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
        <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>
        <Link to="/platform-admin/schools" className="text-sm font-medium text-blue-600 hover:underline">
          Manage schools &rarr;
        </Link>
      </div>

      {pendingWaivers > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pendingWaivers} late-fee waiver request{pendingWaivers > 1 ? 's are' : ' is'} waiting on your review.{' '}
          <Link to="/platform-admin/payments" className="font-semibold underline">
            Review now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Schools onboarded" value={isLoading ? '—' : (stats?.schoolsTotal ?? 0)} to="/platform-admin/schools" />
        <StatCard label="Active" value={isLoading ? '—' : (stats?.schoolsActive ?? 0)} to="/platform-admin/schools" />
        <StatCard label="Suspended" value={isLoading ? '—' : (stats?.schoolsSuspended ?? 0)} to="/platform-admin/schools" />
        <StatCard label="Open grievances" value={stats?.openGrievances ?? 0} to="/platform-admin/grievances" />
        <StatCard
          label="Waivers pending"
          value={pendingWaivers}
          danger={pendingWaivers > 0}
          to="/platform-admin/payments"
        />
        <StatCard
          label="Independent drivers"
          value={stats?.independentDriversUnclaimed ?? 0}
          hint="unclaimed pool"
        />
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">
            You're the platform operator - the only role that spans every school. From here you onboard new schools
            (which creates their first school admin login automatically); each school then manages its own
            vehicles, drivers, routes, and students independently.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
