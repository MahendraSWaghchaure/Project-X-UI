import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getConsentRequest, respondToConsent } from '@/lib/api/attendance';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

type Outcome = 'granted' | 'declined';

/** 410 = the link expired or was already used; 404 = unknown token. Both read as "this link no longer works". */
function isGone(error: unknown): boolean {
  return error instanceof AxiosError && (error.response?.status === 410 || error.response?.status === 404);
}

/**
 * Public, unauthenticated page a guardian lands on from the SMS link: shows who is asking (student first name + school)
 * and records Yes / No once. States: loading, ask, thanks, expired-or-used, error.
 */
export function ConsentPage() {
  const { t, i18n } = useTranslation();
  const locale = useIntlLocale();
  const { token = '' } = useParams();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const query = useQuery({
    queryKey: ['public-consent', token],
    queryFn: () => getConsentRequest(token),
    enabled: token !== '',
    retry: false,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: (consent: boolean) => respondToConsent(token, consent),
    onSuccess: (_res, consent) => setOutcome(consent ? 'granted' : 'declined'),
  });

  const gone = isGone(query.error) || isGone(mutation.error);
  const failed = (query.isError || mutation.isError) && !gone;

  let content;
  if (outcome) {
    const granted = outcome === 'granted';
    content = (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        {granted ? <CheckCircle2 className="h-12 w-12 text-safe-600" aria-hidden="true" /> : <XCircle className="h-12 w-12 text-slate-500" aria-hidden="true" />}
        <h1 className="text-xl font-bold text-slate-900">{granted ? t('consent.page.grantedTitle') : t('consent.page.declinedTitle')}</h1>
        <p className="text-sm text-slate-600">{granted ? t('consent.page.grantedBody') : t('consent.page.declinedBody')}</p>
      </div>
    );
  } else if (gone) {
    content = (
      <div role="alert" className="flex flex-col items-center gap-3 text-center">
        <Clock className="h-12 w-12 text-pending-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">{t('consent.page.goneTitle')}</h1>
        <p className="text-sm text-slate-600">{t('consent.page.goneBody')}</p>
      </div>
    );
  } else if (failed) {
    content = (
      <div role="alert" className="flex flex-col items-center gap-3 text-center">
        <XCircle className="h-12 w-12 text-alert-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900">{t('consent.page.errorTitle')}</h1>
        <p className="text-sm text-slate-600">{t('consent.page.errorBody')}</p>
        <Button variant="secondary" onClick={() => (query.isError ? void query.refetch() : mutation.reset())}>
          {t('common.retry')}
        </Button>
      </div>
    );
  } else if (query.isLoading || !query.data) {
    content = <p className="text-center text-sm text-slate-500">{t('common.loading')}</p>;
  } else {
    const { studentFirstName, schoolName, expiresAt } = query.data;
    content = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-12 w-12 text-primary-text" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-900">{t('consent.page.title')}</h1>
        </div>
        <p className="text-sm text-slate-700">{t('consent.page.ask', { student: studentFirstName, school: schoolName })}</p>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{t('consent.page.purpose')}</p>
        {expiresAt && <p className="text-xs text-slate-500">{t('consent.page.validUntil', { time: formatDateTime(expiresAt, locale) })}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" isLoading={mutation.isPending && mutation.variables === true} disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
            {t('consent.page.agree')}
          </Button>
          <Button size="lg" variant="secondary" className="flex-1" isLoading={mutation.isPending && mutation.variables === false} disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
            {t('consent.page.decline')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full max-w-md items-center justify-between">
        <Logo size="sm" />
        <div role="group" aria-label={t('common.language')} className="flex gap-1">
          {(['en', 'hi'] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              aria-pressed={i18n.resolvedLanguage === lng}
              onClick={() => void i18n.changeLanguage(lng)}
              className="min-h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary"
            >
              {lng === 'en' ? 'EN' : 'हिं'}
            </button>
          ))}
        </div>
      </div>
      <Card className="w-full max-w-md">
        <CardBody className="p-6">{content}</CardBody>
      </Card>
    </div>
  );
}
