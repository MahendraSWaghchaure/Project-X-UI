import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listMyTripsAsDriver } from '@/lib/api/trips';
import { getMyBankDetails, listMyPayroll } from '@/lib/api/payments';
import { listMyGrievances } from '@/lib/api/grievances';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { TripStatus } from '@/types/tracking';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const STATUS_TONE: Record<TripStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  DELAYED: 'warning',
  CANCELLED: 'danger',
};

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

export function DriverDashboardPage() {
  const { t } = useTranslation();
  const { data: trips } = useQuery({ queryKey: ['my-trips', today()], queryFn: () => listMyTripsAsDriver(today()) });
  const { data: payroll } = useQuery({ queryKey: ['my-payroll'], queryFn: listMyPayroll });
  const { data: bankDetails, isFetched: bankFetched } = useQuery({
    queryKey: ['my-bank-details'],
    queryFn: getMyBankDetails,
    retry: false,
  });
  const { data: grievances } = useQuery({ queryKey: ['my-grievances'], queryFn: listMyGrievances });

  const pendingTrips = (trips ?? []).filter((trip) => trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS').length;
  const openGrievances = (grievances ?? []).filter((g) => g.status === 'OPEN' || g.status === 'IN_PROGRESS').length;
  const latestPayroll = [...(payroll ?? [])].sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  const bankMissing = bankFetched && !bankDetails;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl bg-brand-600 px-5 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm text-brand-200">{t(`driver.dashboard.greeting.${greetingKey()}`)}</p>
          <h1 className="mt-1 text-2xl font-bold">
            {pendingTrips > 0 ? t('driver.dashboard.tripsToRun', { count: pendingTrips }) : t('driver.dashboard.noTripsLeft')}
          </h1>
        </div>
        {/* The one amber hero CTA on this screen. */}
        <Link to="/driver/trips" className="shrink-0">
          <Button variant="accent" size="lg" className="w-full sm:w-auto">
            {t('driver.dashboard.openTrips')}
          </Button>
        </Link>
      </div>

      {bankMissing && (
        <div className="rounded-md border border-pending-200 bg-pending-50 px-4 py-3 text-sm text-pending-700">
          {t('driverDash.bankMissing')}{' '}
          <Link to="/driver/payroll" className="font-semibold underline">
            {t('driverDash.addBank')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('driverDash.tripsToday')} value={trips?.length ?? '—'} hint={t('driverDash.remaining', { count: pendingTrips })} to="/driver/trips" />
        <StatCard
          label={t('driverDash.lastPayroll')}
          value={latestPayroll ? `₹${(latestPayroll.totalPaid ?? latestPayroll.baseSalary).toFixed(0)}` : '—'}
          hint={
            latestPayroll
              ? t(`enums.payStatus.${latestPayroll.status}`, { defaultValue: latestPayroll.status })
              : t('driverDash.noHistory')
          }
          danger={latestPayroll?.status === 'FAILED'}
          to="/driver/payroll"
        />
        <StatCard label={t('driverDash.openGrievances')} value={openGrievances} to="/driver/grievances" />
        <StatCard label={t('driverDash.bankDetails')} value={bankMissing ? t('driverDash.missing') : t('driverDash.onFile')} danger={bankMissing} to="/driver/payroll" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t('driverDash.todaysTrips')}</CardTitle>
            <Link to="/driver/trips" className="text-sm font-medium text-blue-600 hover:underline">
              {t('driverDash.manage')} &rarr;
            </Link>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {trips?.map((trip) => (
                <li key={trip.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {trip.direction === 'MORNING_PICKUP' ? t('driver.morning') : t('driver.afternoon')}
                    </p>
                    <p className="text-sm text-slate-500">{t('driver.route', { id: trip.routeId })}</p>
                  </div>
                  <Badge tone={STATUS_TONE[trip.status]}>{t(`enums.tripStatus.${trip.status}`)}</Badge>
                </li>
              ))}
              {trips?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('driverDash.noTrips')}</p>}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('driverDash.quickActions')}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Link to="/driver/trips">
              <Button variant="secondary" className="w-full justify-start">
                {t('driverDash.startTrips')}
              </Button>
            </Link>
            <Link to="/driver/payroll">
              <Button variant="secondary" className="w-full justify-start">
                {t('driverDash.viewSalary')}
              </Button>
            </Link>
            <Link to="/driver/grievances">
              <Button variant="secondary" className="w-full justify-start">
                {t('driverDash.raiseGrievance')}
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
