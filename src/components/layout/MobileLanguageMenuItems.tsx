import { useTranslation } from "react-i18next";

const MobileLanguageMenuItems = () => {
  const { i18n, t } = useTranslation();

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
          onClick={() => {
            i18n.changeLanguage(lang.code);
            localStorage.setItem('languageManuallySet', 'true');
          }}
          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
            i18n.resolvedLanguage === lang.code 
              ? 'bg-accent text-accent-foreground' 
              : 'hover:bg-accent/50'
          }`}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="flex-1">{lang.name}</span>
          {i18n.resolvedLanguage === lang.code && !manuallySet && (
            <span className="text-xs text-muted-foreground">{t('language.auto')}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default MobileLanguageMenuItems;