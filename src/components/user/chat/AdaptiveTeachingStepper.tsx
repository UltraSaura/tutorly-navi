import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GroupedRetryPractice } from '@/types/chat';

type Props = {
  practice: GroupedRetryPractice;
  language: 'fr' | 'en';
  onRetryOriginal?: () => void;
};

const highlightEquation = (equation: string, highlights: string[] = []) => {
  const valid = [...new Set(highlights.filter(value => value && equation.includes(value)))]
    .sort((a, b) => b.length - a.length);
  if (!valid.length) return equation;
  const pattern = new RegExp(`(${valid.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return equation.split(pattern).map((part, index) =>
    valid.includes(part)
      ? <mark key={`${part}-${index}`} className="rounded bg-emerald-100 px-1 text-emerald-800">{part}</mark>
      : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
  );
};

export const AdaptiveTeachingStepper: React.FC<Props> = ({ practice, language, onRetryOriginal }) => {
  const steps = practice.animationSteps || [];
  const check = practice.understandingCheck;
  const total = steps.length + (check ? 1 : 0);
  const [index, setIndex] = React.useState(0);
  const [choice, setChoice] = React.useState<string | null>(null);
  const isCheck = Boolean(check && index === steps.length);
  const active = !isCheck ? steps[index] : null;
  const isFr = language === 'fr';

  React.useEffect(() => {
    setIndex(0);
    setChoice(null);
  }, [practice.similarProblem]);

  if (!steps.length) return null;

  const canAdvance = index < total - 1;
  const correct = choice === check?.correctChoice;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {practice.teachingStrategy || (isFr ? 'Méthode guidée' : 'Guided method')}
          </p>
          <h4 className="text-base font-bold">
            {isCheck ? (isFr ? 'À toi de réfléchir' : 'Your turn to think') : active?.title}
          </h4>
        </div>
        <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold">
          {index + 1}/{total}
        </span>
      </div>

      {!isCheck && active && (
        <div className="rounded-xl border border-blue-100 bg-white p-4 text-center">
          <div className="min-h-12 text-xl font-bold tracking-wide sm:text-2xl">
            {highlightEquation(active.equation, active.highlight)}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{active.explanation}</p>
        </div>
      )}

      {isCheck && check && (
        <div className="rounded-xl border border-blue-100 bg-white p-4">
          <p className="font-semibold leading-6">{check.question}</p>
          <div className="mt-3 grid gap-2">
            {check.choices.map(option => {
              const selected = choice === option;
              const showCorrect = choice && option === check.correctChoice;
              const showWrong = selected && !correct;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChoice(option)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    showCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900' :
                    showWrong ? 'border-amber-400 bg-amber-50 text-amber-950' :
                    selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {choice && (
            <div className={`mt-3 rounded-lg p-3 text-sm leading-5 ${correct ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>
              <strong>{correct ? (isFr ? 'Oui ! ' : 'Yes! ') : (isFr ? 'Regarde encore : ' : 'Look again: ')}</strong>
              {check.explanation}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2">
        <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => setIndex(value => Math.max(0, value - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {canAdvance ? (
          <Button type="button" onClick={() => setIndex(value => Math.min(total - 1, value + 1))}>
            {isFr ? 'Étape suivante' : 'Next step'} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" disabled={Boolean(check && !choice)} onClick={onRetryOriginal}>
            {isFr ? 'Réessayer mon exercice' : 'Retry my exercise'}
          </Button>
        )}
        <Button type="button" variant="outline" size="icon" onClick={() => { setIndex(0); setChoice(null); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

