import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Plus, Trash2, Wand2 } from 'lucide-react';
import { generateTimetable, listClassrooms, listTeachers, previewTimetable } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import type { GenerateTimetableRequest, GenerateTimetableResult, TimetableBreak } from '@/types/attendance';

const WORKING_DAYS_DEFAULT = [1, 2, 3, 4, 5, 6];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

/**
 * C5: admin inputs the school day's shape + which teachers teach what + which classes to cover, previews the
 * proposed grid (a dry run, nothing written), then commits. Documented algorithm (see backend ARCHITECTURE.md
 * per the plan): greedy assignment with a daily cap per teacher - a class's own class-teacher's subject gets
 * that class's first period every day it has one; a teacher is never double-booked in the same day+period across
 * classrooms; a teacher teaching one subject to one class/section is softly capped at 2 periods/day for that pair;
 * anything that cannot be placed is reported back as "unfilled" rather than silently dropped.
 */
export function TimetableAdminPage() {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();

  const { data: classrooms } = useQuery({ queryKey: ['classrooms', schoolId], queryFn: () => listClassrooms(schoolId!), enabled: schoolId != null });
  const { data: teachers } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => listTeachers(schoolId!), enabled: schoolId != null });

  const classNames = useMemo(() => dedupe((classrooms ?? []).map((c) => c.name)), [classrooms]);

  const [periodLengthMinutes, setPeriodLengthMinutes] = useState(45);
  const [firstPeriodStart, setFirstPeriodStart] = useState('08:30');
  const [lastPeriodEnd, setLastPeriodEnd] = useState('15:00');
  const [breaks, setBreaks] = useState<TimetableBreak[]>([{ start: '11:00', durationMinutes: 30 }]);
  const [workingDays, setWorkingDays] = useState<number[]>(WORKING_DAYS_DEFAULT);
  const [teacherSubjectsText, setTeacherSubjectsText] = useState<Record<number, string>>({});
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [periodsPerWeek, setPeriodsPerWeek] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GenerateTimetableResult | null>(null);
  const [committed, setCommitted] = useState(false);

  const subjectsByTeacher = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const [id, text] of Object.entries(teacherSubjectsText)) {
      map[Number(id)] = dedupe(text.split(','));
    }
    return map;
  }, [teacherSubjectsText]);

  const allSubjects = useMemo(() => dedupe(Object.values(subjectsByTeacher).flat()), [subjectsByTeacher]);

  const loadKey = (className: string, subject: string) => `${className}\u0000${subject}`;

  function toggleDay(day: number) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function toggleClass(name: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addBreak() {
    setBreaks((prev) => [...prev, { start: '13:00', durationMinutes: 30 }]);
  }

  function removeBreak(index: number) {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  }

  function buildRequest(): GenerateTimetableRequest {
    const classes = Array.from(selectedClasses);
    const subjectLoads = classes.flatMap((className) =>
      allSubjects.map((subject) => ({ className, subject, periodsPerWeek: periodsPerWeek[loadKey(className, subject)] ?? 5 })),
    );
    return {
      periodLengthMinutes,
      firstPeriodStart,
      lastPeriodEnd,
      breaks,
      workingDays,
      teachers: Object.entries(subjectsByTeacher)
        .filter(([, subjects]) => subjects.length > 0)
        .map(([teacherId, subjects]) => ({ teacherId: Number(teacherId), subjects })),
      classNames: classes,
      subjectLoads,
    };
  }

  const canRun = schoolId != null && selectedClasses.size > 0 && allSubjects.length > 0 && workingDays.length > 0;

  const previewMutation = useMutation({
    mutationFn: () => previewTimetable(schoolId!, buildRequest()),
    onSuccess: (r) => {
      setResult(r);
      setCommitted(r.written);
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('timetableAdmin.previewFailed'))),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateTimetable(schoolId!, buildRequest()),
    onSuccess: (r) => {
      setResult(r);
      setCommitted(r.written);
      // Generating writes periods for every classroom/teacher touched - invalidate the same keys
      // ClassroomDetail.tsx, TeachersPage.tsx and the teacher-facing schedule read, so they don't
      // keep showing the pre-generate schedule (matches CorrectionRequestsPage's approveMutation pattern).
      void queryClient.invalidateQueries({ queryKey: ['classroom-periods', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-periods', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['my-periods'] });
      toast.success(t('timetableAdmin.generated', { count: r.periods.length }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('timetableAdmin.generateFailed'))),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof result extends null ? never : NonNullable<typeof result>['periods']>();
    for (const period of result?.periods ?? []) {
      const key = `${period.classroomId}`;
      const list = map.get(key) ?? [];
      list.push(period);
      map.set(key, list);
    }
    return map;
  }, [result]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('timetableAdmin.title')} subtitle={t('timetableAdmin.subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('timetableAdmin.dayShape')}</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={t('timetableAdmin.periodLength')}
            type="number"
            min={10}
            max={120}
            required
            value={periodLengthMinutes}
            onChange={(e) => setPeriodLengthMinutes(Number(e.target.value))}
          />
          <Input label={t('timetableAdmin.firstStart')} type="time" required value={firstPeriodStart} onChange={(e) => setFirstPeriodStart(e.target.value)} />
          <Input label={t('timetableAdmin.lastEnd')} type="time" required value={lastPeriodEnd} onChange={(e) => setLastPeriodEnd(e.target.value)} />

          <div className="flex flex-col gap-2 sm:col-span-3">
            <span className="text-sm font-semibold text-slate-700">{t('timetableAdmin.workingDays')}</span>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
                    workingDays.includes(d) ? 'border-primary bg-primary text-on-primary' : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {t(`enums.dayOfWeek.${d}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-3">
            <span className="text-sm font-semibold text-slate-700">{t('timetableAdmin.breaks')}</span>
            {breaks.map((b, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Input
                  label={t('timetableAdmin.breakStart')}
                  type="time"
                  value={b.start}
                  onChange={(e) =>
                    setBreaks((prev) => prev.map((x, idx) => (idx === i ? { ...x, start: e.target.value } : x)))
                  }
                />
                <Input
                  label={t('timetableAdmin.breakDuration')}
                  type="number"
                  min={5}
                  max={120}
                  value={b.durationMinutes}
                  onChange={(e) =>
                    setBreaks((prev) => prev.map((x, idx) => (idx === i ? { ...x, durationMinutes: Number(e.target.value) } : x)))
                  }
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeBreak(i)} aria-label={t('common.delete')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={addBreak}>
              <Plus className="h-4 w-4" />
              {t('timetableAdmin.addBreak')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('timetableAdmin.teachersSubjects')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t('timetableAdmin.teachersHelp')}</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {(teachers ?? []).map((teacher) => (
            <div key={teacher.userId} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr,2fr]">
              <span className="text-sm font-semibold text-slate-900">{teacher.name ?? teacher.email}</span>
              <Input
                placeholder={t('timetableAdmin.subjectsPlaceholder')}
                value={teacherSubjectsText[teacher.userId] ?? ''}
                onChange={(e) => setTeacherSubjectsText((prev) => ({ ...prev, [teacher.userId]: e.target.value }))}
              />
            </div>
          ))}
          {(teachers ?? []).length === 0 && <p className="text-sm text-slate-500">{t('timetableAdmin.noTeachers')}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('timetableAdmin.classesToInclude')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t('timetableAdmin.classesHelp')}</p>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {classNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleClass(name)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
                selectedClasses.has(name) ? 'border-primary bg-primary text-on-primary' : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50',
              )}
            >
              {name}
            </button>
          ))}
          {classNames.length === 0 && <p className="text-sm text-slate-500">{t('timetableAdmin.noClasses')}</p>}
        </CardBody>
      </Card>

      {selectedClasses.size > 0 && allSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('timetableAdmin.periodsPerWeek')}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{t('timetableAdmin.periodsPerWeekHelp')}</p>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="py-2 pr-4">{t('timetableAdmin.class')}</th>
                  {allSubjects.map((subject) => (
                    <th key={subject} className="py-2 pr-4">
                      {subject}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(selectedClasses).map((className) => (
                  <tr key={className} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-semibold text-slate-900">{className}</td>
                    {allSubjects.map((subject) => (
                      <td key={subject} className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={periodsPerWeek[loadKey(className, subject)] ?? 5}
                          onChange={(e) =>
                            setPeriodsPerWeek((prev) => ({ ...prev, [loadKey(className, subject)]: Number(e.target.value) }))
                          }
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" isLoading={previewMutation.isPending} disabled={!canRun} onClick={() => previewMutation.mutate()}>
          <CalendarRange className="h-4 w-4" />
          {t('timetableAdmin.preview')}
        </Button>
        <Button isLoading={generateMutation.isPending} disabled={!canRun} onClick={() => generateMutation.mutate()}>
          <Wand2 className="h-4 w-4" />
          {t('timetableAdmin.generate')}
        </Button>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <Badge tone={committed ? 'success' : 'info'}>{committed ? t('timetableAdmin.committedBadge') : t('timetableAdmin.previewBadge')}</Badge>

          {result.unfilled.length > 0 && (
            <Card className="border-alert-200 bg-alert-50">
              <CardHeader>
                <CardTitle className="text-alert-700">{t('timetableAdmin.unfilledTitle', { count: result.unfilled.length })}</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="flex flex-col gap-1 text-sm text-alert-700">
                  {result.unfilled.map((u, i) => (
                    <li key={i}>
                      {u.classroomName}
                      {u.dayOfWeek != null && (
                        <>
                          {' '}
                          &middot; {t(`enums.dayOfWeek.${u.dayOfWeek}`)} {u.startTime}-{u.endTime}
                        </>
                      )}
                      {u.subject ? ` (${u.subject})` : ''}: {u.reason}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {result.periods.length === 0 ? (
            <EmptyState title={t('timetableAdmin.emptyTitle')} description={t('timetableAdmin.emptyBody')} />
          ) : (
            Array.from(grouped.entries()).map(([classroomId, periods]) => (
              <Card key={classroomId}>
                <CardHeader>
                  <CardTitle>{periods[0].classroomName}</CardTitle>
                </CardHeader>
                <CardBody className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="py-2 pr-4">{t('timetableAdmin.day')}</th>
                        <th className="py-2 pr-4">{t('common.time')}</th>
                        <th className="py-2 pr-4">{t('common.subject')}</th>
                        <th className="py-2 pr-4">{t('periods.teacher')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...periods]
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                        .map((s, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2 pr-4">{t(`enums.dayOfWeek.${s.dayOfWeek}`)}</td>
                            <td className="py-2 pr-4 tabular-nums">
                              {s.startTime}-{s.endTime}
                            </td>
                            <td className="py-2 pr-4">
                              {s.subject}
                              {s.classTeacherPeriod && (
                                <Badge tone="info" className="ml-2">
                                  {t('timetableAdmin.classTeacherPeriod')}
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 pr-4">{s.teacherName ?? '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
