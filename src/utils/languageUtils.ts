import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/locales';

/**
 * Utility functions for language management
 */

/**
 * Check if a language code is supported
 */
export const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

/**
 * Get the default language for the user
 */
export const getDefaultLanguage = (): SupportedLanguage => {
  const stored = localStorage.getItem('lang');
  if (stored && isLanguageSupported(stored)) {
    return stored;
  }
  return 'en';
};

/**
 * Validate that all required translation keys exist for a language
 */
export const validateTranslations = (translations: any, requiredKeys: string[]): boolean => {
  return requiredKeys.every(key => {
    const keys = key.split('.');
    let current = translations;
    for (const k of keys) {
      current = current?.[k];
      if (current === undefined) return false;
    }
    return true;
  });
};

/**
 * Language metadata for UI display
 */
export const LANGUAGE_META = {
  en: {
    code: 'en',
    name: 'English', 
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français', 
    flag: '🇫🇷',
    dir: 'ltr'
  }
} as const;

/**
 * Get language metadata
 */
export const getLanguageMeta = (lang: SupportedLanguage) => {
  return LANGUAGE_META[lang];
};

// Get math action verbs for a language from cache or load them
export const getMathActionVerbs = async (language: SupportedLanguage): Promise<string[]> => {
  try {
    const mathTranslations = await import(`@/locales/${language}/math.json`);
    return mathTranslations.default.actionVerbs || [];
  } catch (error) {
    console.error(`Failed to load math verbs for ${language}:`, error);
    // Return fallback verbs based on language
    if (language === 'fr') {
      return ['calculer', 'résoudre', 'simplifier', 'évaluer', 'déterminer'];
    }
    return ['calculate', 'solve', 'simplify', 'evaluate', 'determine'];
  }
};