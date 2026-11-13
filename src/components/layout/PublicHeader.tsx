import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { labelKey: 'publicNav.home', to: '/' },
  { labelKey: 'publicNav.about', to: '/about' },
  { labelKey: 'publicNav.vision', to: '/vision' },
  { labelKey: 'publicNav.benefits', to: '/benefits' },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'text-primary-text after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

export function PublicHeader() {
  const { t } = useTranslation();
  return (
    <header className="glass sticky top-0 z-40 border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Logo size="sm" />
        <nav aria-label={t('ui.mainNavigation')} className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClasses}>
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/driver/register" className="hidden sm:block">
            <Button variant="secondary">{t('publicNav.registerDriver')}</Button>
          </Link>
          <Link to="/login">
            <Button>{t('publicNav.signIn')}</Button>
          </Link>
        </div>
      </div>
      {/* Phones: the section links live in a scrollable strip under the bar. */}
      <nav aria-label={t('ui.mainNavigation')} className="flex gap-1 overflow-x-auto border-t border-slate-200/70 px-3 py-1 md:hidden">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClasses}>
            {t(link.labelKey)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
