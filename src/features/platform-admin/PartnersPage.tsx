import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Handshake } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPartner, listPartners } from '@/lib/api/partners';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { optionalPhoneSchema } from '@/lib/validation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PARTNER_TYPES, type Partner } from '@/types/partner';

const schema = z.object({
  type: z.enum(PARTNER_TYPES as [string, ...string[]]),
  name: z.string().trim().min(1, 'validation.required').max(200),
  contactEmail: z.string().email('validation.email').optional().or(z.literal('')),
  contactPhone: optionalPhoneSchema,
  notes: z.string().trim().max(1000).optional(),
});
type FormValues = z.infer<typeof schema>;

/**
 * F1: lightweight future-addition partner lead capture (insurance company / legal advisor / RTO agent) - platform
 * admin only. No real onboarding/policy-issuance/payment flow exists yet; every row is clearly marked "Coming soon".
 */
export function PartnersPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['partners'], queryFn: () => listPartners({ size: 100 }) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'INSURANCE_COMPANY' } });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createPartner({
        type: values.type as Partner['type'],
        name: values.name,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('partners.created'));
      reset({ type: 'INSURANCE_COMPANY', name: '', contactEmail: '', contactPhone: '', notes: '' });
      setShowAdd(false);
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('partners.createFailed'))),
  });

  const columns: DataColumn<Partner>[] = [
    { key: 'name', header: t('common.name'), primary: true, cell: (p) => p.name },
    { key: 'type', header: t('partners.type'), cell: (p) => t(`partners.types.${p.type}`) },
    { key: 'email', header: t('common.email'), cell: (p) => p.contactEmail ?? '—' },
    { key: 'phone', header: t('common.phone'), cell: (p) => p.contactPhone ?? '—' },
    { key: 'status', header: t('common.status'), cell: () => <Badge tone="warning">{t('partners.comingSoon')}</Badge> },
    { key: 'created', header: t('common.date'), cell: (p) => formatDateTime(p.createdAt, locale) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('partners.title')}
        subtitle={t('partners.subtitle')}
        actions={<Button onClick={() => setShowAdd(true)}>{t('partners.add')}</Button>}
      />
      <Badge tone="warning" className="w-fit">
        {t('partners.futureAdditionBadge')}
      </Badge>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('partners.addTitle')}>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="flex flex-col gap-4">
          <Select label={t('partners.type')} required {...register('type')}>
            {PARTNER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`partners.types.${type}`)}
              </option>
            ))}
          </Select>
          <Input label={t('common.name')} required error={err(errors.name?.message)} {...register('name')} />
          <Input label={t('common.email')} type="email" error={err(errors.contactEmail?.message)} {...register('contactEmail')} />
          <Input label={t('common.phone')} error={err(errors.contactPhone?.message)} {...register('contactPhone')} />
          <Textarea label={t('common.notes')} rows={3} error={err(errors.notes?.message)} {...register('notes')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              {t('partners.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <DataTable
        caption={t('partners.title')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        empty={<EmptyState icon={Handshake} title={t('partners.emptyTitle')} description={t('partners.emptyBody')} />}
      />
    </div>
  );
}
