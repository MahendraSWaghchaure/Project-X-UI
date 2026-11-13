import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import type { GrievanceStatus } from '@/types/grievance';

const TONE: Record<GrievanceStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  REJECTED: 'danger',
};

export function GrievanceStatusBadge({ status }: { status: GrievanceStatus }) {
  const { t } = useTranslation();
  return <Badge tone={TONE[status]}>{t(`enums.grievanceStatus.${status}`, { defaultValue: status.replace('_', ' ') })}</Badge>;
}
