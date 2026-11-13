import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { selfRegisterDriver } from '@/lib/api/drivers';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { phoneSchema } from '@/lib/validation';

const schema = z.object({
  firstName: z.string().min(1, 'validation.required'),
  lastName: z.string().min(1, 'validation.required'),
  email: z.string().email('validation.email'),
  password: z.string().min(8, 'validation.passwordMin'),
  phone: phoneSchema,
  licenseNumber: z.string().min(1, 'validation.required'),
  licenseExpiry: z.string().optional(),
  vehicleRegistrationNumber: z
    .string()
    .min(1, 'validation.required')
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9]+$/.test(v), 'driverRegister.regAlnum'),
  vehicleType: z.enum(['VAN', 'BUS']),
  vehicleSeatCapacity: z.coerce
    .number({ invalid_type_error: 'validation.number' })
    .int('validation.number')
    .min(1, 'driverRegister.seatMin'),
});
type FormValues = z.infer<typeof schema>;

export function DriverRegisterPage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { vehicleType: 'VAN' } });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => selfRegisterDriver(values),
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
        <Logo size="lg" />
        <Card className="w-full max-w-md text-center">
          <CardBody className="flex flex-col gap-4 py-8">
            <h1 className="text-xl font-semibold text-slate-900">{t('driverRegister.doneTitle')}</h1>
            <p className="text-sm text-slate-600">
              {t('driverRegister.doneBody')}
            </p>
            <Link to="/login">
              <Button className="w-full">{t('driverRegister.goToSignIn')}</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-12">
      <Logo size="lg" />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t('driverRegister.title')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('driverRegister.subtitle')}
          </p>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Input label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
            <Input label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
            <Input label={t('common.email')} type="email" required error={err(errors.email?.message)} {...register('email')} />
            <Input label={t('common.password')} type="password" required error={err(errors.password?.message)} {...register('password')} />
            <Input label={t('common.phone')} required error={err(errors.phone?.message)} {...register('phone')} />
            <Input label={t('driverRegister.licenseNumber')} required error={err(errors.licenseNumber?.message)} {...register('licenseNumber')} />
            <Input label={t('driverRegister.licenseExpiry')} type="date" {...register('licenseExpiry')} />
            <div />

            <div className="sm:col-span-2 border-t border-slate-100 pt-4 text-sm font-medium text-slate-500">
              {t('driverRegister.yourVehicle')}
            </div>
            <Input
              label={t('driverRegister.registrationNumber')}
              required
              error={err(errors.vehicleRegistrationNumber?.message)}
              {...register('vehicleRegistrationNumber')}
            />
            <Select label={t('driverRegister.type')} required {...register('vehicleType')}>
              <option value="VAN">{t('enums.vehicleType.VAN')}</option>
              <option value="BUS">{t('enums.vehicleType.BUS')}</option>
            </Select>
            <Input
              label={t('driverRegister.seatCapacity')}
              type="number"
              required
              error={err(errors.vehicleSeatCapacity?.message)}
              {...register('vehicleSeatCapacity')}
            />

            {mutation.isError && (
              <p className="sm:col-span-2 text-sm text-red-600">
                {backendErrorMessage(mutation.error, t('driverRegister.error'))}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2">
              {t('driverRegister.submit')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
