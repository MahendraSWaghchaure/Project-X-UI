/** Nursery through 10th, the range this product's schools actually enroll for. */
export const CLASS_LEVELS = [
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
] as const;

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/** The backend stores class+section as one free-text column (e.g. "8th A") - this is the one place that joins them before a save. */
export function combineClassSection(classLevel?: string, section?: string): string | undefined {
  const parts = [classLevel?.trim(), section?.trim()].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Best-effort reverse of combineClassSection, for pre-filling the edit form from a stored
 * "8th A" string. Falls back to treating the whole value as the section if it doesn't start with
 * a recognized class level (e.g. older free-text data from before this dropdown existed) - keeps
 * the data visible and editable instead of silently dropping it.
 */
export function splitClassSection(value: string | null | undefined): { classLevel: string; section: string } {
  if (!value) return { classLevel: '', section: '' };
  for (const level of CLASS_LEVELS) {
    if (value === level) return { classLevel: level, section: '' };
    if (value.startsWith(level + ' ')) return { classLevel: level, section: value.slice(level.length + 1).trim() };
  }
  return { classLevel: '', section: value };
}
