import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Mail } from 'lucide-react';
import { completeMyParentProfile, getMyParentProfile } from '@/lib/api/parents';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { phoneSchema } from '@/lib/validation';
import { cn } from '@/lib/cn';

const schema = z.object({
  firstName: z.string().min(1, 'validation.required'),
  lastName: z.string().min(1, 'validation.required'),
  phone: phoneSchema,
  address: z.string().min(1, 'validation.required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ParentProfilePage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const { data: profile, isLoading } = useQuery({ queryKey: ['my-parent-profile'], queryFn: getMyParentProfile });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        latitude: profile.homeLocation?.latitude,
        longitude: profile.homeLocation?.longitude,
      });
    }
  }, [profile, reset]);

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => completeMyParentProfile(values),
    onSuccess: () => toast.success(t('parentProfile.updated')),
    onError: () => toast.error(t('parentProfile.updateFailed')),
  });

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || profile?.email || '';
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((part) => part![0])
      .join('')
      .toUpperCase() || displayName.slice(0, 1).toUpperCase() || '?';
  const statusTone = profile?.accountStatus === 'ACTIVE' ? 'success' : profile?.accountStatus === 'DISABLED' ? 'danger' : 'neutral';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('parentProfile.title')} />

      {isLoading ? (
        <Card>
          <CardBody>
            <SkeletonTable rows={4} columns={3} />
          </CardBody>
        </Card>
      ) : (
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="grid items-start gap-6 lg:grid-cols-3"
        >
          {/* Identity snapshot - read-only, mirrors what's already fetched (no new data). */}
          <Card className="lg:sticky lg:top-6 lg:col-span-1">
            <CardBody className="flex flex-col items-center gap-3 py-6 text-center">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary-text"
              >
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{displayName || t('parentProfile.title')}</p>
                {profile?.accountStatus && (
                  <Badge tone={statusTone} className="mt-2">
                    {t(`schoolRiders.accountStatus.${profile.accountStatus}`, { defaultValue: profile.accountStatus })}
                  </Badge>
                )}
              </div>
              <dl className="mt-2 flex w-full flex-col gap-2.5 border-t border-slate-200/70 pt-4 text-left text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <dd className="truncate">{profile?.email || t('schoolRiders.noEmail')}</dd>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <dd className="truncate">{profile?.phone || '—'}</dd>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <dd className="line-clamp-2">{profile?.address || '—'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('parentProfile.yourDetails')}</CardTitle>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Input label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
                <Input label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
                <Input label={t('common.phone')} required error={err(errors.phone?.message)} {...register('phone')} />
                <Input
                  label={t('common.address')}
                  required
                  error={err(errors.address?.message)}
                  className={cn('sm:col-span-2')}
                  {...register('address')}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('parentProfile.homeLocation')}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{t('parentProfile.hint')}</p>
              </CardHeader>
              <CardBody>
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(point) => {
                    setValue('latitude', point.latitude);
                    setValue('longitude', point.longitude);
                  }}
                />
              </CardBody>
            </Card>

            <div className="flex items-center justify-between gap-4">
              {mutation.isError ? (
                <p className="text-sm text-red-600">{t('parentProfile.saveFailedInline')}</p>
              ) : (
                <span />
              )}
              <Button type="submit" isLoading={isSubmitting} className="w-fit">
                {t('common.saveChanges')}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
