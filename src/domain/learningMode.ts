import { isUnder11YearsOld } from '../utils/gradeLevelMapping';
import { normalizeSchoolLevel } from './schoolLevels';

export type LearningMode = 'kid' | 'student';

/**
 * Determines the learning mode based on the user's school level
 * @param level - The grade level string (e.g., 'cp', '6eme', 'grade 5')
 * @returns 'kid' for primary school levels, 'student' for secondary and above
 */
export function getLearningMode(level: string | null | undefined): LearningMode {
  if (!level) return 'student';
  const normalized = normalizeSchoolLevel(level);
  if (!normalized) return 'student';
  return isUnder11YearsOld(normalized) ? 'kid' : 'student';
}
