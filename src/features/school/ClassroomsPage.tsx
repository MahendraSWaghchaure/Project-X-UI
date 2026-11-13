import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { School } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClassroom, listClassrooms, listClassroomSummary, listTeachers } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { todayIst } from '@/lib/dates';
import { backendErrorMessage } from '@/lib/errorMessage';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import type { ClassroomSummary } from '@/types/attendance';
import { ClassroomDetail } from './ClassroomDetail';

const schema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  section: z.string().trim().optional(),
  classTeacherId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function AddClassroomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const { data: teachers } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => listTeachers(schoolId!), enabled: open && schoolId != null });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', section: '', classTeacherId: '' } });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createClassroom(schoolId!, {
        name: v.name,
        section: v.section || undefined,
        classTeacherId: v.classTeacherId ? Number(v.classTeacherId) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['classrooms', schoolId] });
      void queryClient.invalidateQueries({ queryKey: ['classroom-summary', schoolId] });
      toast.success(t('classrooms.created'));
      reset();
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('classrooms.createFailed'))),
  });

  return (
    <Modal open={open} onClose={onClose} title={t('classrooms.addTitle')}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('classrooms.name')} required placeholder={t('classrooms.namePlaceholder')} error={errors.name?.message ? t(errors.name.message) : undefined} {...register('name')} />
        <Input label={t('classrooms.section')} placeholder={t('classrooms.sectionPlaceholder')} {...register('section')} />
        <Select label={t('classroom.classTeacher')} className="sm:col-span-2" {...register('classTeacherId')}>
          <option value="">{t('classroom.noClassTeacher')}</option>
          {teachers?.map((x) => (
            <option key={x.userId} value={x.userId} disabled={x.classTeacherOfClassroomId != null}>
              {x.name ?? x.email}
              {x.classTeacherOfClassroomId != null ? ` (${x.classTeacherOfClassroomName ?? t('classroom.otherClass')})` : ''}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {t('classrooms.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** School-admin classrooms hub: one row per class with class teacher, total students and today's present/absent counts. */
export function ClassroomsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [showAdd, setShowAdd] = useState(false);
  const today = todayIst();

  const { data, isLoading } = useQuery({
    queryKey: ['classroom-summary', schoolId, today],
    queryFn: () => listClassroomSummary(schoolId!, today),
    enabled: schoolId != null,
  });

  const columns: DataColumn<ClassroomSummary>[] = [
    { key: 'class', header: t('common.class'), primary: true, cell: (c) => <span className="font-semibold">{classroomLabel(c)}</span> },
    { key: 'teacher', header: t('classroom.classTeacher'), cell: (c) => c.classTeacherName ?? <span className="text-slate-500">{t('classroom.noClassTeacher')}</span> },
    { key: 'total', header: t('classrooms.totalStudents'), cell: (c) => c.totalStudents, className: 'tabular-nums' },
    { key: 'present', header: t('classrooms.presentToday'), cell: (c) => <span className="font-semibold text-safe-700">{c.present}</span>, className: 'tabular-nums' },
    { key: 'absent', header: t('classrooms.absentToday'), cell: (c) => <span className="font-semibold text-alert-700">{c.absent}</span>, className: 'tabular-nums' },
    {
      key: 'view',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (c) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/school-admin/classrooms/${c.id}`);
          }}
          aria-label={t('classrooms.viewOne', { name: classroomLabel(c) })}
        >
          {t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('classrooms.title')}
        subtitle={t('classrooms.subtitle')}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/school-admin/students/directory')}>
              {t('studentsDirectory.title')}
            </Button>
            <Button onClick={() => setShowAdd(true)}>{t('classrooms.addButton')}</Button>
          </div>
        }
      />
      <DataTable
        caption={t('classrooms.listTitle')}
        columns={columns}
        rows={data}
        isLoading={isLoading}
        getRowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/school-admin/classrooms/${c.id}`)}
        empty={
          <EmptyState
            icon={School}
            title={t('classrooms.emptyTitle')}
            description={t('classrooms.emptyBody')}
            action={<Button onClick={() => setShowAdd(true)}>{t('classrooms.addButton')}</Button>}
          />
        }
      />
      <AddClassroomModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

/** `/school-admin/classrooms/:id` - Attendance | Students | Periods. */
export function ClassroomDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms', schoolId],
    queryFn: () => listClassrooms(schoolId!),
    enabled: schoolId != null,
  });
  const classroom = classrooms?.find((c) => c.id === Number(id));
  if (isLoading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (!classroom) return <EmptyState title={t('classroom.notFound')} />;
  return <ClassroomDetail key={classroom.id} classroom={classroom} mode="admin" backTo="/school-admin/classrooms" />;
}
