import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';

/**
 * The presentation experience is deliberately separate from the existing
 * kid/student learning-mode distinction. `two-cards` is the established
 * lesson experience; `explain-v2` is the isolated newer experience.
 */
export type ExplanationExperience = 'two-cards' | 'explain-v2';
export type ExplanationModeRequest = 'auto' | ExplanationExperience;

export interface ExplanationModeInput {
  gradeLevel?: string | null;
  request?: ExplanationModeRequest;
  /** Existing lesson callers must opt into migration explicitly. */
  legacyLesson?: boolean;
  /** A documented exception for an older learner who needs conventional notation. */
  needsConventionalNotation?: boolean;
}

/**
 * Selects an explanation experience without changing the original lesson
 * routing. Existing lesson surfaces pass `legacyLesson: true`, so `auto`
 * remains TwoCards even for older students until product approval changes it.
 */
export function selectExplanationExperience({
  gradeLevel,
  request = 'auto',
  legacyLesson = false,
  needsConventionalNotation = false,
}: ExplanationModeInput): ExplanationExperience {
  const under11 = isUnder11YearsOld(gradeLevel ?? '');

  if (request === 'two-cards') return 'two-cards';

  if (request === 'explain-v2') {
    // Under-11 learners stay on the established guided experience by default.
    // A caller must explicitly request V2 and document the notation need.
    return under11 && !needsConventionalNotation ? 'two-cards' : 'explain-v2';
  }

  if (legacyLesson || under11) return 'two-cards';
  return 'explain-v2';
}
