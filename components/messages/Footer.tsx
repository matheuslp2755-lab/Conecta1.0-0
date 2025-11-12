import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const Footer: React.FC = () => {
    const { t } = useLanguage();
    
    const footerLinks = [
        { key: 'meta', name: t('footer.links.meta') },
        { key: 'about', name: t('footer.links.about') },
        { key: 'blog', name: t('footer.links.blog') },
        { key: 'jobs', name: t('footer.links.jobs') },
        { key: 'help', name: t('footer.links.help') },
        { key: 'api', name: t('footer.links.api') },
        { key: 'privacy', name: t('footer.links.privacy') },
        { key: 'terms', name: t('footer.links.terms') },
        { key: 'locations', name: t('footer.links.locations') },
        { key: 'lite', name: t('footer.links.lite') },
        { key: 'threads', name: t('footer.links.threads') },
        { key: 'contact', name: t('footer.links.contact') },
        { key: 'verified', name: t('footer.links.verified') },
    ];

  return (
    <footer className="text-zinc-500 dark:text-zinc-400 text-xs px-4 pb-4">
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-4">
        {footerLinks.map(link => (
          <a key={link.key} href="#" className="hover:underline">
            {link.name}
          </a>
        ))}
      </div>
      <div className="flex justify-center items-center gap-4">
        <span>{t('footer.language')}</span>
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
};

export default Footer;
