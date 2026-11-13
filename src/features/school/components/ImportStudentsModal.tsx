import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importStudents } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CSV_HEADER, MAX_IMPORT_ROWS, parseStudentCsv } from '../studentCsv';
import type { Classroom } from '@/types/attendance';

export function ImportStudentsModal({ open, onClose, classrooms }: { open: boolean; onClose: () => void; classrooms: Classroom[] }) {
  const { t } = useTranslation();
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseStudentCsv(text, classrooms), [text, classrooms]);

  const mutation = useMutation({
    mutationFn: () => importStudents(schoolId!, parsed.rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      const count = result ? (result.created ?? 0) + (result.updated ?? 0) : parsed.rows.length;
      toast.success(t('students.import.done', { count }));
      setText('');
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('students.import.failed'))),
  });

  const canImport = parsed.rows.length > 0 && parsed.errors.length === 0 && !parsed.tooMany;

  return (
    <Modal open={open} onClose={onClose} title={t('students.import.title')} size="lg">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">{t('students.import.help', { max: MAX_IMPORT_ROWS })}</p>
        <code className="block overflow-x-auto rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">{CSV_HEADER}</code>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {t('students.import.paste')}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            placeholder={`${CSV_HEADER}\nAsha,Verma,12,5 A,Rekha Verma,9876543210,rekha@example.com,yes`}
          />
        </label>
        {text.trim() && (
          <div role="status" className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">{t('students.import.ready', { count: parsed.rows.length })}</p>
            {parsed.tooMany && <p className="mt-1 text-alert-700">{t('students.import.tooMany', { max: MAX_IMPORT_ROWS })}</p>}
            {parsed.errors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-alert-700">
                {parsed.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    {t('students.import.line', { line: e.line })}: {t(`students.import.errors.${e.code}`, { detail: e.detail })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button isLoading={mutation.isPending} disabled={!canImport} onClick={() => mutation.mutate()}>
            {t('students.import.submit', { count: parsed.rows.length })}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
