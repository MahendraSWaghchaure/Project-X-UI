import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { searchStudentsForParent } from '@/lib/api/attendance';
import { classroomLabel } from '@/lib/classroom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { StudentSearchResult } from '@/types/attendance';

/**
 * E4: parent's "pick the other student" dialog for a grievance that concerns a student other than their own child.
 * Search is scoped to one school (the one the parent's own child attends) and returns only name + class + section -
 * no guardian contact or other PII, by design of the backend endpoint.
 */
export function StudentPickerDialog({
  open,
  schoolId,
  onClose,
  onSelect,
}: {
  open: boolean;
  schoolId: number | null;
  onClose: () => void;
  onSelect: (student: StudentSearchResult) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setDebouncedQ('');
    }
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['student-search', schoolId, debouncedQ],
    queryFn: () => searchStudentsForParent(schoolId!, debouncedQ),
    enabled: open && schoolId != null && debouncedQ.length >= 2,
  });

  return (
    <Modal open={open} onClose={onClose} title={t('grievances.studentPicker.title')}>
      <div className="flex flex-col gap-4">
        <Input
          label={t('grievances.studentPicker.search')}
          placeholder={t('grievances.studentPicker.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        {debouncedQ.length < 2 && <p className="text-sm text-slate-500">{t('grievances.studentPicker.typeMore')}</p>}
        {isFetching && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
        <ul className="flex max-h-72 flex-col divide-y divide-slate-100 overflow-y-auto">
          {results?.map((s) => (
            <li key={s.studentId}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{s.name}</span>
                <span className="text-sm text-slate-500">{s.className ? classroomLabel({ name: s.className, section: s.section }) : '—'}</span>
              </button>
            </li>
          ))}
          {results && results.length === 0 && debouncedQ.length >= 2 && !isFetching && (
            <li className="py-3 text-sm text-slate-500">{t('grievances.studentPicker.empty')}</li>
          )}
        </ul>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Icon re-exported so call sites don't need their own lucide import just for the trigger button. */
export const StudentPickerIcon = Search;
