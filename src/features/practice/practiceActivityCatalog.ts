import type { SkillActivityDefinition } from '@/types/skill-activity';
import { CROSS_SUBJECT_ACTIVITIES } from './crossSubject/crossSubjectDefinitions';
import { MATH_SKILLS_LAB_ACTIVITIES } from './math/mathSkillDefinitions';

/** Trusted deterministic activity catalog shared by the Practice runtime. */
const PRACTICE_ACTIVITY_DEFINITIONS: readonly SkillActivityDefinition[] = [
  ...MATH_SKILLS_LAB_ACTIVITIES,
  ...CROSS_SUBJECT_ACTIVITIES,
];

export function getPracticeActivityCatalog(): SkillActivityDefinition[] {
  return [...PRACTICE_ACTIVITY_DEFINITIONS];
}
