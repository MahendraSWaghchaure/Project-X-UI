import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listRoutes } from '@/lib/api/routes';
import { Select } from '@/components/ui/Select';

interface RouteFilterSelectProps {
  schoolId: number;
  value: number | undefined;
  onChange: (routeId: number | undefined) => void;
}

/**
 * A school already sits at one district, so the country/state/district cascade used on the
 * platform-admin Schools list doesn't apply to a school admin's own fleet - the meaningful way
 * to slice their drivers/vehicles/children is by Route, since each route already partitions the
 * school's catchment into a real service area (its stops).
 */
export function RouteFilterSelect({ schoolId, value, onChange }: RouteFilterSelectProps) {
  const { t } = useTranslation();
  const { data: routes } = useQuery({ queryKey: ['routes', schoolId], queryFn: () => listRoutes(schoolId) });

  return (
    <Select
      label={t('geo.filterByRoute')}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="min-w-[200px]"
    >
      <option value="">{t('geo.allRoutes')}</option>
      {routes?.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}
