import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserSearch, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMyChildren, listMyRelevantDrivers } from '@/lib/api/children';
import { listMyGrievances, raiseGrievance } from '@/lib/api/grievances';
import { useAuthStore } from '@/lib/authStore';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { GrievanceStatusBadge } from '@/components/grievance/GrievanceStatusBadge';
import { StudentPickerDialog } from '@/components/grievance/StudentPickerDialog';
import { grievanceTypeLabel } from '@/features/grievances/grievanceLabels';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { PARENT_GRIEVANCE_TYPES } from '@/types/grievance';
import type { StudentSearchResult } from '@/types/attendance';

const schema = z
  .object({
    schoolId: z.coerce.number({ required_error: 'parentGrievances.chooseSchool' }),
    type: z.enum(PARENT_GRIEVANCE_TYPES as [string, ...string[]]),
    otherDescription: z.string().trim().max(500).optional(),
    driverId: z.string().optional(),
    subject: z.string().min(1, 'validation.required'),
    description: z.string().min(1, 'validation.required'),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'OTHER' && !v.otherDescription?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['otherDescription'], message: 'validation.required' });
    }
  });
type FormValues = z.infer<typeof schema>;

export function ParentGrievancesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const err = (m?: string) => (m ? t(m) : undefined);
  const userId = useAuthStore((state) => state.userId);
  const queryClient = useQueryClient();
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [linkedStudent, setLinkedStudent] = useState<StudentSearchResult | null>(null);
  const { data: children } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });
  const { data: grievances, isLoading } = useQuery({ queryKey: ['my-grievances'], queryFn: listMyGrievances });

  const schoolOptions = useMemo(() => {
    const ids = new Set<number>();
    children?.forEach((c) => ids.add(c.schoolId));
    return Array.from(ids);
  }, [children]);

  useLiveTopic([userId ? `/topic/users/${userId}/grievances` : null], () => {
    queryClient.invalidateQueries({ queryKey: ['my-grievances'] });
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'OTHER' } });
  const type = watch('type');
  const schoolId = watch('schoolId');

  // E3: only when the complaint is against a driver - populated from drivers who actually serve this parent's children.
  const { data: relevantDrivers } = useQuery({
    queryKey: ['relevant-drivers'],
    queryFn: listMyRelevantDrivers,
    enabled: type === 'DRIVER_BEHAVIOR',
  });

  function clearLinkedStudent() {
    setLinkedStudent(null);
  }

  function handleStudentSelected(student: StudentSearchResult) {
    setLinkedStudent(student);
    setShowStudentPicker(false);
    const label = student.className
      ? `${student.className}${student.section ? `-${student.section}` : ''}`
      : t('grievances.studentPicker.unknownClass');
    const reference = t('grievances.studentPicker.reference', { name: student.name, classLabel: label });
    const current = watch('description') ?? '';
    if (!current.includes(reference)) {
      setValue('description', current ? `${reference}\n${current}` : reference, { shouldValidate: false });
    }
  }

  const raiseMutation = useMutation({
    mutationFn: (values: FormValues) =>
      raiseGrievance({
        schoolId: values.schoolId,
        type: values.type as (typeof PARENT_GRIEVANCE_TYPES)[number],
        otherDescription: values.type === 'OTHER' ? values.otherDescription?.trim() : undefined,
        driverId: values.type === 'DRIVER_BEHAVIOR' && values.driverId ? Number(values.driverId) : undefined,
        subject: values.subject,
        description: values.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-grievances'] });
      reset({ type: 'OTHER' });
      clearLinkedStudent();
      toast.success(t('parentGrievances.submitted'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentGrievances.submitFailed'))),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('parentGrievances.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('parentGrievances.raiseTitle')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('parentGrievances.raiseHint')}
          </p>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={handleSubmit((values) => raiseMutation.mutate(values))}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Select label={t('common.school')} required error={err(errors.schoolId?.message)} {...register('schoolId')}>
              <option value="">{t('parentGrievances.select')}</option>
              {schoolOptions.map((id) => (
                <option key={id} value={id}>
                  {t('parentGrievances.schoolOption', { id })}
                </option>
              ))}
            </Select>
            <Select label={t('grievances.col.type')} required {...register('type')}>
              {PARENT_GRIEVANCE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`enums.grievanceType.${x}`)}
                </option>
              ))}
            </Select>
            {type === 'OTHER' && (
              <Input
                label={t('driverGrievances.otherLabel')}
                required
                className="sm:col-span-2"
                error={err(errors.otherDescription?.message)}
                maxLength={500}
                {...register('otherDescription')}
              />
            )}
            {type === 'DRIVER_BEHAVIOR' && (
              <Select label={t('parentGrievances.whichDriver')} className="sm:col-span-2" {...register('driverId')}>
                <option value="">{t('parentGrievances.anyDriver')}</option>
                {relevantDrivers?.map((d) => (
                  <option key={d.driverId} value={d.driverId}>
                    {t('parentGrievances.driverOption', { name: d.name, vehicleNo: d.vehicleNo })}
                  </option>
                ))}
              </Select>
            )}

            <div className="flex flex-col gap-2 sm:col-span-2">
              {linkedStudent ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-sm">
                  <span>
                    {t('grievances.studentPicker.linked', { name: linkedStudent.name })}
                  </span>
                  <button type="button" onClick={clearLinkedStudent} aria-label={t('common.remove')} className="text-slate-500 hover:text-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  disabled={!schoolId}
                  onClick={() => setShowStudentPicker(true)}
                >
                  <UserSearch className="h-4 w-4" />
                  {t('grievances.studentPicker.trigger')}
                </Button>
              )}
            </div>

            <Input label={t('common.subject')} required className="sm:col-span-2" error={err(errors.subject?.message)} {...register('subject')} />
            <div className="sm:col-span-2">
              <Textarea label={t('common.description')} required rows={4} error={err(errors.description?.message)} {...register('description')} />
            </div>
            {raiseMutation.isError && <p className="sm:col-span-2 text-sm text-red-600">{t('parentGrievances.submitFailedInline')}</p>}
            <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2 sm:w-fit">
              {t('common.submit')}
            </Button>
          </form>
        </CardBody>
      </Card>

      <StudentPickerDialog
        open={showStudentPicker}
        schoolId={schoolId ? Number(schoolId) : null}
        onClose={() => setShowStudentPicker(false)}
        onSelect={handleStudentSelected}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('parentGrievances.yourGrievances')}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={4} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {grievances?.map((g) => (
              <li key={g.id} className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-900">{g.subject}</p>
                  <GrievanceStatusBadge status={g.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {grievanceTypeLabel(t, g)} &middot; {new Date(g.createdAt).toLocaleString(locale)}
                </p>
                <p className="text-sm text-slate-600">{g.description}</p>
                {g.resolutionNote && (
                  <p className="mt-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                    <span className="font-medium">{t('parentGrievances.schoolResponse')}: </span>
                    {g.resolutionNote}
                  </p>
                )}
              </li>
            ))}
            {grievances?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('parentGrievances.empty')}</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
