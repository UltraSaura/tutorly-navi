import { useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import type { PracticeActivityRendererProps } from '../activityRegistry';
import { generateMathSkillQuestions, isMathSkillKind } from './mathSkillEngine';
import type { MathSkillActivityConfiguration } from './mathSkillDefinitions';

function parseConfiguration(value: Record<string, unknown>): MathSkillActivityConfiguration | null {
  if (!isMathSkillKind(value.skill)) return null;
  const itemCount = typeof value.itemCount === 'number' ? Math.max(1, Math.round(value.itemCount)) : 8;
  return {
    skill: value.skill,
    itemCount,
    timerSeconds: typeof value.timerSeconds === 'number' ? value.timerSeconds : undefined,
    tables: Array.isArray(value.tables) ? value.tables.filter((item): item is number => typeof item === 'number') : undefined,
    target: typeof value.target === 'number' ? value.target : undefined,
    min: typeof value.min === 'number' ? value.min : undefined,
    max: typeof value.max === 'number' ? value.max : undefined,
    denominatorMax: typeof value.denominatorMax === 'number' ? value.denominatorMax : undefined,
  };
}

export function MathSkillActivityRenderer({ activity, onAttempt, onComplete }: PracticeActivityRendererProps) {
  const ui = useInterfaceTranslation();
  const config = useMemo(() => parseConfiguration(activity.configuration), [activity.configuration]);
  const questions = useMemo(() => config ? generateMathSkillQuestions(config, activity.id) : [], [config, activity.id]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());

  if (!config || questions.length === 0) {
    return <p className="text-sm text-muted-foreground">{ui('This activity type is not available yet.')}</p>;
  }

  const question = questions[index];
  const progress = Math.round((index / questions.length) * 100);

  function submit() {
    const trimmedAnswer = answer.replace(',', '.').trim();
    if (!trimmedAnswer) {
      setFeedback(ui('Enter a number to continue.'));
      return;
    }
    const numericAnswer = Number(trimmedAnswer);
    if (!Number.isFinite(numericAnswer)) {
      setFeedback(ui('Enter a number to continue.'));
      return;
    }
    const correct = Math.abs(numericAnswer - question.answer) < 0.000001;
    onAttempt({
      masteryLevel: activity.masteryLevels.includes(3) ? 3 : activity.masteryLevels[0] ?? 2,
      correct,
      attemptNumber,
      hintsUsed: 0,
      responseTimeMs: Math.max(0, Date.now() - startedAt.current),
      itemId: question.factKey ?? question.id,
      tags: [config.skill, ...(question.familyKey ? [question.familyKey] : [])],
    });

    if (!correct) {
      setAttemptNumber((current) => current + 1);
      setFeedback(ui('Try again. Think about the relationship between the numbers.'));
      return;
    }

    setFeedback(ui('Correct!'));
    if (index === questions.length - 1) {
      setFinished(true);
      onComplete();
      return;
    }

    setIndex((current) => current + 1);
    setAnswer('');
    setAttemptNumber(1);
    startedAt.current = Date.now();
  }

  if (finished) {
    return (
      <div className="rounded-xl border bg-muted/20 p-5 text-center" role="status">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="font-semibold">{ui('Activity complete!')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{ui('Your answers will help Tutorly choose what to practice next.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{ui('Question')} {index + 1} {ui('of')} {questions.length}</span>
          {config.timerSeconds ? <span>{ui('Speed is optional — accuracy comes first.')}</span> : null}
        </div>
        <Progress value={progress} aria-label={ui('Activity progress')} />
      </div>

      <div className="rounded-2xl border bg-background p-6 text-center">
        <p className="text-2xl font-bold sm:text-3xl">{question.prompt}</p>
      </div>

      {question.choices?.length ? (
        <div className="grid grid-cols-2 gap-3">
          {question.choices.map((choice) => (
            <Button key={choice} type="button" variant={answer === String(choice) ? 'default' : 'outline'} className="h-14 text-lg" onClick={() => setAnswer(String(choice))}>
              {choice}
            </Button>
          ))}
        </div>
      ) : (
        <Input
          value={answer}
          onChange={(event) => setAnswer(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          inputMode="numeric"
          aria-label={ui('Your answer')}
          className="h-14 text-center text-xl"
          autoFocus
        />
      )}

      {feedback ? <p className="text-sm font-medium" role="status">{feedback}</p> : null}
      <Button type="button" className="w-full" onClick={submit}>{ui('Check answer')}</Button>
    </div>
  );
}

export default MathSkillActivityRenderer;
