import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { Button } from '@/components/ui/Button';

/** Shared chrome for every public marketing page (Home/About/Vision/Benefits) - header, a
 * closing sign-in CTA, and the footer, so each page only has to own its own content. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <section className="bg-brand-panel relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-20">
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 text-white/10" />
        <p className="relative mx-auto max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t('pub.ctaTitle')}
        </p>
        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login">
            <Button variant="accent" size="lg">
              {t('publicNav.signIn')}
            </Button>
          </Link>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
