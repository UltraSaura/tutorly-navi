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

export function getSubjectSlugAliases(subjectSlug: string): string[] {
  const normalized = normalizeDisciplineKey(subjectSlug);
  
  const mappings: Record<string, string[]> = {
    mathematiques: ["mathematiques", "mathematics", "maths", "math"],
    mathematics: ["mathematiques", "mathematics", "maths", "math"],
    francais: ["francais", "french"],
    french: ["francais", "french"],
    sciences: ["sciences", "svt"],
    svt: ["sciences", "svt"],
    physique_chimie: ["physique_chimie", "physics", "physique", "chimie", "chemistry"],
    physics: ["physique_chimie", "physics", "physique", "chimie", "chemistry"],
    histoire_geographie: ["histoire_geographie", "histoire", "geographie", "geography", "history", "histoire_geo"],
    history: ["histoire_geographie", "histoire", "geographie", "geography", "history", "histoire_geo"],
    emc: ["emc"],
  };

  const aliases = mappings[normalized];
  if (aliases) return [...new Set([...aliases, subjectSlug])];
  return [subjectSlug];
}

/** Inverse mapping from DB discipline to frontend subject slug. */
export function resolveSubjectSlugForExamDiscipline(discipline: string): string {
  const norm = normalizeDisciplineKey(discipline);
  if (norm === 'mathematiques') return 'mathematics';
  if (norm === 'francais') return 'french';
  if (norm === 'physique_chimie') return 'physics';
  if (norm === 'histoire_geographie') return 'history';
  if (norm === 'sciences') return 'sciences';
  return discipline;
}

/** Get human readable fallback name. */
export function getSubjectNameForSlug(slug: string, locale: string = 'en'): string {
  const isFr = locale.startsWith('fr');
  const map: Record<string, { en: string; fr: string }> = {
    mathematics: { en: 'Mathematics', fr: 'Mathématiques' },
    french: { en: 'French', fr: 'Français' },
    physics: { en: 'Physics & Chemistry', fr: 'Physique-Chimie' },
    history: { en: 'History & Geography', fr: 'Histoire-Géographie' },
    sciences: { en: 'Sciences', fr: 'Sciences' },
  };
  const translation = map[slug];
  if (translation) return isFr ? translation.fr : translation.en;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
