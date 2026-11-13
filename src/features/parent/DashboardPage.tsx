import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listMyChildren } from '@/lib/api/children';
import { getMyParentProfile } from '@/lib/api/parents';
import { listMyFeeInvoices, listMyWaiverRequests } from '@/lib/api/payments';
import { listMyGrievances } from '@/lib/api/grievances';
import { listMyNotifications } from '@/lib/api/notifications';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
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

export function ParentDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const { data: profile } = useQuery({ queryKey: ['my-parent-profile'], queryFn: getMyParentProfile });
  const { data: children } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });
  const { data: invoices } = useQuery({ queryKey: ['my-fee-invoices'], queryFn: listMyFeeInvoices });
  const { data: grievances } = useQuery({ queryKey: ['my-grievances'], queryFn: listMyGrievances });
  const { data: notifications } = useQuery({ queryKey: ['my-notifications'], queryFn: () => listMyNotifications(0, 20) });
  const { data: waivers } = useQuery({ queryKey: ['my-waivers'], queryFn: listMyWaiverRequests });

  const activeChildren = (children ?? []).filter((c) => c.status === 'ACTIVE');
  const unpaidInvoices = (invoices ?? []).filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const totalDue = unpaidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const overdueCount = unpaidInvoices.filter((i) => i.status === 'OVERDUE').length;
  const nextDue = [...unpaidInvoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const openGrievances = (grievances ?? []).filter((g) => g.status === 'OPEN' || g.status === 'IN_PROGRESS').length;
  const pendingWaivers = (waivers ?? []).filter((w) => w.status === 'PENDING').length;
  const recentNotifications = [...(notifications?.content ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const heroSubtitle =
    activeChildren.length === 0
      ? t('parentDash.heroNone')
      : activeChildren.length === 1
        ? t('parentDash.heroOne', { name: activeChildren[0].firstName })
        : t('parentDash.heroMany');

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 text-white shadow-sm">
        <p className="text-sm text-white/85">
          {t(`driver.dashboard.greeting.${greetingKey()}`)}
          {profile?.firstName ? `, ${profile.firstName}` : ''}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{heroSubtitle}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('parentDash.children')} value={activeChildren.length} to="/parent/children" />
        <StatCard
          label={t('parentDash.feeDue')}
          value={`₹${totalDue.toFixed(0)}`}
          hint={
            overdueCount > 0
              ? t('parentDash.overdueHint', { count: overdueCount })
              : nextDue
                ? t('parentDash.dueHint', { date: nextDue.dueDate })
                : t('parentDash.allClear')
          }
          danger={overdueCount > 0}
          to="/parent/payments"
        />
        <StatCard label={t('parentDash.openGrievances')} value={openGrievances} to="/parent/grievances" />
        <StatCard label={t('notifications.title')} value={notifications?.totalElements ?? 0} to="/parent/notifications" />
      </div>

      {overdueCount > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t('parentDash.overdueBanner', { count: overdueCount, total: totalDue.toFixed(0) })}{' '}
          <Link to="/parent/payments" className="font-semibold underline">
            {t('parentDash.payNow')}
          </Link>{' '}
          {t('parentDash.orWaiver')}
          {pendingWaivers > 0 && <span className="ml-1">{t('parentDash.waiversPending', { count: pendingWaivers })}</span>}
        </div>
      )}
      {overdueCount === 0 && nextDue && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('parentDash.nextPayment', { amount: nextDue.totalAmount.toFixed(0), date: nextDue.dueDate })}{' '}
          <Link to="/parent/payments" className="font-semibold underline">
            {t('parentDash.payAdvanceLink')}
          </Link>
          .
        </div>
      )}
      {overdueCount === 0 && !nextDue && activeChildren.length > 0 && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('parentDash.allPaid')}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t('parentDash.myChildren')}</CardTitle>
            <Link to="/parent/children" className="text-sm font-medium text-blue-600 hover:underline">
              {t('parentDash.manage')}
            </Link>
          </CardHeader>
          <CardBody>
            {activeChildren.length === 0 && <p className="text-sm text-slate-500">{t('parentChildren.empty')}</p>}
            <ul className="divide-y divide-slate-100">
              {activeChildren.map((child) => (
                <li key={child.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{child.classSection ?? t('parentDash.noClass')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={child.routeId ? 'success' : 'neutral'}>{child.routeId ? t('parentDash.routeAssigned') : t('parentDash.noRoute')}</Badge>
                    <Badge tone={child.insurancePolicyId ? 'info' : 'neutral'}>
                      {child.insurancePolicyId ? t('parentChildren.insured') : t('parentChildren.notInsured')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('parentDash.quickActions')}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Link to="/parent/track">
              <Button variant="secondary" className="w-full justify-start">
                {t('parentDash.trackLive')}
              </Button>
            </Link>
            <Link to="/parent/payments">
              <Button variant="secondary" className="w-full justify-start">
                {t('parentDash.payFees')}
              </Button>
            </Link>
            <Link to="/parent/grievances">
              <Button variant="secondary" className="w-full justify-start">
                {t('parentDash.raiseGrievance')}
              </Button>
            </Link>
            <Link to="/parent/children">
              <Button variant="secondary" className="w-full justify-start">
                {t('parentDash.manageChildren')}
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t('parentDash.recentNotifications')}</CardTitle>
          <Link to="/parent/notifications" className="text-sm font-medium text-blue-600 hover:underline">
            {t('parentDash.viewAll')}
          </Link>
        </CardHeader>
        <CardBody>
          {recentNotifications.length === 0 && <p className="text-sm text-slate-500">{t('parentApp.noNotifications')}</p>}
          <ul className="divide-y divide-slate-100">
            {recentNotifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 capitalize">{t(`parentApp.notificationTemplate.${n.templateKey}`, { defaultValue: n.templateKey.replaceAll('_', ' ').toLowerCase() })}</span>
                <span className="text-slate-400">{new Date(n.createdAt).toLocaleString(locale)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
