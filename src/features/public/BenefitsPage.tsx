import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { ParentIcon, ChildIcon, SchoolIcon, DriverIcon } from '@/components/illustrations/RoleIcons';

const BENEFITS = [
  { key: 'parents', Icon: ParentIcon },
  { key: 'children', Icon: ChildIcon },
  { key: 'schools', Icon: SchoolIcon },
  { key: 'drivers', Icon: DriverIcon },
] as const;

const POINTS = ['p1', 'p2', 'p3', 'p4'] as const;

export function BenefitsPage() {
  const { t } = useTranslation();
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <h1 className="text-sm font-semibold uppercase tracking-wide text-blue-600">{t('benefits.heading')}</h1>
          <p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{t('benefits.title')}</p>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            {t('benefits.subtitle')}
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <Card key={b.key} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <b.Icon className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600">{t(`benefits.${b.key}.role`)}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{t(`benefits.${b.key}.title`)}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-slate-600">
                  {POINTS.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      <span>{t(`benefits.${b.key}.${point}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
