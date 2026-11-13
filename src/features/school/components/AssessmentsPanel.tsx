import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAssessment, listAssessments } from '@/lib/api/attendance';
import { backendErrorMessage } from '@/lib/errorMessage';
import { todayIst } from '@/lib/dates';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { SkeletonText } from '@/components/ui/Skeleton';

const assessmentSchema = z
  .object({
    examName: z.string().trim().min(1, 'validation.required'),
    subject: z.string().trim().min(1, 'validation.required'),
    maxMarks: z.coerce.number({ invalid_type_error: 'validation.number' }).positive('validation.positive'),
    marksObtained: z.coerce.number({ invalid_type_error: 'validation.number' }).min(0, 'validation.positive'),
    examDate: z.string().min(1, 'validation.required'),
  })
  .refine((v) => v.marksObtained <= v.maxMarks, { path: ['marksObtained'], message: 'validation.marksExceedMax' });
type AssessmentValues = z.input<typeof assessmentSchema>;

/** A student's exam results plus the form to add one. Shared by the student detail page and the lecturer's Exams page. */
export function AssessmentsPanel({ schoolId, studentId }: { schoolId: number; studentId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments', schoolId, studentId],
    queryFn: () => listAssessments(schoolId, studentId),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssessmentValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { examDate: todayIst() },
  });
  const err = (m?: string) => (m ? t(m) : undefined);

  const assessmentMutation = useMutation({
    mutationFn: (v: AssessmentValues) => {
      const parsed = assessmentSchema.parse(v);
      return createAssessment(schoolId, studentId, parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessments', schoolId, studentId] });
      reset({ examDate: todayIst() });
      toast.success(t('student.assessmentAdded'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('student.assessmentFailed'))),
  });

  return (
    <div className="flex flex-col gap-6">
      {assessmentsLoading && <SkeletonText lines={3} />}
      {assessments && assessments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-semibold">{t('student.exam')}</th>
                <th className="py-2 pr-3 font-semibold">{t('student.subject')}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t('student.marks')}</th>
                <th className="py-2 text-right font-semibold">{t('student.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 pr-3 font-medium text-slate-900">{a.examName}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{a.subject}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">
                    {a.marksObtained} / {a.maxMarks}
                    <span className="ml-1.5 text-xs text-slate-500">
                      ({Math.round((a.marksObtained / a.maxMarks) * 100)}%)
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-500">{a.examDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {assessments?.length === 0 && (
        <EmptyState icon={ClipboardList} title={t('student.noAssessmentsTitle')} description={t('student.noAssessmentsBody')} />
      )}

      <form
        onSubmit={handleSubmit((v) => assessmentMutation.mutate(v))}
        className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
        aria-label={t('student.addAssessment')}
      >
        <Input label={t('student.exam')} required error={err(errors.examName?.message)} {...register('examName')} />
        <Input label={t('student.subject')} required error={err(errors.subject?.message)} {...register('subject')} />
        <Input
          label={t('student.marksObtained')}
          type="number"
          step="any"
          inputMode="decimal"
          required
          error={err(errors.marksObtained?.message)}
          {...register('marksObtained')}
        />
        <Input
          label={t('student.maxMarks')}
          type="number"
          step="any"
          inputMode="decimal"
          required
          error={err(errors.maxMarks?.message)}
          {...register('maxMarks')}
        />
        <Input label={t('student.date')} type="date" required error={err(errors.examDate?.message)} {...register('examDate')} />
        <div className="col-span-2 md:col-span-5">
          <Button type="submit" isLoading={assessmentMutation.isPending}>
            {t('student.addAssessment')}
          </Button>
        </div>
      </form>
    </div>
  );
}
