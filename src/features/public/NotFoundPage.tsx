import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{t('notFound.title')}</h1>
      <Link to="/" className="text-blue-600 hover:underline">
        {t('notFound.goHome')}
      </Link>
    </div>
  );
}
