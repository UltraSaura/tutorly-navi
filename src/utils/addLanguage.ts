/**
 * Utility to help add new languages to the application
 * This is a development helper - not used in production
 */

import { LANGUAGE_TEMPLATE } from '@/locales';

export interface NewLanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  countryCodes?: string[];
}

/**
 * Generate language template files for a new language
 * This function provides the structure - actual translation files need to be created manually
 */
export function generateLanguageTemplate(config: NewLanguageConfig) {
  const { code, name, nativeName, flag } = config;
  
  console.log(`\n=== Adding Language: ${name} (${code}) ===\n`);
  
  console.log('1. Create translation files:');
  console.log(`   src/locales/${code}/common.json`);
  console.log(`   src/locales/${code}/exercises.json`);
  console.log(`   src/locales/${code}/math.json`);
  
  console.log('\n2. Update language registry in src/locales/index.ts:');
  console.log(`   Add '${code}' to SUPPORTED_LANGUAGES array`);
  
  console.log('\n3. Update language metadata in src/utils/languageUtils.ts:');
  console.log(`   Add entry to LANGUAGE_META:`);
  console.log(`   ${code}: {`);
  console.log(`     code: '${code}',`);
  console.log(`     name: '${name}',`);
  console.log(`     nativeName: '${nativeName}',`);
  console.log(`     flag: '${flag}',`);
  console.log(`     dir: 'ltr'`);
  console.log(`   }`);
  
  if (config.countryCodes?.length) {
    console.log('\n4. Update country mapping in src/utils/countryLanguageMapping.ts:');
    config.countryCodes.forEach(countryCode => {
      console.log(`   '${countryCode}': '${code}',`);
    });
  }
  
  console.log('\n5. Translation file templates:');
  
  console.log('\n--- common.json template ---');
  console.log(JSON.stringify({
    app: { title: "Tutorly Navi", loading: "[TRANSLATE: Loading…]", retry: "[TRANSLATE: Retry]", cancel: "[TRANSLATE: Cancel]" },
    nav: { tutor: "[TRANSLATE: Tutor]", homework: "[TRANSLATE: Homework]", progress: "[TRANSLATE: Progress]", rewards: "[TRANSLATE: Rewards]" },
    language: { english: "English", french: "Français", [code]: nativeName },
    common: { loading: "[TRANSLATE: Loading...]", error: "[TRANSLATE: Error]", success: "[TRANSLATE: Success]" },
    chat: { placeholder: "[TRANSLATE: Type your question or homework here…]", send: "[TRANSLATE: Send]" },
    auth: { signIn: "[TRANSLATE: Sign In]", email: "Email", password: "[TRANSLATE: Password]" }
  }, null, 2));
  
  console.log('\n--- math.json template ---');
  console.log(JSON.stringify({
    actionVerbs: ["[TRANSLATE: calculate]", "[TRANSLATE: solve]", "[TRANSLATE: simplify]"],
    operations: { plus: "+", minus: "-", times: "*", equals: "=" },
    concepts: { equation: "[TRANSLATE: equation]", function: "[TRANSLATE: function]" }
  }, null, 2));
  
  console.log('\n=== Next Steps ===');
  console.log('1. Create the translation files with actual translations');
  console.log('2. Test the new language by changing the language setting');
  console.log('3. Verify all UI elements display correctly');
  console.log('4. Test math detection with the new language action verbs');
  
  return {
    code,
    name,
    nativeName,
    flag,
    filesNeeded: LANGUAGE_TEMPLATE.requiredFiles,
    keysNeeded: LANGUAGE_TEMPLATE.requiredKeys
  };
}

/**
 * Validate that a language has all required translation keys
 */
export async function validateLanguageCompleteness(languageCode: string): Promise<{
  isComplete: boolean;
  missingKeys: string[];
  missingFiles: string[];
}> {
  const missingFiles: string[] = [];
  const missingKeys: string[] = [];
  
  // Check if files exist
  const requiredFiles = ['common.json', 'exercises.json', 'math.json'];
  
  for (const file of requiredFiles) {
    try {
      await import(`@/locales/${languageCode}/${file.replace('.json', '')}.json`);
    } catch (error) {
      missingFiles.push(file);
    }
  }
  
  // If files are missing, can't check keys
  if (missingFiles.length > 0) {
    return {
      isComplete: false,
      missingKeys: [],
      missingFiles
    };
  }
  
  // Check for required keys
  try {
    const [common, exercises, math] = await Promise.all([
      import(`@/locales/${languageCode}/common.json`),
      import(`@/locales/${languageCode}/exercises.json`),
      import(`@/locales/${languageCode}/math.json`)
    ]);
    
    const translations = { common: common.default, exercises: exercises.default, math: math.default };
    
    // Define required key paths
    const requiredKeyPaths = [
      'common.app.title',
      'common.nav.tutor', 
      'common.language.english',
      'exercises.exercise.tryAgain',
      'math.actionVerbs'
    ];
    
    for (const keyPath of requiredKeyPaths) {
      const [file, ...keys] = keyPath.split('.');
      let current = translations[file as keyof typeof translations];
      
      for (const key of keys) {
        current = current?.[key];
        if (current === undefined) {
          missingKeys.push(keyPath);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error validating translations:', error);
    return {
      isComplete: false,
      missingKeys: ['validation_failed'],
      missingFiles: []
    };
  }
  
  return {
    isComplete: missingKeys.length === 0 && missingFiles.length === 0,
    missingKeys,
    missingFiles
  };
}

// Example usage in development console:
// import { generateLanguageTemplate } from '@/utils/addLanguage';
// generateLanguageTemplate({ code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', countryCodes: ['ES', 'MX', 'AR'] });