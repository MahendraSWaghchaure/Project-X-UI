import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { cn } from '@/lib/cn';
import { BrandMark, Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Select } from '@/components/ui/Select';
import { ParentArrivalApproval } from '@/components/arrivals/ParentArrivalApproval';

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <Select
      value={i18n.resolvedLanguage}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="h-9 px-2 text-xs font-semibold hover:border-slate-400"
      aria-label={t('shell.language')}
    >
      <option value="en">EN</option>
      <option value="hi">हिं</option>
    </Select>
  );
}

import { useNavItems } from './navConfig';
import { TeacherAlertPopup } from '@/features/teacher/TeacherAlertPopup';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function clockFormats(language: string | undefined) {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return {
    date: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  };
}

export function AppShell() {
  const { role, email, clearSession } = useAuthStore();
  const { t, i18n } = useTranslation();
  const clock = clockFormats(i18n.resolvedLanguage);
  const navigate = useNavigate();
  const location = useLocation();
  const now = useClock();
  const navItems = useNavItems(role);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileNavOpen]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Consecutive items sharing a `group` render under one section label (e.g. Transport); the rest stay flat.
  const sections = navItems.reduce<{ group?: string; items: typeof navItems }[]>((acc, item) => {
    const last = acc[acc.length - 1];
    if (last && item.group && last.group === item.group) last.items.push(item);
    else acc.push({ group: item.group, items: [item] });
    return acc;
  }, []);

  const renderItem = (item: (typeof navItems)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150',
          isActive ? 'bg-primary text-on-primary shadow-glow' : 'text-nav-ink/80 hover:bg-nav-hover hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
              isActive ? 'bg-accent' : 'bg-white/25 group-hover:bg-white/50',
            )}
          />
          <span className="truncate">{item.labelKey ? t(`nav.${item.labelKey}`) : item.label}</span>
        </>
      )}
    </NavLink>
  );

  const navLinks = (
    <nav aria-label={t('ui.sidebar')} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
      {sections.map((section, i) => {
        const group = section.group;
        if (!group) return section.items.map(renderItem);
        const hasActive = section.items.some((item) => location.pathname.startsWith(item.to));
        const collapsed = (collapsedGroups[group] ?? false) && !hasActive;
        const listId = `nav-group-${group}`;
        return (
          <div key={`${group}-${i}`} className="mt-3 flex flex-col gap-1">
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={listId}
              onClick={() => setCollapsedGroups((c) => ({ ...c, [group]: !collapsed }))}
              className="flex min-h-9 items-center justify-between rounded-lg px-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-nav-muted transition-colors hover:text-white"
            >
              {t(`nav.group.${group}`, { defaultValue: group })}
              <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', collapsed && '-rotate-90')} />
            </button>
            <div id={listId} className={cn('flex flex-col gap-1', collapsed && 'hidden')}>
              {section.items.map(renderItem)}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('ui.skipToContent')}
      </a>

      {/* Desktop sidebar: sticky column, lg and up. Always dark (navy by day, near-black at night) so the brand reads the same in both themes. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-nav-bg text-nav-ink lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Logo size="sm" tone="light" />
        </div>
        {navLinks}
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-nav-line bg-white/5 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-extrabold uppercase text-on-accent">
            {(email ?? '?').charAt(0)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-xs font-bold uppercase tracking-wider text-white">
              {role ? t(`nav.role.${role}`) : ''}
            </span>
            <span className="block truncate text-xs text-nav-muted">{email}</span>
          </span>
        </div>
      </aside>

      {/* Mobile sidebar: off-canvas drawer below lg, toggled from the header hamburger. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-scrim backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <aside className="relative flex h-full w-72 max-w-[85vw] animate-slide-in-left flex-col bg-nav-bg text-nav-ink shadow-pop">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <Logo size="sm" tone="light" />
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label={t('shell.closeMenu')}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-nav-muted hover:bg-nav-hover hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navLinks}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label={t('shell.openMenu')}
              aria-expanded={mobileNavOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" aria-label={t('ui.logoHome')} className="rounded-lg lg:hidden">
              <BrandMark size={30} />
            </Link>
            <span className="hidden rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-text sm:inline">
              {role ? t(`nav.role.${role}`) : ''}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-3 py-1 text-xs font-medium text-slate-600 xl:flex">
              <span>{clock.date.format(now)}</span>
              <span className="text-slate-400">&middot;</span>
              <span className="tabular-nums">{clock.time.format(now)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {role === 'PARENT' && (
              <button
                onClick={() => navigate('/parent/track')}
                title={t('shell.trackBusLive')}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-hover sm:px-3.5"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.25A2.25 2.25 0 1 1 10 5.75a2.25 2.25 0 0 1 0 4.5Z" />
                </svg>
                <span className="hidden sm:inline">{t('shell.trackBus')}</span>
              </button>
            )}
            <ThemeToggle />
            <LanguageSwitcher />
            {email && <span className="hidden max-w-[14rem] truncate text-sm text-slate-600 xl:inline">{email}</span>}
            <button
              onClick={() => {
                clearSession();
                window.location.assign('/login');
              }}
              aria-label={t('common.signOut')}
              className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-3"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('common.signOut')}</span>
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[88rem] flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        {/* Safe-arrival approval prompt: app-wide for parents so it shows on whichever screen they are on. */}
        {role === 'PARENT' && <ParentArrivalApproval />}
        {/* Live "child dropped but not marked present" popup for teachers, on whichever screen they are on. */}
        {role === 'TEACHER' && <TeacherAlertPopup />}
      </div>
    </div>
  );
}
