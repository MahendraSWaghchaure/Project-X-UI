import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import type { Subscription } from '@/types/attendance';

/** "Subscribed" (rides a Sunju bus) vs "Not on Sunju" (roster-only student). */
export function SubscriptionBadge({ subscription }: { subscription: Subscription }) {
  const { t } = useTranslation();
  return subscription === 'SUBSCRIBED' ? (
    <Badge tone="info">{t('students.subscribed')}</Badge>
  ) : (
    <Badge tone="neutral">{t('students.notOnSunju')}</Badge>
  );
}
