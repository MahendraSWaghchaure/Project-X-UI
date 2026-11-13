import type { TFunction } from 'i18next';
import type { Grievance } from '@/types/grievance';

/** "Vehicle condition", or "Other: <free text>" for OTHER; falls back to the legacy category for old rows. */
export function grievanceTypeLabel(t: TFunction, g: Pick<Grievance, 'type' | 'otherDescription' | 'category'>): string {
  if (g.type === 'OTHER') {
    return g.otherDescription
      ? t('grievances.otherWithText', { text: g.otherDescription })
      : t('enums.grievanceType.OTHER');
  }
  if (g.type) return t(`enums.grievanceType.${g.type}`, { defaultValue: g.type });
  return t(`enums.grievanceCategory.${g.category}`, { defaultValue: g.category });
}
