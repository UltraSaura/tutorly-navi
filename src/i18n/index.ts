import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  supportedLngs: ['en', 'fr'],
  load: 'languageOnly',
  ns: ['common', 'interface'],
  defaultNS: 'common',
  keySeparator: false,
  initImmediate: false,
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'lang',
    caches: ['localStorage'],
  },
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
