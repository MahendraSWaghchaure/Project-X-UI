import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSchoolOverview } from '@/lib/api/schools';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { GrievanceStatusBadge } from '@/components/grievance/GrievanceStatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import type { SchoolOverviewDriver } from '@/types/school';

const VERIFICATION_TONE: Record<string, BadgeTone> = { VERIFIED: 'success', REJECTED: 'danger', PENDING: 'warning' };

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

/** B1: clicking a school in the platform-admin list lands here - info, drivers, counts, status(+reason), recent grievances. */
export function SchoolDetailPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const schoolId = Number(id);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['school-overview', schoolId],
    queryFn: () => getSchoolOverview(schoolId),
    enabled: Number.isFinite(schoolId),
  });

  const driverColumns: DataColumn<SchoolOverviewDriver>[] = [
    { key: 'name', header: t('common.name'), primary: true, cell: (d) => d.name },
    { key: 'phone', header: t('common.phone'), cell: (d) => d.phone ?? '—' },
    { key: 'vehicle', header: t('platformSchools.overview.vehicle'), cell: (d) => d.vehicleRegistrationNumber ?? '—' },
    {
      key: 'verification',
      header: t('platformSchools.overview.verification'),
      cell: (d) => <Badge tone={VERIFICATION_TONE[d.verificationStatus]}>{t(`enums.verificationStatus.${d.verificationStatus}`, { defaultValue: d.verificationStatus })}</Badge>,
    },
  ];

  if (isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (!overview) return <EmptyState icon={Building2} title={t('platformSchools.overview.notFound')} />;

  const { school } = overview;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/platform-admin/schools" className="flex w-fit items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('platformSchools.overview.back')}
      </Link>

      <PageHeader
        title={school.name}
        subtitle={school.address ? `${school.city} — ${school.address}` : school.city}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={school.status === 'ACTIVE' ? 'success' : 'warning'}>{t(`enums.schoolStatus.${school.status}`, { defaultValue: school.status })}</Badge>
          </div>
        }
      />

      {school.status === 'SUSPENDED' && (
        <Card className="border-alert-200 bg-alert-50">
          <CardBody>
            <p className="text-sm font-semibold text-alert-700">{t('platformSchools.suspensionReason')}</p>
            <p className="mt-1 text-sm text-alert-700">{school.statusReason ?? t('platformSchools.noReason')}</p>
          </CardBody>
        </Card>
      )}

      <section aria-label={t('platformSchools.overview.summary')} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('platformSchools.overview.vehicles')} value={overview.vehicleCount} />
        <StatTile label={t('platformSchools.overview.students')} value={overview.studentCount} />
        <StatTile label={t('platformSchools.overview.subscribed')} value={overview.subscribedCount} />
        <StatTile label={t('platformSchools.overview.openGrievances')} value={overview.openGrievances} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('platformSchools.overview.contact')}</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('common.phone')}</p>
            <p className="text-sm text-slate-900">{school.contactPhone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('common.email')}</p>
            <p className="text-sm text-slate-900">{school.contactEmail ?? '—'}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('platformSchools.overview.driversTitle')}</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            caption={t('platformSchools.overview.driversTitle')}
            columns={driverColumns}
            rows={overview.drivers}
            getRowKey={(d) => d.driverId}
            empty={<EmptyState title={t('platformSchools.overview.noDrivers')} />}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('platformSchools.overview.recentGrievances')}</CardTitle>
        </CardHeader>
        <CardBody>
          {overview.recentGrievances.length === 0 ? (
            <p className="text-sm text-slate-500">{t('platformSchools.overview.noGrievances')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {overview.recentGrievances.map((g) => (
                <li
                  key={g.id}
                  className="flex cursor-pointer items-center justify-between gap-4 py-2.5 hover:bg-slate-50"
                  onClick={() => navigate(`/platform-admin/grievances`)}
                >
                  <div>
                    <p className="font-medium text-slate-900">{g.subject}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(g.createdAt, locale)}</p>
                  </div>
                  <GrievanceStatusBadge status={g.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
