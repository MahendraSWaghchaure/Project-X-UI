import { cn } from '@/lib/cn';

const SIZE_CLASSES = {
  sm: { icon: 28, brand: 'text-lg', tag: 'text-[9px]', gap: 'gap-2' },
  md: { icon: 34, brand: 'text-2xl', tag: 'text-[10px]', gap: 'gap-2.5' },
  lg: { icon: 52, brand: 'text-4xl sm:text-5xl', tag: 'text-xs sm:text-sm', gap: 'gap-3' },
} as const;

interface LogoProps {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  tone?: 'light' | 'dark';
}

/** The route-mark: a path curving up to a stop, standing in for "the journey, tracked to a safe arrival." Inverts to a light badge with a navy path on dark backgrounds (tone="light"). */
function BrandMark({ size, tone }: { size: number; tone: 'light' | 'dark' }) {
  const badge = tone === 'dark' ? '#16233F' : '#F7F3EC';
  const path = tone === 'dark' ? '#E2A23B' : '#16233F';
  const startDot = tone === 'dark' ? '#C8D2E4' : '#8493B3';
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className="shrink-0">
      <rect x="1" y="1" width="42" height="42" rx="13" fill={badge} />
      <path d="M10 30C10 30 15 24 22 24C29 24 34 14 34 14" stroke={path} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.5 6.5" />
      <circle cx="10" cy="30" r="2.6" fill={startDot} />
      <circle cx="34" cy="14" r="3.4" fill={path} />
    </svg>
  );
}

/** The brand mark: an abstract route-icon plus the "Sunju" wordmark in the display serif, with a small tagline underneath - used in the public header, sidebar, auth pages, and footer so it stays consistent everywhere. */
export function Logo({ size = 'md', className, tone = 'dark' }: LogoProps) {
  const { icon, brand, tag, gap } = SIZE_CLASSES[size];
  return (
    <span className={cn('inline-flex items-center', gap, className)}>
      <BrandMark size={icon} tone={tone} />
      <span className="inline-flex flex-col leading-none">
        <span
          className={cn('font-display font-bold tracking-tight', brand, tone === 'dark' ? 'text-blue-600' : 'text-white')}
        >
          Sunju
        </span>
        <span
          className={cn(
            'mt-0.5 font-semibold uppercase tracking-wider',
            tag,
            tone === 'dark' ? 'text-slate-500' : 'text-blue-100',
          )}
        >
          School Bus Service
        </span>
      </span>
    </span>
  );
}
