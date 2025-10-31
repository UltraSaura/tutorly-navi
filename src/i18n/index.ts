import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";

// Add error handling for the initialization
const initI18n = async () => {
  try {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: { 
          en: { 
            common: enCommon 
          }, 
          fr: { 
            common: frCommon 
          } 
        },
        fallbackLng: "en",
        supportedLngs: ["en", "fr"],
        ns: ["common"],
        defaultNS: "common",
        detection: { 
          order: ["localStorage", "navigator", "querystring", "cookie", "htmlTag"], 
          caches: ["localStorage"] 
        },
        interpolation: { escapeValue: false },
        returnEmptyString: false,
        debug: false // Set to false in production
      });
    
    console.log('i18n initialized successfully');
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
  }
};

// Initialize i18n
initI18n();

export default i18n;