import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FIELD_CLASSES, FIELD_ERROR_CLASSES, FieldLabel } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders a trailing accent-coloured `*` after the label and sets `aria-required`. */
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, id, rows = 4, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : autoId);
    const messageId = `${fieldId}-msg`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={fieldId} required={required}>
            {label}
          </FieldLabel>
        )}
        <textarea
          id={fieldId}
          ref={ref}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(FIELD_CLASSES, 'resize-y', error && FIELD_ERROR_CLASSES, className)}
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
  },
);
Textarea.displayName = 'Textarea';
