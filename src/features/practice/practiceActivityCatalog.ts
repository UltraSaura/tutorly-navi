import type { SkillActivityDefinition } from '@/types/skill-activity';
import { MATH_SKILLS_LAB_ACTIVITIES } from './math/mathSkillDefinitions';

/**
 * Trusted cross-subject activity catalog.
 *
 * Phase 10 publishes the first deterministic subject content: Math Skills Lab.
 * Later phases add French, English, Science, History and Geography modules without
 * changing the shared Phase 9 runtime.
 */
const PRACTICE_ACTIVITY_DEFINITIONS: readonly SkillActivityDefinition[] = [
  ...MATH_SKILLS_LAB_ACTIVITIES,
];

export function getPracticeActivityCatalog(): SkillActivityDefinition[] {
  return [...PRACTICE_ACTIVITY_DEFINITIONS];
}
