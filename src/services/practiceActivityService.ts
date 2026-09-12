import type { PedagogicalAgeBand } from '@/config/ageConfig';
import type { MasteryLevel } from '@/types/mastery-level';
import type { SkillActivityDefinition } from '@/types/skill-activity';

export interface PracticeActivitySelectionInput {
  activities: SkillActivityDefinition[];
  subjectId: string;
  ageBand: PedagogicalAgeBand;
  masteryLevel?: MasteryLevel;
  conceptId?: string;
  maxActivities?: number;
}

export interface PracticeActivitySessionPlan {
  subjectId: string;
  ageBand: PedagogicalAgeBand;
  masteryLevel?: MasteryLevel;
  activities: SkillActivityDefinition[];
  estimatedMinutes: number;
}

/**
 * Deterministic Phase 9 session planner.
 *
 * The planner deliberately does not invent activities or use AI. It can only select
 * definitions supplied by a trusted curriculum/content source. Subject-specific
 * activity definitions arrive in Phase 10+.
 */
export function createPracticeActivitySession(
  input: PracticeActivitySelectionInput,
): PracticeActivitySessionPlan {
  const maxActivities = Math.max(1, input.maxActivities ?? 6);

  const eligible = input.activities
    .filter((activity) => activity.subjectId === input.subjectId)
    .filter((activity) => activity.ageBand === input.ageBand)
    .filter((activity) => !input.conceptId || activity.conceptId === input.conceptId)
    .filter(
      (activity) =>
        !input.masteryLevel || activity.masteryLevels.includes(input.masteryLevel),
    )
    .slice()
    .sort((a, b) => {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.id.localeCompare(b.id);
    })
    .slice(0, maxActivities);

  return {
    subjectId: input.subjectId,
    ageBand: input.ageBand,
    masteryLevel: input.masteryLevel,
    activities: eligible,
    estimatedMinutes: eligible.reduce(
      (total, activity) => total + Math.max(1, activity.estimatedMinutes ?? 3),
      0,
    ),
  };
}

export function hasPracticeActivitiesForSubject(
  activities: SkillActivityDefinition[],
  subjectId: string,
  ageBand?: PedagogicalAgeBand,
): boolean {
  return activities.some(
    (activity) =>
      activity.subjectId === subjectId && (!ageBand || activity.ageBand === ageBand),
  );
}
