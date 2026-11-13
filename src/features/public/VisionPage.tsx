import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';

const PILLARS = ['trackable', 'insured', 'accountable', 'open'] as const;

export function VisionPage() {
  const { t } = useTranslation();
  return (
    <PublicLayout>
      <section className="bg-nav-bg px-4 py-20 text-center sm:px-6">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-accent">{t('vision.heading')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
          {t('vision.title')}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-nav-muted">
          {t('vision.body')}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg font-bold text-slate-900">{t(`vision.pillars.${pillar}.title`)}</p>
              <p className="mt-2 text-sm text-slate-600">{t(`vision.pillars.${pillar}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
