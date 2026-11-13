import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listInquiries, updateInquiryStatus, type Inquiry, type InquiryStatus } from '@/lib/api/inquiries';
import { backendErrorMessage } from '@/lib/errorMessage';
import { formatDateTime, useIntlLocale } from '@/lib/format';
import { toast } from '@/lib/toastStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs } from '@/components/ui/Tabs';

const PAGE_SIZE = 20;
type Tab = 'ALL' | InquiryStatus;

/** Contact is free text (phone or email): make whichever it is tappable. */
function ContactLink({ contact }: { contact: string }) {
  const isEmail = contact.includes('@');
  const href = isEmail ? `mailto:${contact}` : `tel:${contact.replace(/[\s-]/g, '')}`;
  return (
    <a className="font-medium text-primary-text underline-offset-2 hover:underline" href={href}>
      {contact}
    </a>
  );
}

/** Platform admin: inquiries submitted through the public footer form. */
export function InquiriesPage() {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('NEW');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', tab, page],
    queryFn: () => listInquiries({ status: tab === 'ALL' ? undefined : tab, page, size: PAGE_SIZE }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InquiryStatus }) => updateInquiryStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success(t('inquiries.updated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('inquiries.updateFailed'))),
  });

  const columns: DataColumn<Inquiry>[] = [
    { key: 'name', header: t('common.name'), primary: true, cell: (i) => i.name },
    { key: 'contact', header: t('inquiries.contact'), cell: (i) => <ContactLink contact={i.contact} /> },
    { key: 'message', header: t('inquiries.message'), cell: (i) => <p className="max-w-md whitespace-pre-wrap break-words">{i.message}</p> },
    { key: 'received', header: t('inquiries.received'), cell: (i) => formatDateTime(i.createdAt, locale) },
    {
      key: 'status',
      header: t('common.status'),
      cell: (i) => <Badge tone={i.status === 'NEW' ? 'warning' : 'success'}>{t(`inquiries.status.${i.status}`)}</Badge>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      cell: (i) => (
        <Button
          size="sm"
          variant="secondary"
          isLoading={mutation.isPending && mutation.variables?.id === i.id}
          onClick={() => mutation.mutate({ id: i.id, status: i.status === 'NEW' ? 'HANDLED' : 'NEW' })}
        >
          {i.status === 'NEW' ? t('inquiries.markHandled') : t('inquiries.reopen')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('inquiries.title')} subtitle={t('inquiries.subtitle')} />
      <Tabs
        label={t('inquiries.filter')}
        value={tab}
        onChange={(id) => {
          setTab(id as Tab);
          setPage(0);
        }}
        tabs={[
          { id: 'NEW', label: t('inquiries.status.NEW') },
          { id: 'HANDLED', label: t('inquiries.status.HANDLED') },
          { id: 'ALL', label: t('common.all') },
        ]}
      />
      <DataTable
        caption={t('inquiries.title')}
        columns={columns}
        rows={data?.content}
        isLoading={isLoading}
        getRowKey={(i) => i.id}
        empty={<EmptyState icon={MessageCircle} title={t('inquiries.emptyTitle')} description={t('inquiries.emptyBody')} />}
      />
      <Pagination
        page={data?.page ?? 0}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
