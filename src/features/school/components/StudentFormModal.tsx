import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { createStudent, updateStudent } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { PHONE_REGEX } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import type { Classroom, Student, StudentInput } from '@/types/attendance';

const studentSchema = z.object({
  firstName: z.string().trim().min(1, 'validation.required'),
  lastName: z.string().trim().min(1, 'validation.required'),
  rollNo: z.string().optional(),
  classroomId: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  guardianName: z.string().trim().min(1, 'validation.required'),
  guardianPhone: z.string().regex(PHONE_REGEX, 'validation.phone'),
  guardianEmail: z.union([z.literal(''), z.string().email('validation.email')]).optional(),
});
type StudentFormValues = z.infer<typeof studentSchema>;

function defaultsFor(student?: Student, defaultClassroomId?: number): StudentFormValues {
  return {
    firstName: student?.firstName ?? '',
    lastName: student?.lastName ?? '',
    rollNo: student?.rollNo ?? '',
    classroomId: student?.classroomId != null ? String(student.classroomId) : defaultClassroomId != null ? String(defaultClassroomId) : '',
    dob: student?.dob ?? '',
    gender: student?.gender ?? '',
    guardianName: student?.guardianName ?? '',
    guardianPhone: student?.guardianPhone ?? '',
    guardianEmail: student?.guardianEmail ?? '',
  };
}

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  classrooms: Classroom[];
  /** Present = edit this student (PUT with its `version` for optimistic locking); absent = add a new one. */
  student?: Student;
  /** Preselects the class when adding from inside a classroom. */
  defaultClassroomId?: number;
}

export function StudentFormModal({ open, onClose, classrooms, student, defaultClassroomId }: StudentFormModalProps) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const editing = student != null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: defaultsFor(student, defaultClassroomId),
  });
  const err = (m?: string) => (m ? t(m) : undefined);

  // Seed the form each time the modal opens (not on every refetch of `student`, which would wipe what the user is typing).
  useEffect(() => {
    if (open) reset(defaultsFor(student, defaultClassroomId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id]);

  const mutation = useMutation({
    mutationFn: (v: StudentFormValues) => {
      const body: StudentInput = {
        firstName: v.firstName,
        lastName: v.lastName,
        rollNo: v.rollNo || undefined,
        classroomId: v.classroomId ? Number(v.classroomId) : undefined,
        dob: v.dob || undefined,
        gender: v.gender || undefined,
        guardianName: v.guardianName,
        guardianPhone: v.guardianPhone,
        guardianEmail: v.guardianEmail || undefined,
        // Consent is only ever granted by the guardian through the SMS link; an edit must not reset what they chose.
        marketingConsent: student?.marketingConsent ?? false,
      };
      return student
        ? updateStudent(schoolId!, student.id, { ...body, leadSource: student.leadSource ?? undefined, version: student.version })
        : createStudent(schoolId!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      if (student) queryClient.invalidateQueries({ queryKey: ['student', schoolId, student.id] });
      toast.success(editing ? t('student.updated') : t('students.added'));
      if (!editing) reset(defaultsFor(undefined, defaultClassroomId));
      onClose();
    },
    onError: (error) => {
      if (student && error instanceof AxiosError && error.response?.status === 409) {
        // Stale version: pull the latest so the next edit carries the current `version`.
        queryClient.invalidateQueries({ queryKey: ['student', schoolId, student.id] });
        toast.error(t('student.conflict'));
        onClose();
        return;
      }
      toast.error(backendErrorMessage(error, editing ? t('student.updateFailed') : t('students.addFailed')));
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('student.editTitle') : t('students.addTitle')}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={t('students.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
        <Input label={t('students.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
        <Input label={t('students.rollNo')} {...register('rollNo')} />
        <Select label={t('students.class')} {...register('classroomId')}>
          <option value="">{t('students.noClass')}</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {classroomLabel(c)}
            </option>
          ))}
        </Select>
        <Input label={t('students.dob')} type="date" {...register('dob')} />
        {editing ? <Input label={t('student.gender')} {...register('gender')} /> : <div className="hidden sm:block" />}
        <Input label={t('students.guardianName')} required error={err(errors.guardianName?.message)} {...register('guardianName')} />
        <Input
          label={t('students.guardianPhone')}
          inputMode="tel"
          required
          error={err(errors.guardianPhone?.message)}
          {...register('guardianPhone')}
        />
        <div className="sm:col-span-2">
          <Input
            label={t('students.guardianEmail')}
            type="email"
            error={err(errors.guardianEmail?.message)}
            {...register('guardianEmail')}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" isLoading={mutation.isPending}>
            {editing ? t('student.save') : t('students.add')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
