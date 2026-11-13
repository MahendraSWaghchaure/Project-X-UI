import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const SIZE_CLASSES = {
  sm: { icon: 30, brand: 'text-xl', tag: 'text-[9px]', gap: 'gap-2.5' },
  md: { icon: 38, brand: 'text-2xl', tag: 'text-[10px]', gap: 'gap-3' },
  lg: { icon: 56, brand: 'text-4xl sm:text-5xl', tag: 'text-xs sm:text-sm', gap: 'gap-3.5' },
} as const;

interface LogoProps {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /**
   * `auto` (default): wordmark follows the theme (dark ink in day, near-white at night).
   * `light`: always white wordmark - for surfaces that are dark in both themes (sidebar, footer, brand panel).
   * `onBrand`: white wordmark + white badge, for the red / cobalt brand panel where a coloured badge would vanish.
   * `dark` is kept for older call sites and behaves like `auto`.
   */
  tone?: 'auto' | 'light' | 'dark' | 'onBrand';
  /** Where the logo links. Pass `null` to render a plain (non-link) logo, e.g. when already inside a link. */
  to?: string | null;
}

/**
 * The mark: a rising sun (accent) over a dashed route that ends in a stop - "Sunju", the journey tracked to a
 * safe arrival. Colours come from the theme tokens, so it re-tints itself in day (red / sunshine) and night
 * (cobalt / lime) without any prop.
 */
export function BrandMark({ size, inverse }: { size: number; inverse?: boolean }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className="shrink-0" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="42" height="42" rx="13" className={inverse ? 'fill-white' : 'fill-primary'} />
      <rect x="1" y="1" width="42" height="42" rx="13" fill={`url(#${gradientId})`} />
      <circle cx="31" cy="14" r="6.2" className="fill-accent" />
      <path
        d="M9 32C14 32 17 25.5 23 25.5C29 25.5 31 30 36 30"
        stroke={inverse ? '#0b1b33' : '#fff'}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.5 5.6"
      />
      <circle cx="9" cy="32" r="2.8" fill={inverse ? '#0b1b33' : '#fff'} />
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Brand mark + "Sunju" wordmark + tagline. The whole thing is a link to `/` (React Router) wherever it appears. */
export function Logo({ size = 'md', className, tone = 'auto', to = '/' }: LogoProps) {
  const { t } = useTranslation();
  const { icon, brand, tag, gap } = SIZE_CLASSES[size];
  const light = tone === 'light' || tone === 'onBrand';
  const content = (
    <>
      <BrandMark size={icon} inverse={tone === 'onBrand'} />
      <span className="inline-flex flex-col leading-none">
        <span className={cn('font-display font-extrabold tracking-tight', brand, light ? 'text-white' : 'text-slate-900')}>
          Sunju
        </span>
        <span
          className={cn('mt-1 whitespace-nowrap font-semibold uppercase tracking-[0.18em]', tag, light ? 'text-white/70' : 'text-slate-500')}
        >
          {t('ui.logoTagline')}
        </span>
      </span>
    </>
  );
  const classes = cn('inline-flex items-center rounded-lg', gap, className);

  if (to === null) return <span className={classes}>{content}</span>;
  return (
    <Link to={to} aria-label={t('ui.logoHome')} className={cn(classes, 'transition-opacity hover:opacity-90')}>
      {content}
    </Link>
  );
}
