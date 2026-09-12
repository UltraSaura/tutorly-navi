import type { SkillActivityDefinition } from '@/types/skill-activity';

/**
 * Trusted cross-subject activity catalog.
 *
 * Phase 9 intentionally ships the runtime without fabricated practice content.
 * Phase 10+ adds subject activity definition modules here as they are implemented.
 */
const PRACTICE_ACTIVITY_DEFINITIONS: readonly SkillActivityDefinition[] = [];

export function getPracticeActivityCatalog(): SkillActivityDefinition[] {
  return [...PRACTICE_ACTIVITY_DEFINITIONS];
}
