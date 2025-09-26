# Language System Setup Guide

## Overview
The application now uses a unified, scalable language system that supports easy addition of new languages and automatic loading of translations.

## Architecture

### File Structure
```
src/locales/
├── index.ts           # Language registry and loaders
├── en/               # English translations
│   ├── common.json   # Common UI elements
│   ├── exercises.json # Exercise-related translations
│   └── math.json     # Math action verbs and concepts
├── fr/               # French translations
│   ├── common.json
│   ├── exercises.json
│   └── math.json
└── es/               # Future language (example)
    ├── common.json
    ├── exercises.json
    └── math.json
```

### Key Components

1. **SimpleLanguageContext**: Main language provider with dynamic translation loading
2. **Translation Loaders**: Automatically load and cache translations
3. **Math Action Verbs**: Dynamically loaded from translation files
4. **Language Utils**: Helper functions for language management

## Adding a New Language

### Step 1: Create Translation Files
1. Create a new folder: `src/locales/{language_code}/`
2. Copy the English template files:
   - `common.json` - Basic UI translations
   - `exercises.json` - Exercise-related translations  
   - `math.json` - Math action verbs and concepts

### Step 2: Translate Content
Fill in the translations in each JSON file. Use the English version as reference for structure.

### Step 3: Register Language
Add the new language code to `src/locales/index.ts`:
```typescript
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es'] as const; // Add 'es'
```

### Step 4: Add Language Metadata
Update `src/utils/languageUtils.ts` to include the new language:
```typescript
export const LANGUAGE_META = {
  // existing languages...
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español', 
    flag: '🇪🇸',
    dir: 'ltr'
  }
}
```

### Step 5: Update Country Mapping (if needed)
Add country-to-language mappings in `src/utils/countryLanguageMapping.ts`:
```typescript
'ES': 'es', // Spain
'MX': 'es', // Mexico
// etc.
```

## Translation File Structure

### common.json
Contains basic UI elements:
```json
{
  "app": { "title": "...", "loading": "..." },
  "nav": { "tutor": "...", "homework": "..." },
  "language": { "english": "...", "french": "..." },
  "common": { "loading": "...", "error": "..." },
  "chat": { "placeholder": "...", "send": "..." },
  "auth": { "signIn": "...", "email": "..." }
}
```

### exercises.json
Exercise and learning related translations:
```json
{
  "exercise": { "tryAgain": "...", "correct": "..." },
  "exercises": { "list_title": "...", "summary": "..." },
  "explanation": { "modal_title": "...", "fallback": {...} },
  "badges": { "streak": "...", "xp_gain": "..." }
}
```

### math.json
Math-specific translations:
```json
{
  "actionVerbs": ["calculate", "solve", "..."],
  "operations": { "plus": "+", "minus": "-" },
  "concepts": { "equation": "equation", "..." }
}
```

## Features

### Automatic Translation Loading
- Translations are loaded asynchronously when the language changes
- Caching prevents redundant loading
- Fallback to English if a language fails to load

### Legacy Key Support
- Maintains backward compatibility with dot-notation keys
- Automatically flattens nested translations for legacy components

### Math Action Verbs Integration
- Math detection system automatically loads language-specific action verbs
- AI system uses appropriate language for math detection

### Country-Based Language Detection
- Automatically sets language based on user's country
- Respects manual language changes by users

## Usage Examples

### Basic Translation
```typescript
const { t } = useLanguage();
return <div>{t('common.loading')}</div>;
```

### With Parameters
```typescript
const { t } = useLanguage();
return <div>{t('badges.xp_gain', { xp: 50 })}</div>;
```

### Nested Object Access  
```typescript
const { t } = useLanguage();
return <div>{t('explanation.headers.exercise')}</div>;
```

## Best Practices

1. **Consistent Structure**: Keep the same JSON structure across all languages
2. **Parameter Interpolation**: Use `{param}` syntax for dynamic values
3. **Fallback Values**: Always provide fallback text for missing translations
4. **Testing**: Test all languages before deployment
5. **Context**: Provide context comments in translation files when needed

## Migration Notes

- Old `i18next` system components should be gradually migrated
- Legacy dot-notation keys are still supported during transition
- Multiple language contexts will be removed once migration is complete
