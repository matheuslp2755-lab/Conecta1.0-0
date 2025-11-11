import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface OnlineIndicatorProps {
    className?: string;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ className = 'bottom-0 right-0' }) => {
    const { t } = useLanguage();
    return (
        <span 
            className={`absolute block h-4 w-4 rounded-full bg-green-500 ring-2 ring-white dark:ring-black ${className}`}
            title={t('common.online')}
        />
    );
};

export default OnlineIndicator;
