import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { completeMyParentProfile } from '@/lib/api/parents';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { phoneSchema } from '@/lib/validation';

const schema = z.object({
  firstName: z.string().min(1, 'validation.required'),
  lastName: z.string().min(1, 'validation.required'),
  phone: phoneSchema,
  address: z.string().min(1, 'validation.required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CompleteProfilePage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => completeMyParentProfile(values),
    onSuccess: () => navigate('/parent/track'),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('parentProfile.tellUs')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('parentProfile.hint')}
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
            <Input label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
            <Input label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
            <Input label={t('common.phone')} required error={err(errors.phone?.message)} {...register('phone')} />
            <Input label={t('common.address')} required error={err(errors.address?.message)} {...register('address')} />
            <LocationPicker
              label={t('parentProfile.homeLocation')}
              latitude={latitude}
              longitude={longitude}
              onChange={(point) => {
                setValue('latitude', point.latitude);
                setValue('longitude', point.longitude);
              }}
              height={220}
            />
            {mutation.isError && <p className="text-sm text-red-600">{t('parentProfile.saveFailedInline')}</p>}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {t('parentProfile.continue')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
