import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listMyNotifications } from '@/lib/api/notifications';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const [page, setPage] = useState(0);

  // Distinct key from the dashboard's own "recent glance" query against this same endpoint -
  // different page/size args must not share a cache entry.
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['my-notifications', 'history', page],
    queryFn: () => listMyNotifications(page, PAGE_SIZE),
  });
  const notifications = pageData?.content;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('notifications.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('parentApp.notificationsHistory')}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={6} columns={2} />}
          <ul className="divide-y divide-slate-100">
            {notifications?.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {t(`parentApp.notificationTemplate.${n.templateKey}`, { defaultValue: n.templateKey })}
                  </p>
                  <p className="text-sm text-slate-500">
                    {t(`parentApp.channel.${n.channel}`, { defaultValue: n.channel })} &middot; {new Date(n.createdAt).toLocaleString(locale)}
                  </p>
                </div>
                <Badge tone={n.status === 'SENT' ? 'success' : n.status === 'FAILED' ? 'danger' : 'neutral'}>
                  {t(`parentApp.notificationStatus.${n.status}`, { defaultValue: n.status.replace(/_/g, ' ').toLowerCase() })}
                </Badge>
              </li>
            ))}
            {notifications?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('parentApp.noNotifications')}</p>}
          </ul>
          {pageData && (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={pageData.totalPages}
              totalElements={pageData.totalElements}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
