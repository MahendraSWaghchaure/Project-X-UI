import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '@/lib/api/auth';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

const schema = z.object({ email: z.string().email('auth.emailInvalid') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => forgotPassword(values.email),
    onSuccess: () => setSent(true),
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <Logo size="lg" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.forgot.title')}</CardTitle>
          {!sent && (
            <p className="mt-1 text-sm text-slate-500">
              {t('auth.forgot.subtitle')}
            </p>
          )}
        </CardHeader>
        <CardBody>
          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                {t('auth.forgot.sent')}
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  {t('auth.backToSignIn')}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
              <Input
                label={t('common.email')}
                type="email"
                autoComplete="email"
                required
                error={errors.email?.message ? t(errors.email.message) : undefined}
                {...register('email')}
              />
              {mutation.isError && (
                <p className="text-sm text-red-600">{backendErrorMessage(mutation.error, t('auth.forgot.error'))}</p>
              )}
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                {t('auth.forgot.submit')}
              </Button>
              <Link to="/login" className="text-center text-sm text-slate-500 hover:text-blue-600">
                {t('auth.backToSignIn')}
              </Link>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
