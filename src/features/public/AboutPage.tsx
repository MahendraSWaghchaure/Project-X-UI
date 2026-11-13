import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardBody } from '@/components/ui/Card';

const CHILDREN_PHOTO_URL = 'https://images.pexels.com/photos/5909898/pexels-photo-5909898.jpeg?auto=compress&cs=tinysrgb&w=500';

const STATS = ['tracking', 'insurance', 'drivers', 'alerts'] as const;

const STEPS = ['s1', 's2', 's3'] as const;

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-blue-600">{t('about.heading')}</h1>
            <p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{t('about.title')}</p>
            <p className="mt-4 text-slate-600">
              {t('about.p1')}
            </p>
            <p className="mt-4 text-slate-600">
              {t('about.p2')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-6">
            <img
              src={CHILDREN_PHOTO_URL}
              alt={t('about.photoAlt')}
              className="h-56 w-56 rounded-full object-cover shadow-lg"
              loading="lazy"
            />
            <div className="grid w-full grid-cols-2 gap-4">
              {STATS.map((stat) => (
                <Card key={stat}>
                  <CardBody>
                    <p className="font-semibold text-slate-900">{t(`about.stats.${stat}.title`)}</p>
                    <p className="mt-1 text-sm text-slate-500">{t(`about.stats.${stat}.desc`)}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900">{t('about.howTitle')}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 font-semibold text-slate-900">{t(`about.steps.${step}.title`)}</p>
                <p className="mt-1 text-sm text-slate-600">{t(`about.steps.${step}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
