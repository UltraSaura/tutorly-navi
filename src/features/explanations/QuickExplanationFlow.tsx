import React from 'react';
import type { QuickExplanation } from './quickExplanation';

export type QuickFlowState = { index: number; choice: string | null; validated: boolean; wrongAttempts: number; showReasoning: boolean };
export type QuickFlowAction = { type: 'next' | 'back' } | { type: 'select'; choice: string } | { type: 'validate' };

export function quickFlowTransition(state: QuickFlowState, action: QuickFlowAction, lesson: QuickExplanation): QuickFlowState {
  const checkIndex = lesson.frames.length + 1;
  if (action.type === 'back') return { ...state, index: Math.max(0, state.index - 1), choice: null, validated: false };
  if (action.type === 'next') return { ...state, index: Math.min(checkIndex, state.index + 1), choice: null, validated: false };
  if (action.type === 'select') return state.index === checkIndex ? { ...state, choice: lesson.check.choices.includes(action.choice) ? action.choice : null, validated: false, showReasoning: false } : state;
  if (state.index !== checkIndex || !state.choice) return state;
  const correct = state.choice === lesson.check.correctChoice;
  return correct ? { ...state, validated: true } : { ...state, validated: false, wrongAttempts: state.wrongAttempts + 1, showReasoning: state.wrongAttempts + 1 >= 3 };
}

const control = 'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40';

function DivisionVisual({ lesson }: { lesson: QuickExplanation }) {
  const { workedExample: example, canonicalSkill } = lesson;
  const groups = Math.min(Math.max(Math.floor(example.dividend / example.divisor), 1), 12);
  const leftover = example.dividend % example.divisor;
  return <div className="rounded-xl border border-blue-200 bg-white/80 p-3" aria-label={`${canonicalSkill.preferredVisual}: ${groups} groups`}>
    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700"><span><span className="mr-1 inline-block h-3 w-3 rounded bg-blue-500" aria-hidden="true" />{example.dividend} total</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-purple-500" aria-hidden="true" />groups of {example.divisor}</span>{leftover > 0 && <span><span className="mr-1 inline-block h-3 w-3 rounded bg-orange-400" aria-hidden="true" />remainder {leftover}</span>}</div>
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" aria-hidden="true">{Array.from({ length: groups }, (_, index) => <div key={index} className="flex min-h-8 items-center justify-center rounded border-2 border-purple-300 bg-purple-50 text-xs font-bold text-purple-800">{example.divisor}</div>)}{leftover > 0 && <div className="flex min-h-8 items-center justify-center rounded border-2 border-orange-300 bg-orange-50 text-xs font-bold text-orange-800">+{leftover}</div>}</div>
  </div>;
}

export function QuickExplanationFlow({ lesson, language, onRetry, onViewLesson, onReviewExample }: { lesson: QuickExplanation; language: string; onRetry?: () => void; onViewLesson?: () => void; onReviewExample?: () => void }) {
  const [state, setState] = React.useState<QuickFlowState>({ index: 0, choice: null, validated: false, wrongAttempts: 0, showReasoning: false });
  const dispatch = (action: QuickFlowAction) => setState(previous => quickFlowTransition(previous, action, lesson));
  const fr = /^fr/i.test(language);
  const checkIndex = lesson.frames.length + 1;
  const isCheck = state.index === checkIndex;
  const correct = state.validated && state.choice === lesson.check.correctChoice;
  const frame = lesson.frames[state.index - 1];
  const title = state.index === 0 ? (fr ? 'L’idée à comprendre' : 'The idea to understand') : isCheck ? (fr ? 'À toi de réfléchir' : 'Your turn to think') : frame.title;
  const hint = state.wrongAttempts >= 2 ? (fr ? 'Reprends l’exemple : compare les deux multiples autour du dividende, puis vérifie le résultat.' : 'Review the example: compare the two multiples around the dividend, then verify the result.') : lesson.check.hint;
  return <section className="space-y-3" data-explanation-flow="quick">
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950"><span aria-hidden="true">💡</span>{fr ? 'Comprendre' : 'Understand'}</div><p className="text-sm leading-6 text-slate-800">{lesson.concept}</p>{!isCheck && <div className="mt-3"><DivisionVisual lesson={lesson} /></div>}</article>
      <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm"><div className="mb-2 flex items-center justify-between gap-3"><h4 className="font-bold text-violet-950" tabIndex={-1}>{title}</h4><span aria-label={fr ? 'Progression' : 'Progress'}>{state.index + 1}/{checkIndex + 1}</span></div>
        {!isCheck ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{frame?.body || lesson.concept}</p> : <><p className="font-semibold text-slate-900">{lesson.check.question}</p><div role="group" aria-label={fr ? 'Choisis une réponse' : 'Choose an answer'} className="mt-3 grid gap-2">{lesson.check.choices.map(choice => <button key={choice} type="button" aria-pressed={state.choice === choice} className={`${control} text-left ${state.choice === choice ? 'border-violet-600 bg-violet-100' : 'bg-white'}`} onClick={() => dispatch({ type: 'select', choice })}>{choice}</button>)}</div><button type="button" className={`${control} mt-3 w-full bg-violet-700 text-white`} disabled={!state.choice || state.validated} onClick={() => dispatch({ type: 'validate' })}>{fr ? 'Valider ma réponse' : 'Validate my answer'}</button>{correct && <p role="status" className="mt-3 text-sm leading-6 text-emerald-800">{lesson.check.explanation}</p>}{state.wrongAttempts > 0 && !state.validated && !state.showReasoning && <p role="status" className="mt-3 text-sm leading-6 text-amber-900">{hint}</p>}{state.showReasoning && <div role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">{lesson.check.explanation}</div>}</>}
      </article>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" className={control} disabled={state.index === 0} onClick={() => dispatch({ type: 'back' })}>{fr ? 'Étape précédente' : 'Previous step'}</button>{!isCheck && <button type="button" className={`${control} bg-violet-700 text-white`} onClick={() => dispatch({ type: 'next' })}>{fr ? 'Étape suivante' : 'Next step'}</button>}{isCheck && (correct || state.showReasoning) && <button type="button" className={`${control} bg-emerald-700 text-white`} onClick={onRetry}>{fr ? 'Réessayer mon exercice' : 'Retry my exercise'}</button>}</div>
    {isCheck && state.showReasoning && <button type="button" className={`${control} border-transparent underline`} onClick={() => { onReviewExample?.(); setState(previous => ({ ...previous, index: 1, choice: null, validated: false, showReasoning: false })); }}>{fr ? 'Revoir l’exemple' : 'Review the example'}</button>}
    {onViewLesson && <button type="button" className={`${control} border-transparent underline`} onClick={onViewLesson}>{fr ? 'Voir la leçon complète' : 'View the full lesson'}</button>}
  </section>;
}
