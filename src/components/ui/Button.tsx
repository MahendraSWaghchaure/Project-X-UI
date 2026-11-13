import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'safe';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** "lg" guarantees a 48px-high touch target (driver screens, approval dialog); "md" is the compact default (40px); "sm" is for dense table rows. */
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover hover:shadow-glow',
  secondary: 'border border-slate-300 bg-surface text-ink shadow-sm hover:border-primary hover:bg-slate-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-slate-700 hover:bg-slate-100',
  /** The single warm/neon accent (sunshine in day, acid lime at night), reserved for one hero call-to-action per screen. */
  accent: 'bg-accent text-on-accent font-bold shadow-sm hover:bg-accent-hover hover:shadow-md',
  /** Positive confirmation (e.g. "Yes, child is safe") - the safe token, not the accent. */
  safe: 'bg-safe-600 text-white shadow-sm hover:brightness-110',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-[13px]',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center whitespace-nowrap justify-center gap-2 rounded-lg font-semibold transition-all duration-150',
        'active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
