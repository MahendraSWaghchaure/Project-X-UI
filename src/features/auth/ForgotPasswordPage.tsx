import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '@/lib/api/auth';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
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
          <CardTitle>Reset your password</CardTitle>
          {!sent && (
            <p className="mt-1 text-sm text-slate-500">
              Enter the email on your account and we&rsquo;ll send a link to reset your password.
            </p>
          )}
        </CardHeader>
        <CardBody>
          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                If that email is registered, a reset link is on its way. It's valid for 1 hour.
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
              <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
              {mutation.isError && (
                <p className="text-sm text-red-600">{backendErrorMessage(mutation.error, 'Something went wrong - try again')}</p>
              )}
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Send reset link
              </Button>
              <Link to="/login" className="text-center text-sm text-slate-500 hover:text-blue-600">
                Back to sign in
              </Link>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
