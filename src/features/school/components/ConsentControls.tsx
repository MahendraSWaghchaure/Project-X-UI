import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendConsentLink } from '@/lib/api/attendance';
import { backendErrorMessage } from '@/lib/errorMessage';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { Button } from '@/components/ui/Button';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import type { ConsentStatus, Student } from '@/types/attendance';
import { consentStatusOf } from '../status';

const TONE: Record<ConsentStatus, StatusTone> = {
  NOT_REQUESTED: 'neutral',
  SENT: 'pending',
  EXPIRED: 'alert',
  GRANTED: 'safe',
  DECLINED: 'alert',
};

/** Consent status pill (NOT_REQUESTED | SENT (expires at) | EXPIRED | GRANTED | DECLINED). */
export function ConsentChip({ student, size = 'sm' }: { student: Pick<Student, 'consentStatus' | 'marketingConsent' | 'consentExpiresAt'>; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const status = consentStatusOf(student);
  return (
    <StatusChip tone={TONE[status]} size={size}>
      {t(`enums.consentStatus.${status}`)}
      {status === 'SENT' && student.consentExpiresAt ? ` · ${t('consent.expiresAt', { time: formatDateTime(student.consentExpiresAt, locale) })}` : ''}
    </StatusChip>
  );
}

/** "Send consent link" / "Resend" - SMSes the guardian a single-use link valid for 48 hours. Hidden once consent is granted. */
export function SendConsentButton({
  schoolId,
  student,
  variant = 'secondary',
}: {
  schoolId: number;
  student: Pick<Student, 'id' | 'consentStatus' | 'marketingConsent' | 'guardianPhone' | 'firstName'>;
  variant?: 'secondary' | 'ghost';
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [devLink, setDevLink] = useState<string | null>(null);
  const status = consentStatusOf(student);

  const mutation = useMutation({
    mutationFn: () => sendConsentLink(schoolId, student.id),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['student', schoolId, student.id] });
      void queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      setDevLink(res.devLink ?? null);
      toast.success(t('consent.sent', { phone: res.sentTo ?? student.guardianPhone ?? '' }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('consent.sendFailed'))),
  });

  if (status === 'GRANTED' || !student.guardianPhone) return null;
  const label = status === 'NOT_REQUESTED' ? t('consent.send') : t('consent.resend');
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        isLoading={mutation.isPending}
        onClick={(e) => {
          e.stopPropagation();
          mutation.mutate();
        }}
        aria-label={t('consent.sendFor', { name: student.firstName, action: label })}
      >
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </Button>
      {devLink && (
        <a href={devLink} className="break-all text-xs text-primary-text underline" target="_blank" rel="noreferrer">
          {t('consent.devLink')}
        </a>
      )}
    </div>
  );
}
