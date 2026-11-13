import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { listMyAlerts } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { todayIst } from '@/lib/dates';
import { useLiveTopic } from '@/hooks/useLiveTopic';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AlertDetails } from './TeacherPages';

const seenKey = (userId: number | string | null) => `teacher-alerts-seen:${userId ?? 'anon'}`;

function loadSeen(userId: number | string | null): number[] {
  try {
    const raw = window.localStorage.getItem(seenKey(userId));
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function saveSeen(userId: number | string | null, ids: number[]) {
  try {
    window.localStorage.setItem(seenKey(userId), JSON.stringify(ids.slice(-200)));
  } catch {
    /* storage unavailable: the popup just re-appears next load */
  }
}

/**
 * App-wide for teachers (mounted in the shell): pops up whenever a child was dropped at school by the bus but is not
 * marked present. Live over /topic/teacher/{userId}/alerts; refetches on every (re)connect so a missed frame never hides one.
 */
export function TeacherAlertPopup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const today = todayIst();
  const [seen, setSeen] = useState<number[]>(() => loadSeen(userId));

  const { data: alerts } = useQuery({
    queryKey: ['my-alerts', today],
    queryFn: () => listMyAlerts(today),
    enabled: userId != null,
  });

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['my-alerts'] });
  }, [queryClient]);
  useLiveTopic([userId ? `/topic/teacher/${userId}/alerts` : null], refetch, { refetchOnConnect: true });

  useEffect(() => setSeen(loadSeen(userId)), [userId]);

  const unseen = (alerts ?? []).filter((a) => !seen.includes(a.arrivalId));
  const current = unseen[0];

  const dismiss = () => {
    if (!current) return;
    const next = [...seen, current.arrivalId];
    setSeen(next);
    saveSeen(userId, next);
  };

  return (
    <Modal
      open={current !== undefined}
      onClose={dismiss}
      title={
        <span className="flex items-center gap-2 text-alert-700">
          <BellRing className="h-5 w-5" aria-hidden="true" />
          {t('teacher.alerts.popupTitle')}
        </span>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              dismiss();
              navigate('/teacher/alerts');
            }}
          >
            {t('teacher.alerts.viewAll')}
          </Button>
          <Button onClick={dismiss}>{unseen.length > 1 ? t('teacher.alerts.nextOf', { count: unseen.length - 1 }) : t('teacher.alerts.gotIt')}</Button>
        </>
      }
    >
      {current && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-700">{t('teacher.alerts.popupBody', { name: current.studentName })}</p>
          <AlertDetails alert={current} />
        </div>
      )}
    </Modal>
  );
}
