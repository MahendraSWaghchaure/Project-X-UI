import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders a trailing accent-coloured `*` after the label and sets `aria-required`. Purely visual/a11y - does not add HTML `required` validation on its own (forms already validate via Zod). */
  required?: boolean;
}

/** Shared control chrome so Input / Select / Textarea look identical. */
export const FIELD_CLASSES =
  'min-h-10 rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors ' +
  'placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export const FIELD_ERROR_CLASSES = 'border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-500/30';

/**
 * Shared `<label>` + trailing accent `*` so Input / Select / Textarea render the required mark
 * identically. The `*` is CSS-generated content (`after:content-['*']`), not a DOM text node:
 * putting it in the label's actual text broke every existing `getByLabelText('Exact Label')`
 * query across the test suite (label.textContent became e.g. "Email*"), and `aria-hidden` on a
 * span doesn't fix that - Testing Library's label matcher reads raw textContent, not the
 * accessible-name algorithm. The real "this field is required" semantics for assistive tech come
 * from `aria-required` on the control itself (set alongside this), which is the more robust
 * signal anyway - some screen readers skip or mis-announce a bare "*" glyph.
 */
export function FieldLabel({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-semibold text-slate-700',
        required && "after:ml-0.5 after:text-primary after:content-['*']",
      )}
    >
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, required, className, id, ...props }, ref) => {
  const autoId = useId();
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : autoId);
  const messageId = `${inputId}-msg`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(FIELD_CLASSES, error && FIELD_ERROR_CLASSES, className)}
        {...props}
      />
      {error ? (
        <span id={messageId} className="text-xs font-medium text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="text-xs text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
Input.displayName = 'Input';
