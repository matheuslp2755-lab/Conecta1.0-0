import { useLanguage } from '../context/LanguageContext';

export const useTimeAgo = () => {
  const { t } = useLanguage();

  const formatTimestamp = (timestamp: { seconds: number; nanoseconds: number } | null | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('time.seconds', { count: diffInSeconds });
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return t('time.minutes', { count: diffInMinutes });
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('time.hours', { count: diffInHours });
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('time.days', { count: diffInDays });
    
    return date.toLocaleDateString('pt-BR');
  };

  return { formatTimestamp };
};
