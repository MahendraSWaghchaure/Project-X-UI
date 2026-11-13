import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '@/lib/contact';
import { InquiryModal } from './InquiryModal';

const linkClasses = 'rounded text-nav-muted transition-colors hover:text-white';
const creditLink = 'underline decoration-white/30 underline-offset-2 hover:text-white';

const contactButton =
  'group flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-left text-sm font-semibold text-white transition-colors hover:border-accent hover:bg-white/10';

export function PublicFooter() {
  const { t } = useTranslation();
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <footer className="relative bg-nav-bg text-nav-ink">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo size="md" tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-nav-muted">{t('pub.footer.tagline')}</p>
          <ThemeToggle onDark className="mt-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white">{t('pub.footer.company')}</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm">
            <li><Link to="/about" className={linkClasses}>{t('publicNav.about')}</Link></li>
            <li><Link to="/vision" className={linkClasses}>{t('publicNav.vision')}</Link></li>
            <li><Link to="/benefits" className={linkClasses}>{t('publicNav.benefits')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white">{t('pub.footer.getStarted')}</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm">
            <li><Link to="/login" className={linkClasses}>{t('publicNav.signIn')}</Link></li>
            <li><Link to="/driver/register" className={linkClasses}>{t('publicNav.registerDriver')}</Link></li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white">{t('pub.footer.contact')}</p>
          <div className="mt-4 flex max-w-xs flex-col gap-2.5">
            <button type="button" onClick={() => setInquiryOpen(true)} className={contactButton}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="tabular-nums">{CONTACT_PHONE_DISPLAY}</span>
            </button>
            <button type="button" onClick={() => setInquiryOpen(true)} className={contactButton}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate">{CONTACT_EMAIL}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-center text-xs leading-relaxed text-nav-muted sm:px-6">
        <Trans
          i18nKey="pub.footer.credits"
          components={{
            plato: (
              <a
                href="https://www.pexels.com/photo/group-of-local-schoolgirls-near-rickshaw-5909898/"
                target="_blank"
                rel="noreferrer"
                className={creditLink}
              />
            ),
            sandeep: (
              <a
                href="https://www.pexels.com/photo/school-bus-of-indian-schools-the-travel-soul-sandeep-kr-singh-28203486/"
                target="_blank"
                rel="noreferrer"
                className={creditLink}
              />
            ),
            indore: (
              <a
                href="https://commons.wikimedia.org/wiki/File:School_bus,_Indore.jpg"
                target="_blank"
                rel="noreferrer"
                className={creditLink}
              />
            ),
            kerala: (
              <a
                href="https://commons.wikimedia.org/wiki/File:School_bus_kerala.JPG"
                target="_blank"
                rel="noreferrer"
                className={creditLink}
              />
            ),
          }}
        />
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-nav-muted sm:px-6">
        {t('pub.footer.rights', { year: new Date().getFullYear() })}
      </div>
      <InquiryModal open={inquiryOpen} onClose={() => setInquiryOpen(false)} />
    </footer>
  );
}
