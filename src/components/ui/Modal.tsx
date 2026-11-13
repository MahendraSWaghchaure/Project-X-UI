import { useEffect, useId, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** id of an element inside `children` that describes the dialog; wired to aria-describedby. */
  descriptionId?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** 'center' (default; becomes a bottom sheet on phones) or 'right' (side drawer, see Drawer.tsx). */
  placement?: 'center' | 'right';
}

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Backdrop click and Escape both close; the panel itself is portaled to <body> so it always sits above app content, no z-index tug-of-war with a scrollable parent.
 * Focus moves into the panel only when it opens (never on re-render, so a caller passing a fresh inline `onClose` cannot steal focus from a field the user is typing in),
 * is trapped inside while open, and returns to the previously focused element on close.
 */
export function Modal({ open, onClose, title, descriptionId, children, footer, size = 'md', placement = 'center' }: ModalProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Latest onClose without making it an effect dependency.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active) || active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        placement === 'right' ? 'items-stretch justify-end' : 'items-end justify-center sm:items-center sm:p-4',
      )}
    >
      <div className="absolute inset-0 animate-fade-in bg-scrim backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col border border-slate-200 bg-surface shadow-pop outline-none',
          placement === 'right'
            ? 'h-full max-w-md animate-slide-in-right rounded-l-2xl sm:max-w-lg'
            : cn('max-h-[92vh] animate-pop-in rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl', SIZE_CLASSES[size]),
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-slate-200/70 bg-slate-50 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ModalDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />;
}
