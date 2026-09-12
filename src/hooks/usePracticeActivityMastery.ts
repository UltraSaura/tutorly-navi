import { useCallback, useState } from 'react';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { ConceptMasteryState, MasteryUpdateResult } from '@/types/mastery-v2';
import { processLearningAttempt } from '@/services/learningEventNormalizer';

export function usePracticeActivityMastery() {
  const [masteryByConcept, setMasteryByConcept] = useState<Record<string, ConceptMasteryState>>({});
  const [lastUpdate, setLastUpdate] = useState<MasteryUpdateResult | null>(null);

  const recordAttempt = useCallback((attempt: LearningAttemptResult) => {
    if (attempt.source !== 'practice') return null;

    const previous = masteryByConcept[attempt.conceptId];
    const update = processLearningAttempt(attempt, previous);

    setMasteryByConcept((current) => ({
      ...current,
      [attempt.conceptId]: update.state,
    }));
    setLastUpdate(update);
    return update;
  }, [masteryByConcept]);

  const reset = useCallback(() => {
    setMasteryByConcept({});
    setLastUpdate(null);
  }, []);

  return {
    masteryByConcept,
    lastUpdate,
    recordAttempt,
    reset,
  };
}
