import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addClassroomPeriod, assignClassTeacher, deletePeriod, listClassroomPeriods, listTeachers } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { backendErrorMessage } from '@/lib/errorMessage';
import { shortTime } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import type { Classroom, TimetablePeriod } from '@/types/attendance';
import { AttendanceSheet } from './AttendanceSheet';
import { ClassStudentsTab } from './components/ClassStudentsTab';

type TabId = 'attendance' | 'students' | 'periods';

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Admin: the class timetable - list periods, add one (teacher, subject, day, time), delete one. */
export function ClassroomPeriodsTab({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState('1');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('09:45');

  const { data: periods, isLoading } = useQuery({
    queryKey: ['classroom-periods', schoolId, classroom.id],
    queryFn: () => listClassroomPeriods(schoolId!, classroom.id),
    enabled: schoolId != null,
  });
  const { data: teachers } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => listTeachers(schoolId!), enabled: schoolId != null });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['classroom-periods', schoolId, classroom.id] });
    void queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
    void queryClient.invalidateQueries({ queryKey: ['teacher-periods', schoolId] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addClassroomPeriod(schoolId!, classroom.id, {
        teacherId: Number(teacherId),
        subject: subject.trim(),
        dayOfWeek: Number(day),
        startTime: start,
        endTime: end,
      }),
    onSuccess: () => {
      toast.success(t('periods.added'));
      setSubject('');
      refresh();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('periods.addFailed'))),
  });
  const deleteMutation = useMutation({
    mutationFn: (periodId: number) => deletePeriod(schoolId!, periodId),
    onSuccess: () => {
      toast.success(t('periods.deleted'));
      refresh();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('periods.deleteFailed'))),
  });

  const valid = teacherId !== '' && subject.trim() !== '' && start < end;
  const columns: DataColumn<TimetablePeriod>[] = [
    { key: 'day', header: t('periods.day'), primary: true, cell: (p) => t(`enums.dayOfWeek.${p.dayOfWeek}`) },
    { key: 'time', header: t('common.time'), cell: (p) => `${shortTime(p.startTime)} - ${shortTime(p.endTime)}` },
    { key: 'subject', header: t('common.subject'), cell: (p) => p.subject },
    { key: 'teacher', header: t('periods.teacher'), cell: (p) => p.teacherName ?? `#${p.teacherId}` },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (p) => (
        <Button
          size="sm"
          variant="danger"
          isLoading={deleteMutation.isPending && deleteMutation.variables === p.id}
          onClick={() => deleteMutation.mutate(p.id)}
        >
          {t('common.delete')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody>
          <form
            className="grid grid-cols-2 gap-3 md:grid-cols-6 md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) addMutation.mutate();
            }}
            aria-label={t('periods.addTitle')}
          >
            <Select label={t('periods.teacher')} required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="col-span-2 md:col-span-1">
              <option value="">{t('periods.chooseTeacher')}</option>
              {teachers?.map((x) => (
                <option key={x.userId} value={x.userId}>
                  {x.name ?? x.email}
                </option>
              ))}
            </Select>
            <Input label={t('common.subject')} required value={subject} maxLength={80} onChange={(e) => setSubject(e.target.value)} />
            <Select label={t('periods.day')} value={day} onChange={(e) => setDay(e.target.value)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {t(`enums.dayOfWeek.${d}`)}
                </option>
              ))}
            </Select>
            <Input label={t('periods.start')} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label={t('periods.end')} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            <Button type="submit" isLoading={addMutation.isPending} disabled={!valid}>
              {t('periods.add')}
            </Button>
          </form>
        </CardBody>
      </Card>
      <DataTable
        caption={t('periods.title')}
        columns={columns}
        rows={periods}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        empty={<EmptyState title={t('periods.emptyTitle')} description={t('periods.emptyClassBody')} />}
      />
    </div>
  );
}

function ClassTeacherSelect({ classroom }: { classroom: Classroom }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const { data: teachers } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => listTeachers(schoolId!), enabled: schoolId != null });
  const mutation = useMutation({
    mutationFn: (teacherId: number | null) => assignClassTeacher(schoolId!, classroom.id, teacherId),
    onSuccess: () => {
      toast.success(t('classroom.teacherAssigned'));
      void queryClient.invalidateQueries({ queryKey: ['classrooms', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classroom-summary', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('classroom.teacherAssignFailed'))),
  });
  return (
    <Select
      label={t('classroom.classTeacher')}
      value={classroom.classTeacherId ?? ''}
      disabled={mutation.isPending}
      onChange={(e) => mutation.mutate(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{t('classroom.noClassTeacher')}</option>
      {teachers?.map((x) => (
        <option key={x.userId} value={x.userId}>
          {x.name ?? x.email}
          {x.classTeacherOfClassroomId != null && x.classTeacherOfClassroomId !== classroom.id
            ? ` (${x.classTeacherOfClassroomName ?? t('classroom.otherClass')})`
            : ''}
        </option>
      ))}
    </Select>
  );
}

/**
 * Classroom hub detail: Attendance | Students (| Periods for admins). `mode="admin"` is the school admin's view
 * (add students, import, send consent links, manage class teacher and periods); `mode="classTeacher"` is the
 * class teacher's "My Class" (mark attendance, browse students, add comments/assessments on the student page).
 */
export function ClassroomDetail({ classroom, mode, backTo }: { classroom: Classroom; mode: 'admin' | 'classTeacher'; backTo?: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('attendance');
  const admin = mode === 'admin';

  const tabs = [
    { id: 'attendance', label: t('classroom.attendanceTab') },
    { id: 'students', label: t('classroom.studentsTab'), count: classroom.studentCount },
    ...(admin ? [{ id: 'periods', label: t('classroom.periodsTab') }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {backTo && (
        <Link to={backTo} className="flex w-fit items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('classroom.back')}
        </Link>
      )}
      <PageHeader
        title={t('classrooms.classLabel', { name: classroomLabel(classroom) })}
        subtitle={classroom.classTeacherName ? t('classroom.taughtBy', { name: classroom.classTeacherName }) : t('classroom.noClassTeacher')}
      />
      {admin && (
        <div className="max-w-sm">
          <ClassTeacherSelect classroom={classroom} />
        </div>
      )}
      <Tabs label={t('classroom.tabsLabel')} value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs} />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'attendance' && <AttendanceSheet classroomId={classroom.id} />}
        {tab === 'students' && <ClassStudentsTab classroom={classroom} canManage={admin} />}
        {tab === 'periods' && admin && <ClassroomPeriodsTab classroom={classroom} />}
      </div>
    </div>
  );
}
