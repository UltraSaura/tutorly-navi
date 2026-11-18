import { normalizeSchoolLevel } from '@/domain/schoolLevels';

/** Enacted BO 5 March 2026; v1 is a deliberately narrow subset of the 5e objective. */
export const COORDINATE_CURRICULUM = {
  country: 'fr', levels: ['5eme'] as const,
  category: 'Maths → Espace et géométrie → Repérage dans le plan',
  label: 'France · 5ème',
  source: 'https://www.education.gouv.fr/bo/2026/Hebdo10/MENE2602912A',
};

export function isCoordinateCurriculumAllowed(country: unknown, level: unknown): boolean {
  return typeof country === 'string' && country.trim().toLowerCase() === 'fr'
    && typeof level === 'string' && normalizeSchoolLevel(level) === '5eme';
}

export type CoordinateAuthoringContext = {
  schoolLevels?: string[];
  subject?: string | null;
  topics: Array<{ countryCode?: string | null; levelCode?: string | null; subject?: string | null; category?: string | null }>;
};

const normal = (value?: string | null) => (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const maths = (value?: string | null) => /^math/.test(normal(value));

/** Missing or contradictory metadata is not a permission to expose a new type everywhere. */
export function canAuthorCoordinates(context?: CoordinateAuthoringContext): boolean {
  if (!context?.topics.length || (context.subject && !maths(context.subject))) return false;
  if (!context.topics.every(topic => isCoordinateCurriculumAllowed(topic.countryCode, topic.levelCode)
    && maths(topic.subject) && /geometr|espace|reperage|repere/.test(normal(topic.category)))) return false;
  return !context.schoolLevels?.length || context.schoolLevels.every(level => isCoordinateCurriculumAllowed('fr', level));
}
