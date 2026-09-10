import React from 'react';
import type { LearningUnit } from '@/types/learning-unit';
import { ExplanationUnitRenderer } from './renderers/ExplanationUnitRenderer';
import { LessonUnitRenderer } from './renderers/LessonUnitRenderer';
import { ExerciseUnitRenderer } from './renderers/ExerciseUnitRenderer';
import { ManipulativeUnitRenderer } from './renderers/ManipulativeUnitRenderer';
import { SkillActivityUnitRenderer } from './renderers/SkillActivityUnitRenderer';
import { RemediationUnitRenderer } from './renderers/RemediationUnitRenderer';

export interface LearningUnitRendererProps {
  unit: LearningUnit;
  onComplete?: (result?: unknown) => void;
}

/**
 * Centralized, type-safe dispatcher for all LearningUnit types.
 * Enforces compile-time exhaustiveness via TypeScript.
 */
export function LearningUnitRenderer({
  unit,
  onComplete,
}: LearningUnitRendererProps) {
  switch (unit.type) {
    case 'explanation':
      return <ExplanationUnitRenderer unit={unit} onComplete={onComplete} />;

    case 'lesson':
      return <LessonUnitRenderer unit={unit} onComplete={onComplete} />;

    case 'exercise':
      return <ExerciseUnitRenderer unit={unit} onComplete={onComplete} />;

    case 'manipulative':
      return <ManipulativeUnitRenderer unit={unit} onComplete={onComplete} />;

    case 'skill_activity':
      return <SkillActivityUnitRenderer unit={unit} onComplete={onComplete} />;

    case 'remediation':
      return <RemediationUnitRenderer unit={unit} onComplete={onComplete} />;

    default: {
      // Compile-time exhaustiveness check
      const _exhaustiveCheck: never = unit;
      return (
        <div className="p-4 border border-destructive/30 rounded-xl bg-destructive/10 text-destructive text-sm">
          Type d’unité d’apprentissage non reconnu : {String((_exhaustiveCheck as { type?: unknown })?.type ?? 'inconnu')}
        </div>
      );
    }
  }
}
