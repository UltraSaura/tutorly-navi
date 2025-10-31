// Language registry for easy expansion
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Translation loaders - dynamically import translation files
const loadTranslations = async (language: SupportedLanguage) => {
  try {
    const translations: any = {};
    
    // Load common.json
    try {
      const common = await import(`./${language}/common.json`);
      translations.common = common.default;
    } catch (error) {
      console.warn(`Failed to load common.json for ${language}:`, error);
    }
    
    // Load exercises.json
    try {
      const exercises = await import(`./${language}/exercises.json`);
      translations.exercises = exercises.default;
    } catch (error) {
      console.warn(`Failed to load exercises.json for ${language}:`, error);
    }
    
    // Load math.json (optional)
    try {
      const math = await import(`./${language}/math.json`);
      translations.math = math.default;
    } catch (error) {
      console.warn(`math.json not found for ${language}, skipping...`);
    }

    console.log(`[Translation] Loaded translations for ${language}:`, Object.keys(translations));
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${language}:`, error);
    // Fallback to English if loading fails
    if (language !== 'en') {
      return loadTranslations('en');
    }
    throw error;
  }
};

export { loadTranslations };

// Template for adding new languages
export const LANGUAGE_TEMPLATE = {
  code: '',
  name: '',
  nativeName: '',
  flag: '',
  requiredFiles: [
    'common.json',
    'exercises.json', 
    'math.json'
  ],
  requiredKeys: {
    common: ['app', 'nav', 'language', 'common', 'chat', 'auth'],
    exercises: ['exercise', 'exercises', 'explanation', 'badges'],
    math: ['actionVerbs', 'operations', 'concepts']
  }
} as const;