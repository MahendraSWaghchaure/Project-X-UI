import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore, type ToastTone } from '@/lib/toastStore';
import { cn } from '@/lib/cn';

const TONE: Record<ToastTone, { bar: string; icon: string; Icon: typeof Info }> = {
  success: { bar: 'bg-safe-600', icon: 'text-safe-700', Icon: CheckCircle2 },
  error: { bar: 'bg-alert-600', icon: 'text-alert-700', Icon: XCircle },
  info: { bar: 'bg-info-600', icon: 'text-info-700', Icon: Info },
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end">
      {toasts.map((toast) => {
        const { bar, icon, Icon } = TONE[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto relative flex max-w-md items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-surface py-3 pl-5 pr-3 text-sm font-medium text-slate-900 shadow-pop animate-pop-in"
          >
            <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', bar)} />
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', icon)} aria-hidden="true" />
            <span className="flex-1 break-words">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t('ui.dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
