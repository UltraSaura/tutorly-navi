import { useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { PracticeActivityRendererProps } from '../activityRegistry';
import type { LocalizedText, StructuredPracticeConfiguration, StructuredPracticeItem } from './crossSubjectDefinitions';

function localized(value: LocalizedText, language: string): string {
  return language.toLowerCase().startsWith('fr') ? value.fr : value.en;
}

function matches(value: LocalizedText, expected: string): boolean {
  return value.en === expected || value.fr === expected;
}

function parseConfiguration(value: Record<string, unknown>): StructuredPracticeConfiguration | null {
  if (!Array.isArray(value.items) || value.items.length === 0) return null;
  return value as unknown as StructuredPracticeConfiguration;
}

export function StructuredPracticeRenderer({ activity, onAttempt, onComplete }: PracticeActivityRendererProps) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const config = useMemo(() => parseConfiguration(activity.configuration), [activity.configuration]);
  const [index, setIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const startedAt = useRef(Date.now());

  if (!config) return <p className="text-sm text-muted-foreground">Activity configuration unavailable.</p>;
  const item = config.items[index];
  if (!item) return null;

  const progress = Math.round((index / config.items.length) * 100);
  const chosenOrder = item.type === 'order' ? selectedOrder.map((tokenIndex) => item.tokens[tokenIndex]) : [];

  function resetAnswer() {
    setSelectedChoice(null);
    setSelectedOrder([]);
    setFeedback(null);
  }

  function isCorrect(current: StructuredPracticeItem): boolean {
    if (current.type === 'order') {
      if (selectedOrder.length !== current.expectedOrder.length) return false;
      return selectedOrder.every((tokenIndex, position) => matches(current.tokens[tokenIndex], current.expectedOrder[position]));
    }
    if (selectedChoice === null) return false;
    return matches(current.choices[selectedChoice], current.expected);
  }

  function submit() {
    const hasAnswer = item.type === 'order' ? selectedOrder.length > 0 : selectedChoice !== null;
    if (!hasAnswer) return;
    const correct = isCorrect(item);
    onAttempt({
      masteryLevel: activity.masteryLevels.includes(3) ? 3 : activity.masteryLevels[0] ?? 2,
      correct,
      attemptNumber,
      hintsUsed: 0,
      responseTimeMs: Math.max(0, Date.now() - startedAt.current),
      itemId: `${activity.id}:${item.id}`,
      tags: [activity.engine, item.type, activity.subjectId],
    });
    setFeedback(correct ? 'correct' : 'incorrect');
    if (!correct) {
      setAttemptNumber((current) => current + 1);
      return;
    }
    if (index === config.items.length - 1) {
      onComplete();
      return;
    }
    setIndex((current) => current + 1);
    setAttemptNumber(1);
    resetAnswer();
    startedAt.current = Date.now();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{index + 1} / {config.items.length}</span>
          <span>{activity.engine.replaceAll('_', ' ')}</span>
        </div>
        <Progress value={progress} aria-label="Activity progress" />
      </div>

      <div className="rounded-xl border bg-muted/10 p-4 text-base font-semibold sm:text-lg">
        {localized(item.prompt, language)}
      </div>

      {item.type === 'order' ? (
        <div className="space-y-4">
          <div className="min-h-14 rounded-xl border border-dashed p-3" aria-label="Current sequence">
            {chosenOrder.length === 0 ? <span className="text-sm text-muted-foreground">…</span> : (
              <div className="flex flex-wrap gap-2">{chosenOrder.map((token, position) => <span key={`${localized(token, language)}-${position}`} className="rounded-lg bg-primary/10 px-3 py-2 font-medium">{localized(token, language)}</span>)}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tokens.map((token, tokenIndex) => (
              <Button key={`${localized(token, language)}-${tokenIndex}`} type="button" variant="outline" disabled={selectedOrder.includes(tokenIndex)} onClick={() => setSelectedOrder((current) => [...current, tokenIndex])}>
                {localized(token, language)}
              </Button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setSelectedOrder([])} aria-label="Reset order"><RotateCcw className="mr-1 h-4 w-4" />Reset</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {item.choices.map((choiceValue, choiceIndex) => (
            <Button key={`${localized(choiceValue, language)}-${choiceIndex}`} type="button" variant={selectedChoice === choiceIndex ? 'default' : 'outline'} className="min-h-12 whitespace-normal" onClick={() => setSelectedChoice(choiceIndex)}>
              {localized(choiceValue, language)}
            </Button>
          ))}
        </div>
      )}

      {feedback ? (
        <p role="status" className="text-sm font-medium">{feedback === 'correct' ? (language.startsWith('fr') ? 'Correct !' : 'Correct!') : (language.startsWith('fr') ? 'Essaie encore.' : 'Try again.')}</p>
      ) : null}
      <Button type="button" className="w-full" onClick={submit}> {language.startsWith('fr') ? 'Vérifier' : 'Check'} </Button>
    </div>
  );
}

export default StructuredPracticeRenderer;
