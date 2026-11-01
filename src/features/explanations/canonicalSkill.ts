import type { DivisionSkill } from './quickExplanation';

export type CanonicalSkill = {
  skillId: string;
  country: string;
  level: string;
  subject: string;
  domain: string;
  objective: string;
  operationSubtype: DivisionSkill | 'multiplication';
  preferredStrategy: string;
  progression: string[];
  preferredVisual: 'equal_groups_or_array' | 'equal_groups_with_remainder' | 'fraction_bars' | 'place_value_chart' | 'array_or_area_model' | 'safe_fallback';
  constraints: { integerOperands?: boolean; zeroRemainder?: boolean; remainderLessThanDivisor?: boolean };
  fallback: boolean;
};

const levelLabel = (level?: string) => level?.trim() || 'CM2';
const countryLabel = (country?: string) => country?.trim() || 'France';

export function resolveCanonicalSkill(source: string, level?: string, country?: string): CanonicalSkill {
  const normalized = source.toLowerCase();
  const parsed = normalized.match(/^\s*-?\d+(?:[.,]\d+)?\s*[÷/]\s*-?\d+(?:[.,]\d+)?/);
  const hasDivision = Boolean(parsed);
  const hasDecimal = /\d[.,]\d/.test(source);
  const hasFraction = /\\frac|\b\d+\s*\/\s*\d+\s*(?:[÷×*]|$)/.test(source) && !parsed;
  const [a, b] = (parsed?.[0].match(/-?\d+/g) || []).map(Number);
  const exact = hasDivision && !hasDecimal && !hasFraction && Number.isInteger(a) && Number.isInteger(b) && b !== 0 && a % b === 0;
  const remainder = hasDivision && !hasDecimal && !hasFraction && !exact;
  const common = { country: countryLabel(country), level: levelLabel(level), subject: 'math', domain: 'Nombres et calculs' };
  if (exact) return {
    ...common, skillId: 'fr.cm2.math.division.exact_integer', objective: 'Comprendre et calculer une division exacte',
    operationSubtype: 'exact_integer_division', preferredStrategy: 'inverse multiplication',
    progression: ['interpréter la division en groupes égaux', 'chercher le fait multiplicatif utile', 'identifier le quotient', 'vérifier avec la multiplication'],
    preferredVisual: 'equal_groups_or_array', constraints: { integerOperands: true, zeroRemainder: true }, fallback: false,
  };
  if (remainder) return {
    ...common, skillId: 'fr.cm2.math.division.integer_with_remainder', objective: 'Comprendre et calculer une division avec reste',
    operationSubtype: 'integer_division_with_remainder', preferredStrategy: 'groupes égaux puis reste séparé',
    progression: ['interpréter la division en groupes égaux', 'chercher le plus grand multiple qui tient', 'compter les groupes', 'calculer puis vérifier le reste'],
    preferredVisual: 'equal_groups_with_remainder', constraints: { integerOperands: true, remainderLessThanDivisor: true }, fallback: false,
  };
  if (hasFraction) return { ...common, skillId: 'fr.cm2.math.fractions', objective: 'Comprendre les fractions', operationSubtype: 'fraction_division', preferredStrategy: 'fraction bar', progression: ['repérer le tout', 'partitionner en parts égales', 'lire les parts'], preferredVisual: 'fraction_bars', constraints: {}, fallback: false };
  if (hasDecimal) return { ...common, skillId: 'fr.cm2.math.decimal_place_value', objective: 'Comprendre la valeur de position des nombres décimaux', operationSubtype: 'decimal_division', preferredStrategy: 'place value', progression: ['repérer les rangs', 'décomposer le nombre', 'calculer en gardant les rangs'], preferredVisual: 'place_value_chart', constraints: {}, fallback: false };
  if (/[×*]/.test(source)) return { ...common, skillId: 'fr.cm2.math.multiplication', objective: 'Comprendre et calculer une multiplication', operationSubtype: 'multiplication', preferredStrategy: 'array and equal groups', progression: ['interpréter les groupes', 'construire le tableau', 'calculer le produit', 'vérifier'], preferredVisual: 'array_or_area_model', constraints: {}, fallback: false };
  return { ...common, skillId: 'fallback.unknown', objective: 'Compétence à confirmer dans la leçon', operationSubtype: 'unknown', preferredStrategy: 'canonical lesson', progression: [], preferredVisual: 'safe_fallback', constraints: {}, fallback: true };
}

export function canonicalLessonRoute(subjectSlug?: string, topicSlug?: string): string | null {
  return subjectSlug && topicSlug ? `/learning/${subjectSlug}/${topicSlug}` : null;
}
