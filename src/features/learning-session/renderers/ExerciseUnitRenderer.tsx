import React, { useState } from 'react';
import type { ExerciseLearningUnit } from '@/types/learning-unit';
import type { Question } from '@/types/quiz-bank';
import { QuestionCard } from '@/components/learning/QuestionCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ExerciseUnitRendererProps {
  unit: ExerciseLearningUnit;
  onComplete?: (result?: unknown) => void;
}

/**
 * Adapts an ExerciseLearningUnit into a quiz-bank Question structure
 * compatible with the existing QuestionCard renderer.
 */
function adaptToQuestionCardFormat(unit: ExerciseLearningUnit): Question {
  const { questionId, prompt, questionKind, choices, solution } = unit.payload;

  if (questionKind === 'single') {
    return {
      id: questionId,
      kind: 'single',
      prompt,
      choices: Array.isArray(choices)
        ? choices.map((c, i) => {
            if (typeof c === 'string') {
              return { id: String(i), label: c };
            }
            const record = c as Record<string, unknown>;
            return {
              id: String(record.id ?? i),
              label: String(record.label ?? record.text ?? record.value ?? ''),
            };
          })
        : [],
      answer: solution ?? '',
    };
  }

  if (questionKind === 'multi') {
    return {
      id: questionId,
      kind: 'multi',
      prompt,
      choices: Array.isArray(choices)
        ? choices.map((c, i) => {
            if (typeof c === 'string') {
              return { id: String(i), label: c };
            }
            const record = c as Record<string, unknown>;
            return {
              id: String(record.id ?? i),
              label: String(record.label ?? record.text ?? record.value ?? ''),
            };
          })
        : [],
      answer: Array.isArray(solution) ? solution : [],
    };
  }

  if (questionKind === 'numeric') {
    return {
      id: questionId,
      kind: 'numeric',
      prompt,
      answer: Number(solution) || 0,
    };
  }

  // Fallback for custom or rawPayload questions
  if (unit.payload.rawPayload && typeof unit.payload.rawPayload === 'object' && 'kind' in unit.payload.rawPayload) {
    return unit.payload.rawPayload as unknown as Question;
  }

  return {
    id: questionId,
    kind: 'single',
    prompt,
    choices: Array.isArray(choices)
      ? choices.map((c, i) => {
          if (typeof c === 'string') {
            return { id: String(i), label: c };
          }
          const record = c as Record<string, unknown>;
          return {
            id: String(record.id ?? i),
            label: String(record.label ?? record.text ?? record.value ?? ''),
          };
        })
      : [],
    answer: solution ?? '',
  };
}

export function ExerciseUnitRenderer({
  unit,
  onComplete,
}: ExerciseUnitRendererProps) {
  const [submittedAnswer, setSubmittedAnswer] = useState<unknown>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);

  const adaptedQuestion = adaptToQuestionCardFormat(unit);

  const handleFinish = (correct: boolean, tries: number) => {
    setIsFinished(true);
    setIsCorrect(correct);
    if (onComplete) {
      onComplete({
        correct,
        tries,
        answer: submittedAnswer,
        questionId: unit.payload.questionId,
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card className="border shadow-sm border-border bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <QuestionCard
            question={adaptedQuestion}
            onChange={(val) => setSubmittedAnswer(val)}
            onFinish={handleFinish}
            submittedAnswer={submittedAnswer}
            isCorrect={isCorrect}
            allowRetry={true}
            hideCorrect={true}
          />
        </CardContent>
      </Card>

      {/* Manual advance if finished without auto-advance */}
      {isFinished && onComplete && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onComplete({ correct: isCorrect ?? false })}
            className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white font-medium gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Passer à l’étape suivante</span>
          </Button>
        </div>
      )}
    </div>
  );
}
