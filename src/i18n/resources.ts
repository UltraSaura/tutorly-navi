import enInterface from '../locales/en/interface.json';
import frInterface from '../locales/fr/interface.json';
import enLegacy from './locales/en.json';
import frLegacy from './locales/fr.json';
import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';
import enShared from '../locales/en/common.json';
import frShared from '../locales/fr/common.json';
import enExercises from '../locales/en/exercises.json';
import frExercises from '../locales/fr/exercises.json';

// Both historical APIs now resolve the same keys, interpolation and plural rules.
export function flattenMessages(input: object, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value.replace(/(?<!\{)\{(\w+)\}(?!\})/g, '{{$1}}');
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, path));
    }
  }
  return result;
}

function messages(legacy: object, common: object, shared: object, exercises: object) {
  return {
    ...flattenMessages(legacy),
    ...flattenMessages(common),
    ...flattenMessages(shared),
    ...flattenMessages(exercises),
    ...flattenMessages(shared, 'common'),
    ...flattenMessages(exercises, 'exercises'),
  };
}

export const resources = {
  en: { common: messages(enLegacy, enCommon, enShared, enExercises), interface: enInterface },
  fr: { common: messages(frLegacy, frCommon, frShared, frExercises), interface: frInterface },
};
