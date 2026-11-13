import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listClassrooms, listStudentsDirectory } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { SubscriptionBadge } from './components/SubscriptionBadge';
import type { StudentDirectoryRow } from '@/types/attendance';

const PAGE_SIZE = 25;

/** C2: cross-class "Students & Guardians" directory - filter by classroom and/or name search. Linked from the Classrooms hub. */
export function StudentsDirectoryPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [classroomId, setClassroomId] = useState<string>('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => setPage(0), [classroomId, debouncedQ]);

  const { data: classrooms } = useQuery({
    queryKey: ['classrooms', schoolId],
    queryFn: () => listClassrooms(schoolId!),
    enabled: schoolId != null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students-directory', schoolId, classroomId, debouncedQ, page],
    queryFn: () =>
      listStudentsDirectory(schoolId!, {
        classroomId: classroomId ? Number(classroomId) : undefined,
        q: debouncedQ || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: schoolId != null,
  });

  const columns: DataColumn<StudentDirectoryRow>[] = [
    {
      key: 'name',
      header: t('common.name'),
      primary: true,
      cell: (r) => (
        <Link to={`/school/students/${r.studentId}`} className="font-semibold text-primary-text hover:underline">
          {r.studentName}
        </Link>
      ),
    },
    {
      key: 'class',
      header: t('common.class'),
      cell: (r) => (r.className ? classroomLabel({ name: r.className, section: r.section }) : '—'),
    },
    { key: 'guardianName', header: t('studentsDirectory.guardianName'), cell: (r) => r.guardianName ?? '—' },
    { key: 'guardianPhone', header: t('studentsDirectory.guardianPhone'), cell: (r) => r.guardianPhone ?? '—' },
    { key: 'guardianEmail', header: t('studentsDirectory.guardianEmail'), cell: (r) => r.guardianEmail ?? '—' },
    { key: 'subscription', header: t('studentsDirectory.subscription'), cell: (r) => <SubscriptionBadge subscription={r.subscription} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('studentsDirectory.title')} subtitle={t('studentsDirectory.subtitle')} />

      <div className="flex flex-wrap items-end gap-3">
        <Select label={t('studentsDirectory.filterClass')} value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="min-w-[14rem]">
          <option value="">{t('studentsDirectory.allClasses')}</option>
          {classrooms?.map((c) => (
            <option key={c.id} value={c.id}>
              {classroomLabel(c)}
            </option>
          ))}
        </Select>
        <Input
          label={t('studentsDirectory.search')}
          placeholder={t('studentsDirectory.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[16rem]"
        />
      </div>

      <DataTable
        caption={t('studentsDirectory.title')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(r) => r.studentId}
        empty={<EmptyState icon={Users} title={t('studentsDirectory.emptyTitle')} description={t('studentsDirectory.emptyBody')} />}
      />
      <Pagination
        page={data?.page ?? 0}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
