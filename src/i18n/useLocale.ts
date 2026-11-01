import { useTranslation } from 'react-i18next';
import { enUS, fr } from 'date-fns/locale';

export function useLocale() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || 'en';
  return { language, locale: language === 'fr' ? 'fr-FR' : 'en-US', dateLocale: language === 'fr' ? fr : enUS };
}
