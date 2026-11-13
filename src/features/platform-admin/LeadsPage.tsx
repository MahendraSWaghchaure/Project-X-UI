import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { listLeads } from '@/lib/api/attendance';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';

const PAGE_SIZE = 25;

export function LeadsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ['platform-leads', page],
    queryFn: () => listLeads({ page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('leads.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t('leads.subtitle')}</p>
      </div>

      <div role="note" className="rounded-lg border border-pending-200 bg-pending-50 px-4 py-3 text-sm text-pending-700">
        {t('leads.consentNote')}
      </div>

      <Card>
        <CardBody>
          {isLoading && <SkeletonTable rows={6} columns={5} />}
          {data && data.content.length > 0 && (
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>{t('leads.name')}</TableHeaderCell>
                  <TableHeaderCell>{t('leads.phone')}</TableHeaderCell>
                  <TableHeaderCell>{t('leads.email')}</TableHeaderCell>
                  <TableHeaderCell>{t('leads.school')}</TableHeaderCell>
                  <TableHeaderCell>{t('leads.source')}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.content.map((lead, i) => (
                  <TableRow key={lead.studentId ?? `${lead.phone}-${i}`}>
                    <TableCell className="font-medium text-slate-900">{lead.name}</TableCell>
                    <TableCell className="tabular-nums">{lead.phone}</TableCell>
                    <TableCell>{lead.email ?? '—'}</TableCell>
                    <TableCell>{lead.school}</TableCell>
                    <TableCell>
                      <Badge>{lead.leadSource}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {data && data.content.length === 0 && (
            <EmptyState icon={Megaphone} title={t('leads.emptyTitle')} description={t('leads.emptyBody')} />
          )}
        </CardBody>
      </Card>

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
