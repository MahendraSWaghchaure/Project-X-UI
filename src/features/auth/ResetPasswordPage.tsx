import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

const schema = z
  .object({
    newPassword: z.string().min(8, 'auth.passwordAtLeast8'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'auth.passwordsMismatch',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const err = (m?: string) => (m ? t(m) : undefined);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setServerError(null);
    try {
      await resetPassword(token, values.newPassword);
      navigate('/login', { state: { passwordReset: true } });
    } catch {
      setServerError(t('auth.reset.invalid'));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <Logo size="lg" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.reset.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t('auth.newPassword')}
              type="password"
              required
              error={err(errors.newPassword?.message)}
              {...register('newPassword')}
            />
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              required
              error={err(errors.confirmPassword?.message)}
              {...register('confirmPassword')}
            />
            {serverError && (
              <p className="text-sm text-red-600">
                {serverError}{' '}
                <Link to="/forgot-password" className="underline">
                  {t('auth.reset.requestNew')}
                </Link>
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              {t('auth.reset.submit')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
