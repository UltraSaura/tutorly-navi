// Language registry for easy expansion
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Translation loaders - dynamically import translation files
const loadTranslations = async (language: SupportedLanguage) => {
  try {
    const [common, exercises, math] = await Promise.all([
      import(`./${language}/common.json`),
      import(`./${language}/exercises.json`), 
      import(`./${language}/math.json`)
    ]);

    return {
      common: common.default,
      exercises: exercises.default,
      math: math.default
    };
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