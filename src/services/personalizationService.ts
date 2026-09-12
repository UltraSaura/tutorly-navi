import { getAgeLearningConfig } from '@/config/ageConfig';
import type { RecommendedAction } from '@/types/recommendation';
import type {
  PersonalizationConfidence,
  PersonalizationInput,
  PersonalizedAction,
  PersonalizedLearningMode,
} from '@/types/personalization';

function failuresFor(action: RecommendedAction, input: PersonalizationInput): number {
  if (!action.conceptId) return 0;
  return input.homework
    .filter((item) => item.topicId === action.conceptId && item.isCorrect === false)
    .reduce((sum, item) => sum + Math.max(1, item.attemptsCount || 1), 0);
}

function modeFor(action: RecommendedAction, failures: number): PersonalizedLearningMode {
  if (action.reason === 'continue') return 'continue_learning';
  if (action.reason === 'spaced_review') return 'spaced_review';
  if (action.reason === 'homework_followup') return 'tutor_support';
  if (action.reason === 'weak_skill' || action.reason === 'prerequisite' || failures >= 2) return 'guided_remediation';
  if (action.source === 'practice') return 'independent_practice';
  return 'new_learning';
}

function confidenceFor(action: RecommendedAction, failures: number): PersonalizationConfidence {
  if (action.reason === 'curriculum' || action.reason === 'enrichment') return 'low';
  if (failures >= 2 || action.reason === 'spaced_review' || action.reason === 'continue') return 'high';
  return 'medium';
}

function rationaleFor(mode: PersonalizedLearningMode): string {
  switch (mode) {
    case 'continue_learning': return 'An unfinished learning session is the strongest immediate continuity signal.';
    case 'guided_remediation': return 'Repeated difficulty indicates the learner should receive scaffolding before independent work.';
    case 'spaced_review': return 'A previously mastered concept is due for retrieval practice.';
    case 'tutor_support': return 'A recent homework difficulty is best handled with guided Tutor support.';
    case 'independent_practice': return 'Current evidence supports independent practice.';
    case 'new_learning': return 'No stronger difficulty or retention signal is available, so curriculum progression is appropriate.';
  }
}

/**
 * Deterministic personalization layer over trusted recommendation evidence.
 * It chooses the learning mode and scaffold level; it never changes mastery,
 * schedules reviews, awards XP, or calls an LLM.
 */
export function personalizeNextBestActions(input: PersonalizationInput): PersonalizedAction[] {
  const ageConfig = getAgeLearningConfig(input.schoolLevel);

  return input.actions.map((action) => {
    const failures = failuresFor(action, input);
    const learningMode = modeFor(action, failures);
    const metadataFailures = typeof action.metadata?.failedAttempts === 'number' ? action.metadata.failedAttempts : 0;
    const evidenceCount = Math.max(failures, metadataFailures, action.reason === 'curriculum' ? 0 : 1);

    return {
      ...action,
      personalization: {
        learningMode,
        ageBand: ageConfig.band,
        scaffold: learningMode === 'guided_remediation'
          ? (ageConfig.scaffoldLevel === 'low' ? 'medium' : ageConfig.scaffoldLevel)
          : ageConfig.scaffoldLevel,
        confidence: confidenceFor(action, failures),
        evidenceCount,
        rationale: rationaleFor(learningMode),
      },
      metadata: {
        ...action.metadata,
        personalizedLearningMode: learningMode,
        personalizationConfidence: confidenceFor(action, failures),
        pedagogicalAgeBand: ageConfig.band,
      },
    };
  });
}
