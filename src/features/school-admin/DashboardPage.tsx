import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listTripsForSchool } from '@/lib/api/trips';
import { getSchool } from '@/lib/api/schools';
import { getSchoolDashboardStats } from '@/lib/api/stats';
import { listActiveSos, resolveSos } from '@/lib/api/tracking';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { TripStatus } from '@/types/tracking';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface StatCardProps {
  label: string;
  value: number | string;
  to: string;
  hint?: string;
  danger?: boolean;
}

function StatCard({ label, value, to, hint, danger }: StatCardProps) {
  return (
    <Link to={to}>
      <Card className="transition-shadow hover:shadow-md">
        <CardBody>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={cn('mt-1 text-3xl font-bold', danger ? 'text-red-600' : 'text-slate-900')}>{value}</p>
          {hint && <p className={cn('mt-1 text-xs', danger ? 'text-red-500' : 'text-slate-400')}>{hint}</p>}
        </CardBody>
      </Card>
    </Link>
  );
}

const STATUS_TONE: Record<TripStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  DELAYED: 'warning',
  CANCELLED: 'danger',
};

export function SchoolAdminDashboardPage() {
  const schoolId = useAuthStore((state) => state.schoolId);
  const enabled = schoolId != null;
  const queryClient = useQueryClient();

  const { data: school } = useQuery({ queryKey: ['school', schoolId], queryFn: () => getSchool(schoolId!), enabled });
  const { data: activeSos } = useQuery({
    queryKey: ['active-sos', schoolId],
    queryFn: () => listActiveSos(schoolId!),
    enabled,
    refetchInterval: 15000,
  });
  const resolveSosMutation = useMutation({
    mutationFn: (sosEventId: number) => resolveSos(sosEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sos', schoolId] });
      toast.success('SOS marked resolved');
    },
    onError: () => toast.error('Could not resolve SOS'),
  });

  // One indexed-aggregate call for every stat card below, instead of fetching every vehicle,
  // driver, route, grievance, payment, and payroll row just to compute a length or a sum -
  // stays cheap as a school's data grows, and refetchInterval keeps the numbers live.
  const { data: stats } = useQuery({
    queryKey: ['school-dashboard-stats', schoolId],
    queryFn: () => getSchoolDashboardStats(schoolId!),
    enabled,
    refetchInterval: 20000,
  });

  // Still fetched separately (not from stats) because this page renders the actual trip rows,
  // not just a count.
  const { data: trips } = useQuery({
    queryKey: ['trips', schoolId, today()],
    queryFn: () => listTripsForSchool(schoolId!, today()),
    enabled,
  });

  const delayedTrips = stats?.tripsDelayed ?? 0;
  const payrollFailed = stats?.payrollFailed ?? 0;
  const payrollPending = stats?.payrollPending ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{school?.name ?? 'Dashboard'}</h1>
        <p className="text-sm text-slate-500">{school?.city}</p>
      </div>

      {activeSos && activeSos.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {activeSos.map((sos) => (
            <div key={sos.id} className="flex items-center justify-between gap-3">
              <span>
                SOS on trip #{sos.tripId} at {new Date(sos.triggeredAt).toLocaleTimeString()}
                {sos.note ? ` - ${sos.note}` : ''}
              </span>
              <Button
                variant="danger"
                isLoading={resolveSosMutation.isPending && resolveSosMutation.variables === sos.id}
                onClick={() => resolveSosMutation.mutate(sos.id)}
              >
                Mark resolved
              </Button>
            </div>
          ))}
        </div>
      )}
      {delayedTrips > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {delayedTrips} trip{delayedTrips > 1 ? 's are' : ' is'} currently running past dismissal time - see the
          Trips tab.
        </div>
      )}
      {payrollFailed > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {payrollFailed} driver payout{payrollFailed > 1 ? 's' : ''} failed to disburse this cycle.{' '}
          <Link to="/school-admin/payments" className="font-semibold underline">
            Review payroll
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Vehicles"
          value={stats?.vehiclesTotal ?? '—'}
          hint={stats ? `${stats.vehiclesActive} active` : undefined}
          to="/school-admin/vehicles"
        />
        <StatCard
          label="Drivers"
          value={stats?.driversTotal ?? '—'}
          hint={
            stats && stats.independentDriversAvailable > 0
              ? `${stats.independentDriversAvailable} available to hire`
              : undefined
          }
          to="/school-admin/drivers"
        />
        <StatCard label="Routes" value={stats?.routesTotal ?? '—'} to="/school-admin/routes" />
        <StatCard label="Students" value={stats?.studentsTotal ?? '—'} to="/school-admin/children" />
        <StatCard
          label="Trips today"
          value={stats?.tripsToday ?? '—'}
          hint={stats ? `${stats.tripsInProgress} in progress` : undefined}
          to="/school-admin/trips"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Open grievances" value={stats?.openGrievances ?? '—'} to="/school-admin/grievances" />
        <StatCard
          label="Revenue this month"
          value={`₹${(stats?.revenueThisMonth ?? 0).toLocaleString('en-IN')}`}
          to="/school-admin/payments"
        />
        <StatCard
          label="Payroll this cycle"
          value={payrollPending > 0 ? `${payrollPending} pending` : payrollFailed > 0 ? `${payrollFailed} failed` : 'up to date'}
          danger={payrollFailed > 0}
          to="/school-admin/payments"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&rsquo;s trips</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {trips?.map((trip) => (
              <li key={trip.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Route #{trip.routeId} &middot; {trip.direction === 'MORNING_PICKUP' ? 'Morning pickup' : 'Afternoon drop'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Vehicle #{trip.vehicleId} &middot; Driver #{trip.driverId}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[trip.status]}>{trip.status}</Badge>
              </li>
            ))}
            {trips?.length === 0 && <p className="py-3 text-sm text-slate-500">No trips scheduled for today yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
