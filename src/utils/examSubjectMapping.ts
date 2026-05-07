/** Normalisation alignée avec les clés utilisées pour compter les disciplines d’annales. */
export function normalizeDisciplineKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Valeurs réelles colonne `exam_papers.discipline` / bundles (prévoir variantes futures). */
const SUBJECT_SLUG_TO_EXAM_DISCIPLINES: Record<string, string[]> = {
  mathematiques: ['mathematiques'],
  mathematics: ['mathematiques'],
  maths: ['mathematiques'],
  math: ['mathematiques'],

  francais: ['francais'],
  french: ['francais'],

  sciences: ['sciences'],
  svt: ['sciences'],
  physique_chimie: ['physique_chimie', 'physique-chimie'],
  physics: ['physique_chimie'],
  physique: ['physique_chimie'],
  chimie: ['physique_chimie'],
  chemistry: ['physique_chimie'],

  histoire: ['histoire_geographie'],
  geographie: ['histoire_geographie'],
  geography: ['histoire_geographie'],
  history: ['histoire_geographie'],
  histoire_geographie: ['histoire_geographie'],

  histoire_geo: ['histoire_geographie'],

  emc: ['emc'],
};

/**
 * Associe un slug « matière » (learning / URL) aux disciplines présentes dans `exam_*`.
 */
export function resolveExamDisciplinesForSubjectSlug(subjectSlug: string): string[] {
  const key = normalizeDisciplineKey(subjectSlug);
  const mapped = SUBJECT_SLUG_TO_EXAM_DISCIPLINES[key];
  if (mapped?.length) return [...new Set(mapped)];
  return [subjectSlug.replace(/-/g, '_')];
}
