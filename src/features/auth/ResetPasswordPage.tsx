import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
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
      setServerError('This reset link is invalid or has expired - request a new one');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <Logo size="lg" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="New password" type="password" error={errors.newPassword?.message} {...register('newPassword')} />
            <Input
              label="Confirm password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {serverError && (
              <p className="text-sm text-red-600">
                {serverError}{' '}
                <Link to="/forgot-password" className="underline">
                  Request a new link
                </Link>
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              Reset password
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
