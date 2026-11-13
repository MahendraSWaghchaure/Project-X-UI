import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, Upload, UserPlus, Users } from 'lucide-react';
import { listStudents } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import type { Classroom, Student } from '@/types/attendance';
import { ConsentChip, SendConsentButton } from './ConsentControls';
import { ImportStudentsModal } from './ImportStudentsModal';
import { StudentFormModal } from './StudentFormModal';
import { SubscriptionBadge } from './SubscriptionBadge';

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * Students of one classroom. The name links to the student detail page. School admins can add/import students
 * and send the guardian consent link from here; class teachers browse read-only. `studentBase` is the route prefix for the detail page.
 */
export function ClassStudentsTab({ classroom, canManage }: { classroom: Classroom; canManage: boolean }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => setPage(0), [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', schoolId, { classroomId: classroom.id, q, page }],
    queryFn: () => listStudents(schoolId!, { classroomId: classroom.id, q: q || undefined, page, size: PAGE_SIZE }),
    enabled: schoolId != null,
    placeholderData: keepPreviousData,
  });

  const columns: DataColumn<Student>[] = [
    { key: 'roll', header: t('students.rollNo'), cell: (s) => s.rollNo ?? '—', className: 'w-24' },
    {
      key: 'name',
      header: t('common.name'),
      primary: true,
      cell: (s) => (
        <Link to={`/school/students/${s.id}`} className="font-semibold text-primary-text underline-offset-2 hover:underline">
          {s.firstName} {s.lastName}
        </Link>
      ),
    },
    {
      key: 'guardian',
      header: t('students.guardianName'),
      cell: (s) =>
        s.guardianName ? (
          <div>
            <p>{s.guardianName}</p>
            <p className="text-xs text-slate-500">{s.guardianPhone}</p>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'bus', header: t('students.subscription'), cell: (s) => <SubscriptionBadge subscription={s.subscription} /> },
    ...(canManage
      ? [
          {
            key: 'consent',
            header: t('student.contactConsent'),
            cell: (s: Student) => (
              <div className="flex flex-col items-start gap-1.5">
                <ConsentChip student={s} />
                <SendConsentButton schoolId={schoolId!} student={s} />
              </div>
            ),
          } satisfies DataColumn<Student>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="relative flex min-w-64 flex-col gap-1 text-sm font-semibold text-slate-700">
          {t('students.search')}
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('students.searchPlaceholder')}
            className="rounded-lg border border-slate-300 bg-surface py-2 pl-9 pr-3 text-sm font-normal text-slate-900"
          />
        </label>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" />
              {t('students.import.button')}
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" />
              {t('students.add')}
            </Button>
          </div>
        )}
      </div>

      <DataTable
        caption={t('classroom.studentsTab')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(s) => s.id}
        empty={
          <EmptyState
            icon={Users}
            title={q ? t('students.emptyFilteredTitle') : t('students.emptyTitle')}
            description={q ? t('students.emptyFilteredBody') : canManage ? t('students.emptyBody') : t('students.emptyBodyTeacher')}
          />
        }
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} pageSize={PAGE_SIZE} onPageChange={setPage} />}

      {canManage && (
        <>
          <StudentFormModal open={showAdd} onClose={() => setShowAdd(false)} classrooms={[classroom]} defaultClassroomId={classroom.id} />
          <ImportStudentsModal open={showImport} onClose={() => setShowImport(false)} classrooms={[classroom]} />
        </>
      )}
    </div>
  );
}
