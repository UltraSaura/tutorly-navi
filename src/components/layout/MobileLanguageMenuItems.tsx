import React from 'react';
import { useLanguage } from '@/context/SimpleLanguageContext';

const MobileLanguageMenuItems = () => {
  const { language, changeLanguage, t, resetLanguageDetection, detectLanguageNow } = useLanguage();

  const languages = [
    { code: 'en', name: t('language.english'), flag: '🇺🇸' },
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' }
  ];

  const manuallySet = localStorage.getItem('languageManuallySet') === 'true';

  return (
    <div className="space-y-2">
      {!manuallySet && (
        <div className="text-xs text-muted-foreground mb-2 border-b pb-2">
          {t('language.autoDetected')}
        </div>
      )}
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
            language === lang.code 
              ? 'bg-accent text-accent-foreground' 
              : 'hover:bg-accent/50'
          }`}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="flex-1">{lang.name}</span>
          {language === lang.code && !manuallySet && (
            <span className="text-xs text-muted-foreground">{t('language.auto')}</span>
          )}
        </button>
      ))}

      <div className="mt-3 flex items-center justify-between">
        {manuallySet && (
          <button
            onClick={() => resetLanguageDetection()}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            {t('language.resetAuto')}
          </button>
        )}
        <button
          onClick={() => detectLanguageNow()}
          className="ml-auto text-xs underline text-muted-foreground hover:text-foreground"
        >
          {t('language.detectNow')}
        </button>
      </div>
    </div>
  );
};

export default MobileLanguageMenuItems;