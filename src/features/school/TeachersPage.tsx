import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deletePeriod,
  inviteTeacher,
  listClassrooms,
  listTeacherPeriods,
  listTeachers,
  resendTeacherInvite,
  updateTeacher,
} from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { backendErrorMessage } from '@/lib/errorMessage';
import { formatDateTime, shortTime, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { optionalPhoneSchema } from '@/lib/validation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import type { Classroom, InviteStatus, Teacher, TimetablePeriod } from '@/types/attendance';
import { inviteStatusOf } from './status';

const INVITE_TONE: Record<InviteStatus, BadgeTone> = { ACTIVE: 'success', INVITED: 'warning', EXPIRED: 'danger' };

const inviteSchema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  email: z.string().trim().email('validation.email'),
  phone: optionalPhoneSchema,
  qualification: z.string().trim().optional(),
  classTeacherOfClassroomId: z.string().optional(),
});
type InviteValues = z.infer<typeof inviteSchema>;
// Editing never changes the email, so it is not validated there.
const editSchema = inviteSchema.extend({ email: z.string() });

function inviteLink(token: string): string {
  return `${window.location.origin}/accept-invite/${token}`;
}

function TeacherFormModal({
  open,
  onClose,
  teacher,
  classrooms,
}: {
  open: boolean;
  onClose: () => void;
  teacher?: Teacher;
  classrooms: Classroom[];
}) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const editing = teacher != null;
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const defaults = (x?: Teacher): InviteValues => ({
    name: x?.name ?? '',
    email: x?.email ?? '',
    phone: x?.phone ?? '',
    qualification: x?.qualification ?? '',
    classTeacherOfClassroomId: x?.classTeacherOfClassroomId != null ? String(x.classTeacherOfClassroomId) : '',
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(editing ? editSchema : inviteSchema), defaultValues: defaults(teacher) });

  useEffect(() => {
    if (open) {
      reset(defaults(teacher));
      setCreatedLink(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacher?.userId]);

  const mutation = useMutation({
    mutationFn: async (v: InviteValues) => {
      const classroomId = v.classTeacherOfClassroomId ? Number(v.classTeacherOfClassroomId) : undefined;
      if (editing) {
        return updateTeacher(schoolId!, teacher.userId, {
          name: v.name,
          phone: v.phone?.trim() || undefined,
          qualification: v.qualification?.trim() || undefined,
          classTeacherOfClassroomId: classroomId ?? null,
        });
      }
      return inviteTeacher(schoolId!, {
        email: v.email,
        name: v.name,
        phone: v.phone?.trim() || undefined,
        qualification: v.qualification?.trim() || undefined,
        classTeacherOfClassroomId: classroomId,
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classrooms', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classroom-summary', schoolId] });
      if (editing) {
        toast.success(t('teachers.updated'));
        onClose();
      } else {
        toast.success(t('teachers.invited'));
        const token = (result as { inviteToken?: string }).inviteToken;
        if (token) setCreatedLink(inviteLink(token));
        else onClose();
      }
    },
    onError: (error) => toast.error(backendErrorMessage(error, editing ? t('teachers.updateFailed') : t('teachers.inviteFailed'))),
  });

  const available = classrooms.filter((c) => c.classTeacherId == null || c.classTeacherId === teacher?.userId);

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('teachers.editTitle') : t('teachers.inviteTitle')}>
      {createdLink ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-700">{t('teachers.inviteLink')}</p>
          <code className="block break-all rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-800">{createdLink}</code>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(createdLink);
                toast.success(t('common.copied'));
              }}
            >
              {t('common.copy')}
            </Button>
            <Button onClick={onClose}>{t('common.close')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('common.name')} required error={err(errors.name?.message)} {...register('name')} />
          {!editing ? <Input label={t('common.email')} type="email" required error={err(errors.email?.message)} {...register('email')} /> : <Input label={t('common.email')} disabled {...register('email')} />}
          <Input label={t('teachers.phone')} error={err(errors.phone?.message)} {...register('phone')} />
          <Input label={t('teachers.qualification')} {...register('qualification')} />
          <Select label={t('teachers.classTeacherOf')} className="sm:col-span-2" {...register('classTeacherOfClassroomId')}>
            <option value="">{t('teachers.noClassTeacherRole')}</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {t('classrooms.classLabel', { name: classroomLabel(c) })}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editing ? t('common.saveChanges') : t('teachers.invite')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TeacherPeriodsModal({ teacher, onClose }: { teacher: Teacher | null; onClose: () => void }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const { data: periods, isLoading } = useQuery({
    queryKey: ['teacher-periods', schoolId, teacher?.userId],
    queryFn: () => listTeacherPeriods(schoolId!, teacher!.userId),
    enabled: schoolId != null && teacher != null,
  });
  const deleteMutation = useMutation({
    mutationFn: (periodId: number) => deletePeriod(schoolId!, periodId),
    onSuccess: () => {
      toast.success(t('periods.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-periods', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classroom-periods', schoolId] });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('periods.deleteFailed'))),
  });

  const columns: DataColumn<TimetablePeriod>[] = [
    { key: 'day', header: t('periods.day'), primary: true, cell: (p) => t(`enums.dayOfWeek.${p.dayOfWeek}`) },
    { key: 'time', header: t('common.time'), cell: (p) => `${shortTime(p.startTime)} - ${shortTime(p.endTime)}` },
    { key: 'subject', header: t('common.subject'), cell: (p) => p.subject },
    { key: 'class', header: t('common.class'), cell: (p) => p.classroomName ?? `#${p.classroomId}` },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (p) => (
        <Button size="sm" variant="danger" isLoading={deleteMutation.isPending && deleteMutation.variables === p.id} onClick={() => deleteMutation.mutate(p.id)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ];

  const sorted = useMemo(() => [...(periods ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)), [periods]);

  return (
    <Modal open={teacher !== null} onClose={onClose} size="lg" title={t('teachers.periodsTitle', { name: teacher?.name ?? teacher?.email ?? '' })}>
      <p className="mb-3 text-sm text-slate-500">{t('teachers.periodsHelp')}</p>
      <DataTable
        caption={t('teachers.periodsTitle', { name: teacher?.name ?? teacher?.email ?? '' })}
        columns={columns}
        rows={sorted}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        empty={<EmptyState title={t('periods.emptyTitle')} description={t('periods.emptyTeacherBody')} />}
      />
    </Modal>
  );
}

type Filter = 'ALL' | InviteStatus;

/** School admin: teachers table (class, periods per week, invite status) with invite / edit / resend / view periods. */
export function TeachersPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [formTeacher, setFormTeacher] = useState<Teacher | 'new' | null>(null);
  const [periodsFor, setPeriodsFor] = useState<Teacher | null>(null);
  const [resentLink, setResentLink] = useState<{ name: string; link: string } | null>(null);

  const { data: teachers, isLoading } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => listTeachers(schoolId!), enabled: schoolId != null });
  const { data: classrooms } = useQuery({ queryKey: ['classrooms', schoolId], queryFn: () => listClassrooms(schoolId!), enabled: schoolId != null });

  const resendMutation = useMutation({
    mutationFn: (teacher: Teacher) => resendTeacherInvite(schoolId!, teacher.userId),
    onSuccess: (res, teacher) => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success(t('teachers.resent'));
      if (res.inviteToken) setResentLink({ name: teacher.name ?? teacher.email, link: inviteLink(res.inviteToken) });
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('teachers.resendFailed'))),
  });

  const counts = useMemo(() => {
    const c = { ALL: teachers?.length ?? 0, INVITED: 0, ACTIVE: 0, EXPIRED: 0 };
    for (const x of teachers ?? []) c[inviteStatusOf(x)]++;
    return c;
  }, [teachers]);
  const visible = filter === 'ALL' ? teachers : teachers?.filter((x) => inviteStatusOf(x) === filter);

  const columns: DataColumn<Teacher>[] = [
    { key: 'name', header: t('common.name'), primary: true, cell: (x) => <span className="font-semibold">{x.name ?? x.email}</span> },
    { key: 'phone', header: t('common.phone'), cell: (x) => x.phone ?? '—' },
    { key: 'email', header: t('common.email'), cell: (x) => x.email },
    {
      key: 'class',
      header: t('teachers.classTeacherOf'),
      cell: (x) => x.classTeacherOfClassroomName ?? <span className="text-slate-500">—</span>,
    },
    { key: 'periods', header: t('teachers.periodsPerWeek'), cell: (x) => x.periodsPerWeek ?? 0, className: 'tabular-nums' },
    {
      key: 'invite',
      header: t('teachers.inviteStatus'),
      cell: (x) => {
        const s = inviteStatusOf(x);
        return (
          <div>
            <Badge tone={INVITE_TONE[s]}>{t(`enums.inviteStatus.${s}`)}</Badge>
            {s !== 'ACTIVE' && x.inviteExpiresAt && (
              <p className="mt-1 text-xs text-slate-500">{t('teachers.inviteExpires', { time: formatDateTime(x.inviteExpiresAt, locale) })}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (x) => {
        const s = inviteStatusOf(x);
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPeriodsFor(x)}>
              {t('teachers.viewPeriods')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setFormTeacher(x)}>
              {t('common.edit')}
            </Button>
            {s !== 'ACTIVE' && (
              <Button size="sm" variant="secondary" isLoading={resendMutation.isPending && resendMutation.variables?.userId === x.userId} onClick={() => resendMutation.mutate(x)}>
                {t('teachers.resend')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('teachers.title')} subtitle={t('teachers.subtitle')} actions={<Button onClick={() => setFormTeacher('new')}>{t('teachers.inviteButton')}</Button>} />

      <Tabs
        label={t('teachers.filterLabel')}
        value={filter}
        onChange={(id) => setFilter(id as Filter)}
        tabs={[
          { id: 'ALL', label: t('common.all'), count: counts.ALL },
          { id: 'ACTIVE', label: t('enums.inviteStatus.ACTIVE'), count: counts.ACTIVE },
          { id: 'INVITED', label: t('enums.inviteStatus.INVITED'), count: counts.INVITED },
          { id: 'EXPIRED', label: t('enums.inviteStatus.EXPIRED'), count: counts.EXPIRED },
        ]}
      />

      {resentLink && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-surface p-3 text-sm">
          <p>{t('teachers.resentLinkFor', { name: resentLink.name })}</p>
          <code className="break-all rounded bg-slate-100 px-2 py-1 text-xs">{resentLink.link}</code>
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setResentLink(null)}>
            {t('common.close')}
          </Button>
        </div>
      )}

      <DataTable
        caption={t('teachers.listTitle')}
        columns={columns}
        rows={visible}
        isLoading={isLoading}
        getRowKey={(x) => x.userId}
        empty={<EmptyState icon={GraduationCap} title={t('teachers.emptyTitle')} description={t('teachers.emptyBody')} />}
      />

      <TeacherFormModal open={formTeacher !== null} onClose={() => setFormTeacher(null)} teacher={formTeacher === 'new' ? undefined : (formTeacher ?? undefined)} classrooms={classrooms ?? []} />
      <TeacherPeriodsModal teacher={periodsFor} onClose={() => setPeriodsFor(null)} />
    </div>
  );
}
