import { useTranslation } from 'react-i18next';
import { resources } from './resources';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const subjectKeys = new Map<string, string>();
for (const messages of [resources.en.common, resources.fr.common]) {
  for (const [key, value] of Object.entries(messages)) {
    if (key.startsWith('subjects.')) {
      subjectKeys.set(normalize(value), key);
      subjectKeys.set(normalize(key.slice(9)), key);
    }
  }
}
for (const [alias, key] of Object.entries({ maths: 'math', mathematiques: 'math', mathematics: 'math', sciences: 'science', science: 'science', histoiregeographie: 'historyGeography', physicschemistry: 'physicsChemistry', physiquechimie: 'physicsChemistry' })) {
  subjectKeys.set(alias, `subjects.${key}`);
}

/** Localize known subject names without changing their stored IDs or route slugs. */
export function useSubjectLabel() {
  const { t } = useTranslation();
  return (name: string | null | undefined) => {
    if (!name) return '';
    const key = subjectKeys.get(normalize(name));
    return key ? String(t(key, { defaultValue: name })) : name;
  };
}
