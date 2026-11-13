import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import type { Role } from '@/types/auth';

const schema = z.object({
  email: z.string().email('auth.emailInvalid'),
  password: z.string().min(1, 'auth.passwordRequired'),
});
type FormValues = z.infer<typeof schema>;

const HOME_BY_ROLE: Record<Role, string> = {
  PLATFORM_ADMIN: '/platform-admin/dashboard',
  SCHOOL_ADMIN: '/school-admin/dashboard',
  TEACHER: '/teacher/dashboard',
  DRIVER: '/driver/dashboard',
  PARENT: '/parent/dashboard',
};

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const passwordWasReset = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const err = (m?: string) => (m ? t(m) : undefined);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const tokens = await login(values.email, values.password);
      setSession(tokens);
      navigate(HOME_BY_ROLE[tokens.role]);
    } catch {
      setServerError(t('auth.invalidCredentials'));
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel - hidden below lg, so the form is never squeezed on a phone. */}
      <div className="relative hidden overflow-hidden bg-brand-panel px-14 py-14 lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
        <svg viewBox="0 0 520 900" className="pointer-events-none absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="xMidYMid slice">
          <path
            d="M -40 780 C 120 760, 140 620, 260 560 C 380 500, 360 360, 240 300 C 140 250, 160 140, 300 90"
            fill="none"
            stroke="currentColor" className="text-white/40"
            strokeWidth="2"
            strokeDasharray="2 14"
            strokeLinecap="round"
          />
          <circle cx="-40" cy="780" r="6" fill="currentColor" className="text-white/60" />
          <circle cx="300" cy="90" r="7" className="fill-accent" />
        </svg>

        <Logo size="md" tone="onBrand" />

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {t('auth.brandHeadline1')}
            <br />
            {t('auth.brandHeadline2')}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            {t('auth.brandSubtitle')}
          </p>
          <div className="mt-9 flex gap-7">
            <div>
              <div className="font-display text-xl font-semibold text-white">{t('auth.statChildrenValue')}</div>
              <div className="mt-0.5 text-xs text-white/75">{t('auth.statChildren')}</div>
            </div>
            <div>
              <div className="font-display text-xl font-semibold text-white">{t('auth.statDriversValue')}</div>
              <div className="mt-0.5 text-xs text-white/75">{t('auth.statDrivers')}</div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/65">{t('auth.copyright', { year: new Date().getFullYear() })}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
        <Logo size="lg" className="lg:hidden" />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t('login.title')}</CardTitle>
          </CardHeader>
          <CardBody>
            {passwordWasReset && (
              <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{t('login.passwordResetSuccess')}</p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                label={t('login.email')}
                type="email"
                autoComplete="email"
                required
                error={err(errors.email?.message)}
                {...register('email')}
              />
              <Input
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                required
                error={err(errors.password?.message)}
                {...register('password')}
              />
              {serverError && <p className="text-sm text-red-600">{serverError}</p>}
              <Button type="submit" variant="accent" isLoading={isSubmitting} className="mt-2 w-full">
                {t('login.submit')}
              </Button>
              <Link to="/forgot-password" className="text-center text-sm text-slate-500 hover:text-blue-600">
                {t('login.forgotPassword')}
              </Link>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
