import { useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';
import { z } from 'zod';
import { submitInquiry } from '@/lib/api/inquiries';
import { backendErrorMessage } from '@/lib/errorMessage';
import { toast } from '@/lib/toastStore';
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF } from '@/lib/contact';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalDescription } from '@/components/ui/Modal';

const PHONE_LIKE = /^\+?[0-9]{7,15}$/;
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InquiryModalProps {
  open: boolean;
  onClose: () => void;
}

/** Public "send us an inquiry" dialog (footer phone/email buttons open it). POSTs to /public/inquiries. */
export function InquiryModal({ open, onClose }: InquiryModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const descId = useId();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('ui.inquiry.nameRequired')).max(120),
        contact: z
          .string()
          .trim()
          .min(1, t('ui.inquiry.contactRequired'))
          .refine((v) => EMAIL_LIKE.test(v) || PHONE_LIKE.test(v.replace(/[\s-]/g, '')), t('ui.inquiry.contactInvalid')),
        message: z.string().trim().min(1, t('ui.inquiry.messageRequired')).max(2000, t('ui.inquiry.messageTooLong')),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', contact: '', message: '' } });

  function close() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  async function onSubmit(values: FormValues) {
    try {
      await submitInquiry({ name: values.name.trim(), contact: values.contact.trim(), message: values.message.trim() });
      toast.success(t('ui.inquiry.success'));
      reset();
      onClose();
    } catch (error) {
      toast.error(backendErrorMessage(error, t('ui.inquiry.error')));
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('ui.inquiry.title')}
      descriptionId={descId}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={isSubmitting}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting}>
            {isSubmitting ? t('ui.inquiry.sending') : t('ui.inquiry.send')}
          </Button>
        </>
      }
    >
      <ModalDescription id={descId}>{t('ui.inquiry.intro')}</ModalDescription>
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-4">
        <Input label={t('ui.inquiry.name')} autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label={t('ui.inquiry.contact')}
          autoComplete="email"
          inputMode="email"
          hint={t('ui.inquiry.contactHint')}
          error={errors.contact?.message}
          {...register('contact')}
        />
        <Textarea label={t('ui.inquiry.message')} rows={4} error={errors.message?.message} {...register('message')} />
      </form>
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('ui.inquiry.reachUs')}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <a href={CONTACT_PHONE_HREF} className="inline-flex min-h-9 items-center gap-2 text-primary-text hover:underline">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t('ui.inquiry.call', { phone: CONTACT_PHONE_DISPLAY })}
          </a>
          <a href={CONTACT_EMAIL_HREF} className="inline-flex min-h-9 items-center gap-2 text-primary-text hover:underline">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('ui.inquiry.email', { email: CONTACT_EMAIL })}
          </a>
        </div>
      </div>
    </Modal>
  );
}
