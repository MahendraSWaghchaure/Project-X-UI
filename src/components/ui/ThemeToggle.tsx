import { Moon, Sun, SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeMode } from '@/lib/theme/themeCore';

const OPTIONS: { mode: ThemeMode; Icon: typeof Sun; labelKey: string }[] = [
  { mode: 'auto', Icon: SunMoon, labelKey: 'ui.theme.auto' },
  { mode: 'day', Icon: Sun, labelKey: 'ui.theme.day' },
  { mode: 'night', Icon: Moon, labelKey: 'ui.theme.night' },
];

/**
 * Compact Auto / Day / Night switch. Auto follows the clock (day 06:00-18:00); Day and Night pin the theme
 * (remembered in localStorage). `onDark` styles it for the always-dark sidebar / footer.
 */
export function ThemeToggle({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { t } = useTranslation();
  const { mode, theme, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={t('ui.theme.label')}
      title={t('ui.theme.current', { theme: t(`ui.theme.${theme}`) })}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border p-0.5',
        onDark ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-surface/80',
        className,
      )}
    >
      {OPTIONS.map(({ mode: value, Icon, labelKey }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            onClick={() => setMode(value)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              selected
                ? 'bg-primary text-on-primary shadow-sm'
                : onDark
                  ? 'text-white/70 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
