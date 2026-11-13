import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getUserProfileSummary } from '@/lib/api/grievances';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import type { UserProfileSummary } from '@/types/grievance';

type Child = NonNullable<UserProfileSummary['children']>[number];

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

/** Complainant detail behind the grievances table: parent profile + their children, or driver profile. */
export function ComplainantPage({ backTo }: { backTo: string }) {
  const { t } = useTranslation();
  const { userId } = useParams();
  const id = Number(userId);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile-summary', id],
    queryFn: () => getUserProfileSummary(id),
    enabled: Number.isFinite(id),
  });

  const childColumns: DataColumn<Child>[] = [
    { key: 'name', header: t('common.name'), primary: true, cell: (c) => c.name },
    { key: 'class', header: t('common.class'), cell: (c) => c.className ?? '—' },
    { key: 'school', header: t('common.school'), cell: (c) => c.schoolName ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data?.name ?? t('grievances.complainant.title')}
        subtitle={data ? t(`enums.role.${data.role}`, { defaultValue: data.role }) : undefined}
        actions={
          <Link to={backTo} className="text-sm font-semibold text-primary-text underline-offset-2 hover:underline">
            {t('grievances.complainant.back')}
          </Link>
        }
      />
      {isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {isError && <EmptyState title={t('grievances.complainant.notFound')} />}
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('grievances.complainant.profile')}</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Row label={t('common.name')} value={data.name} />
                <Row label={t('common.phone')} value={data.phone} />
                <Row label={t('common.email')} value={data.email} />
                <Row label={t('common.address')} value={data.address} />
                <Row label={t('common.school')} value={data.schoolName} />
              </dl>
            </CardBody>
          </Card>

          {data.driver && (
            <Card>
              <CardHeader>
                <CardTitle>{t('grievances.complainant.driverProfile')}</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Row label={t('grievances.complainant.license')} value={data.driver.licenseNumber} />
                  <Row label={t('grievances.complainant.licenseExpiry')} value={data.driver.licenseExpiry} />
                  <Row label={t('grievances.col.vehicle')} value={data.driver.vehicleNo} />
                  <Row
                    label={t('common.status')}
                    value={
                      data.driver.employmentStatus
                        ? t(`enums.employmentStatus.${data.driver.employmentStatus}`, { defaultValue: data.driver.employmentStatus })
                        : null
                    }
                  />
                </dl>
              </CardBody>
            </Card>
          )}

          {data.role === 'PARENT' && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{t('grievances.complainant.children')}</h2>
              <DataTable
                caption={t('grievances.complainant.children')}
                columns={childColumns}
                rows={data.children}
                getRowKey={(c) => c.id}
                empty={<EmptyState title={t('grievances.complainant.noChildren')} />}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
