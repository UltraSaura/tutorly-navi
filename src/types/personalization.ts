import type { PedagogicalAgeBand } from '@/config/ageConfig';
import type { RecommendedAction, RecommendationHomeworkEvidence } from '@/types/recommendation';

export type PersonalizedLearningMode =
  | 'continue_learning'
  | 'guided_remediation'
  | 'independent_practice'
  | 'spaced_review'
  | 'tutor_support'
  | 'new_learning';

export type PersonalizationConfidence = 'low' | 'medium' | 'high';

export interface PersonalizationInput {
  actions: RecommendedAction[];
  homework: RecommendationHomeworkEvidence[];
  schoolLevel?: string | null;
}

export interface PersonalizedAction extends RecommendedAction {
  personalization: {
    learningMode: PersonalizedLearningMode;
    ageBand: PedagogicalAgeBand;
    scaffold: 'very_high' | 'high' | 'medium' | 'low';
    confidence: PersonalizationConfidence;
    evidenceCount: number;
    rationale: string;
  };
}
