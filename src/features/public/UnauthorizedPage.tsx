import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function UnauthorizedPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{t('unauthorized.title')}</h1>
      <p className="text-slate-600">{t('unauthorized.body')}</p>
      <Link to="/login" className="text-blue-600 hover:underline">
        {t('unauthorized.back')}
      </Link>
    </div>
  );
}
