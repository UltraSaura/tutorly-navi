import { useCallback, useRef, useState } from 'react';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { ConceptMasteryState, MasteryUpdateResult } from '@/types/mastery-v2';
import { processLearningAttempt } from '@/services/learningEventNormalizer';

export function usePracticeActivityMastery() {
  const masteryRef = useRef<Record<string, ConceptMasteryState>>({});
  const [masteryByConcept, setMasteryByConcept] = useState<Record<string, ConceptMasteryState>>({});
  const [lastUpdate, setLastUpdate] = useState<MasteryUpdateResult | null>(null);

  const recordAttempt = useCallback((attempt: LearningAttemptResult) => {
    if (attempt.source !== 'practice') return null;

    const previous = masteryRef.current[attempt.conceptId];
    const update = processLearningAttempt(attempt, previous);
    masteryRef.current = {
      ...masteryRef.current,
      [attempt.conceptId]: update.state,
    };

    setMasteryByConcept(masteryRef.current);
    setLastUpdate(update);
    return update;
  }, []);

  const reset = useCallback(() => {
    masteryRef.current = {};
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
