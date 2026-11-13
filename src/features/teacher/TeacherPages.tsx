import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, BookOpen, CalendarClock, School } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyAlerts, listMyPeriods, listStudents } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { todayIst } from '@/lib/dates';
import { formatDateTime, shortTime, useIntlLocale } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ClassroomDetail } from '@/features/school/ClassroomDetail';
import { AssessmentsPanel } from '@/features/school/components/AssessmentsPanel';
import type { Student, TeacherAlert, TeacherClassroom } from '@/types/attendance';
import { useTeacherClassroomAccess } from './useTeacherAccess';

/** Teacher home: today at a glance (their class, today's periods, alerts) with shortcuts. */
export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const today = todayIst();
  const { classTeacherOf, lecturerOf, isLoading } = useTeacherClassroomAccess();
  const { data: schedule } = useQuery({ queryKey: ['my-periods'], queryFn: listMyPeriods });
  const { data: alerts } = useQuery({ queryKey: ['my-alerts', today], queryFn: () => listMyAlerts(today) });

  // ISO weekday of "today" in the browser (1 = Monday ... 7 = Sunday), matching TimetablePeriod.dayOfWeek.
  const weekday = ((new Date().getDay() + 6) % 7) + 1;
  const todaysPeriods = schedule?.find((d) => d.dayOfWeek === weekday)?.periods ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('teacher.dashboard.title')} subtitle={t('teacher.dashboard.subtitle')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card interactive>
          <CardBody className="flex flex-col gap-2">
            <School className="h-6 w-6 text-primary-text" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-500">{t('teacher.dashboard.myClass')}</p>
            <p className="text-xl font-bold text-slate-900">
              {isLoading ? '…' : classTeacherOf ? classroomLabel(classTeacherOf.classroom) : t('teacher.dashboard.noClass')}
            </p>
            {classTeacherOf && (
              <Link to="/teacher/class" className="text-sm font-semibold text-primary-text hover:underline">
                {t('teacher.dashboard.openClass')}
              </Link>
            )}
          </CardBody>
        </Card>
        <Card interactive>
          <CardBody className="flex flex-col gap-2">
            <CalendarClock className="h-6 w-6 text-primary-text" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-500">{t('teacher.dashboard.periodsToday')}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{todaysPeriods.length}</p>
            <Link to="/teacher/periods" className="text-sm font-semibold text-primary-text hover:underline">
              {t('teacher.dashboard.openPeriods')}
            </Link>
          </CardBody>
        </Card>
        <Card interactive>
          <CardBody className="flex flex-col gap-2">
            <BellRing className="h-6 w-6 text-alert-700" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-500">{t('teacher.dashboard.alertsToday')}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{alerts?.length ?? 0}</p>
            <Link to="/teacher/alerts" className="text-sm font-semibold text-primary-text hover:underline">
              {t('teacher.dashboard.openAlerts')}
            </Link>
          </CardBody>
        </Card>
      </div>
      {lecturerOf.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('teacher.dashboard.lecturerClasses')}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {lecturerOf.map((m) => (
              <Badge key={m.classroom.id} tone="info">
                {classroomLabel(m.classroom)} &middot; {m.subjects.join(', ')}
              </Badge>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/** "My Class": the class teacher's own classroom (attendance + students). Only exists for a class teacher. */
export function MyClassPage() {
  const { t } = useTranslation();
  const { classTeacherOf, isLoading } = useTeacherClassroomAccess();
  if (isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (!classTeacherOf) {
    return <EmptyState icon={School} title={t('teacher.myClass.noneTitle')} description={t('teacher.myClass.noneBody')} />;
  }
  return <ClassroomDetail key={classTeacherOf.classroom.id} classroom={classTeacherOf.classroom} mode="classTeacher" />;
}

/** "My Periods": the teacher's weekly timetable grouped by day. */
export function MyPeriodsPage() {
  const { t } = useTranslation();
  const { data: schedule, isLoading } = useQuery({ queryKey: ['my-periods'], queryFn: listMyPeriods });
  const days = useMemo(() => (schedule ?? []).filter((d) => d.periods.length > 0).sort((a, b) => a.dayOfWeek - b.dayOfWeek), [schedule]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('teacher.periods.title')} subtitle={t('teacher.periods.subtitle')} />
      {isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {!isLoading && days.length === 0 && (
        <EmptyState icon={CalendarClock} title={t('teacher.periods.emptyTitle')} description={t('teacher.periods.emptyBody')} />
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {days.map((day) => (
          <Card key={day.dayOfWeek}>
            <CardHeader>
              <CardTitle>{t(`enums.dayOfWeek.${day.dayOfWeek}`)}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="flex flex-col divide-y divide-slate-100">
                {[...day.periods]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="font-semibold text-slate-900">{p.subject}</p>
                        <p className="text-sm text-slate-500">{p.classroomName ?? `#${p.classroomId}`}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold tabular-nums text-primary-text">
                        {shortTime(p.startTime)} - {shortTime(p.endTime)}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudentAssessmentsModal({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  return (
    <Modal
      open={student !== null}
      onClose={onClose}
      size="lg"
      title={t('teacher.exams.studentTitle', { name: student ? `${student.firstName} ${student.lastName}` : '' })}
    >
      {student && schoolId != null && <AssessmentsPanel schoolId={schoolId} studentId={student.id} />}
    </Modal>
  );
}

/**
 * "Exams": for the classes where the teacher is a lecturer - pick a class, then record or review exam results per student.
 * Assessments only: a lecturer has no attendance, comments or guardian contacts (the server enforces this too).
 */
export function ExamsPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { lecturerOf, isLoading } = useTeacherClassroomAccess();
  const [selected, setSelected] = useState<number | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const classroomId = selected ?? lecturerOf[0]?.classroom.id ?? null;
  const entry: TeacherClassroom | undefined = lecturerOf.find((m) => m.classroom.id === classroomId);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', schoolId, { classroomId, exams: true }],
    queryFn: () => listStudents(schoolId!, { classroomId: classroomId!, size: 100 }),
    enabled: schoolId != null && classroomId != null,
  });

  const columns: DataColumn<Student>[] = [
    { key: 'roll', header: t('students.rollNo'), cell: (s) => s.rollNo ?? '—', className: 'w-24' },
    { key: 'name', header: t('common.name'), primary: true, cell: (s) => <span className="font-semibold">{s.firstName} {s.lastName}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (s) => (
        <Button size="sm" variant="secondary" onClick={() => setStudent(s)}>
          {t('teacher.exams.results')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('teacher.exams.title')} subtitle={t('teacher.exams.subtitle')} />
      {!isLoading && lecturerOf.length === 0 && (
        <EmptyState icon={BookOpen} title={t('teacher.exams.noneTitle')} description={t('teacher.exams.noneBody')} />
      )}
      {lecturerOf.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label={t('common.class')}
              value={classroomId ?? ''}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {lecturerOf.map((m) => (
                <option key={m.classroom.id} value={m.classroom.id}>
                  {classroomLabel(m.classroom)}
                </option>
              ))}
            </Select>
            {entry && entry.subjects.length > 0 && (
              <p className="pb-2 text-sm text-slate-600">{t('teacher.exams.yourSubjects', { subjects: entry.subjects.join(', ') })}</p>
            )}
          </div>
          <DataTable
            caption={t('teacher.exams.title')}
            columns={columns}
            rows={students?.content}
            isLoading={studentsLoading}
            getRowKey={(s) => s.id}
            empty={<EmptyState title={t('sheet.noStudentsTitle')} />}
          />
        </>
      )}
      <StudentAssessmentsModal student={student} onClose={() => setStudent(null)} />
    </div>
  );
}

/** One alert's details, shared by the Alerts list and the live popup. Parent contact only exists for the class teacher. */
export function AlertDetails({ alert }: { alert: TeacherAlert }) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('teacher.alerts.student')}</dt>
        <dd className="font-semibold text-slate-900">{alert.studentName}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('common.class')}</dt>
        <dd>{alert.classroomName ?? `#${alert.classroomId}`}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('teacher.alerts.droppedAt')}</dt>
        <dd>{formatDateTime(alert.droppedAt, locale)}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('grievances.col.driver')}</dt>
        <dd>{alert.driverName ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('grievances.col.vehicle')}</dt>
        <dd>{alert.vehicleNo ?? '—'}</dd>
      </div>
      {alert.guardianPhone && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('teacher.alerts.parent')}</dt>
          <dd>
            {alert.guardianName ?? ''}{' '}
            <a className="font-semibold text-primary-text underline" href={`tel:${alert.guardianPhone}`}>
              {alert.guardianPhone}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

/** "Alerts": children the driver dropped at school who are not marked present in the register. */
export function AlertsPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIst());
  const { data: alerts, isLoading } = useQuery({ queryKey: ['my-alerts', date], queryFn: () => listMyAlerts(date) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('teacher.alerts.title')} subtitle={t('teacher.alerts.subtitle')} />
      <label className="flex w-fit flex-col gap-1 text-sm font-semibold text-slate-700">
        {t('sheet.date')}
        <input
          type="date"
          value={date}
          max={todayIst()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="min-h-11 rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm"
        />
      </label>
      {isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {alerts && alerts.length === 0 && (
        <EmptyState icon={BellRing} title={t('teacher.alerts.emptyTitle')} description={t('teacher.alerts.emptyBody')} />
      )}
      <ul className="flex flex-col gap-3">
        {alerts?.map((a) => (
          <li key={a.arrivalId} className="rounded-xl border border-alert-200 bg-alert-50 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-alert-700">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {t('teacher.alerts.headline')}
            </p>
            <AlertDetails alert={a} />
          </li>
        ))}
      </ul>
    </div>
  );
}
