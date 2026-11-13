import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquareWarning } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchAllGrievances, searchSchoolGrievances } from '@/lib/api/grievances';
import { listSchools } from '@/lib/api/schools';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { GrievanceStatusBadge } from '@/components/grievance/GrievanceStatusBadge';
import type { Grievance, GrievanceStatus, GrievanceType } from '@/types/grievance';
import { GrievanceDetailDrawer } from './GrievanceDetailDrawer';
import { grievanceTypeLabel } from './grievanceLabels';

const PAGE_SIZE = 20;
const STATUSES: GrievanceStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
const TYPES: GrievanceType[] = [
  'VEHICLE_CONDITION',
  'DRIVER_BEHAVIOR',
  'ROUTE_DELAY',
  'SAFETY_CONCERN',
  'PAYMENT_ISSUE',
  'STUDENT_PARENT_BEHAVIOR',
  'SCHOOL_COORDINATION',
  'OTHER',
];

/**
 * Grievances table shared by the platform admin (all schools) and the school admin (own school).
 * Server-side paging and status/type filters; the complainant name links to their profile page.
 */
export function GrievanceTable({ mode }: { mode: 'platform' | 'school' }) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const queryClient = useQueryClient();
  const authSchoolId = useAuthStore((s) => s.schoolId);
  const [status, setStatus] = useState<GrievanceStatus | ''>('');
  const [type, setType] = useState<GrievanceType | ''>('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['grievances-table', mode, authSchoolId, status, type, schoolFilter, page],
    queryFn: () => {
      const params = { status: status || undefined, type: type || undefined, page, size: PAGE_SIZE };
      return mode === 'platform'
        ? searchAllGrievances({ ...params, schoolId: schoolFilter ? Number(schoolFilter) : undefined })
        : searchSchoolGrievances(authSchoolId!, params);
    },
    enabled: mode === 'platform' || authSchoolId != null,
  });
  const { data: schools } = useQuery({
    queryKey: ['schools', 'all-for-filter'],
    queryFn: () => listSchools(),
    enabled: mode === 'platform',
  });

  useLiveTopic(
    [mode === 'platform' ? '/topic/platform-admin/grievances' : authSchoolId ? `/topic/schools/${authSchoolId}/grievances` : null],
    () => {
      void queryClient.invalidateQueries({ queryKey: ['grievances-table'] });
    },
  );

  const complainantBase = mode === 'platform' ? '/platform-admin/users' : '/school-admin/users';

  const columns: DataColumn<Grievance>[] = [
    {
      key: 'complainant',
      header: t('grievances.col.complainant'),
      primary: true,
      cell: (g) =>
        g.complainantName ? (
          <Link
            className="font-medium text-primary-text underline-offset-2 hover:underline"
            to={`${complainantBase}/${g.raisedByUserId}`}
            onClick={(e) => e.stopPropagation()}
          >
            {g.complainantName}
          </Link>
        ) : (
          <span>{g.raisedByEmail}</span>
        ),
    },
    {
      key: 'role',
      header: t('grievances.col.role'),
      cell: (g) => t(`enums.role.${g.raisedByRole}`, { defaultValue: g.raisedByRole }),
    },
    { key: 'driver', header: t('grievances.col.driver'), cell: (g) => g.driverName ?? '—' },
    { key: 'vehicle', header: t('grievances.col.vehicle'), cell: (g) => g.vehicleNo ?? '—' },
    { key: 'type', header: t('grievances.col.type'), cell: (g) => grievanceTypeLabel(t, g) },
    { key: 'status', header: t('common.status'), cell: (g) => <GrievanceStatusBadge status={g.status} /> },
    { key: 'raised', header: t('grievances.col.raised'), cell: (g) => formatDateTime(g.createdAt, locale) },
    ...(mode === 'platform'
      ? [{ key: 'school', header: t('grievances.col.school'), cell: (g: Grievance) => g.schoolName ?? t('grievances.noSchool') }]
      : []),
    {
      key: 'daysOpen',
      header: t('grievances.col.daysOpen'),
      cell: (g) => t('common.daysOpen', { count: g.daysOpen ?? 0 }),
    },
    {
      key: 'view',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (g) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(g.id);
          }}
          aria-label={t('grievances.viewOne', { subject: g.subject })}
        >
          {t('common.view')}
        </Button>
      ),
    },
  ];

  const resetPage = () => setPage(0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('grievances.title')}
        subtitle={mode === 'platform' ? t('grievances.subtitlePlatform') : t('grievances.subtitleSchool')}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t('common.status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as GrievanceStatus | '');
            resetPage();
          }}
        >
          <option value="">{t('common.all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`enums.grievanceStatus.${s}`)}
            </option>
          ))}
        </Select>
        <Select
          label={t('grievances.col.type')}
          value={type}
          onChange={(e) => {
            setType(e.target.value as GrievanceType | '');
            resetPage();
          }}
        >
          <option value="">{t('common.all')}</option>
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`enums.grievanceType.${x}`)}
            </option>
          ))}
        </Select>
        {mode === 'platform' && (
          <Select
            label={t('grievances.col.school')}
            value={schoolFilter}
            onChange={(e) => {
              setSchoolFilter(e.target.value);
              resetPage();
            }}
          >
            <option value="">{t('common.all')}</option>
            {schools?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <DataTable
        caption={t('grievances.title')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(g) => g.id}
        onRowClick={(g) => setOpenId(g.id)}
        empty={<EmptyState icon={MessageSquareWarning} title={t('grievances.emptyTitle')} description={t('grievances.emptyBody')} />}
      />
      <Pagination
        page={data?.page ?? 0}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <GrievanceDetailDrawer
        grievanceId={openId}
        onClose={() => setOpenId(null)}
        complainantBase={complainantBase}
        invalidateKey={['grievances-table']}
      />
    </div>
  );
}
