import React from 'react';
import type { QuickExplanation } from './quickExplanation';

export type QuickFlowState = { index: number; choice: string | null };
export function quickFlowTransition(state: QuickFlowState, action: { type: 'next' | 'back' | 'answer'; choice?: string }, lesson: QuickExplanation): QuickFlowState {
  const checkIndex = lesson.frames.length + 1;
  if (action.type === 'back') return { ...state, index: Math.max(0, state.index - 1) };
  if (action.type === 'answer') return state.index === checkIndex && lesson.check.choices.includes(action.choice || '') ? { ...state, choice: action.choice! } : state;
  return { ...state, index: Math.min(checkIndex, state.index + 1) };
}
const control = 'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40';
export function QuickExplanationFlow({ lesson, language, onRetry, onViewLesson, state: externalState, onAction }: {
  lesson: QuickExplanation; language: string; onRetry?: () => void; onViewLesson?: () => void;
  state?: QuickFlowState; onAction?: (action: Parameters<typeof quickFlowTransition>[1]) => void;
}) {
  const [local, setLocal] = React.useState<QuickFlowState>({ index: 0, choice: null });
  const state = externalState || local;
  const dispatch = onAction || ((action) => setLocal(previous => quickFlowTransition(previous, action, lesson)));
  const fr = /^fr/i.test(language);
  const checkIndex = lesson.frames.length + 1;
  const isCheck = state.index === checkIndex;
  const correct = state.choice === lesson.check.correctChoice;
  const frame = lesson.frames[state.index - 1];
  const title = state.index === 0 ? (fr ? 'L’idée à comprendre' : 'The idea to understand') : isCheck ? (fr ? 'À toi de réfléchir' : 'Your turn to think') : frame.title;
  return <section className="space-y-3" data-explanation-flow="quick">
    <div className="flex items-center justify-between gap-3">
      <h4 className="font-bold" tabIndex={-1}>{title}</h4>
      <span aria-label={fr ? 'Progression' : 'Progress'}>{state.index + 1}/{checkIndex + 1}</span>
    </div>
    <div className="rounded-xl border bg-blue-50 p-4 text-slate-900">
      {!isCheck ? <p className="whitespace-pre-wrap text-sm leading-6">{state.index === 0 ? lesson.concept : frame.body}</p> : <>
        <p className="font-semibold">{lesson.check.question}</p>
        <div role="group" aria-label={fr ? 'Choisis une réponse' : 'Choose an answer'} className="mt-3 grid gap-2">
          {lesson.check.choices.map(choice => <button key={choice} type="button" disabled={correct} aria-pressed={state.choice === choice}
            className={`${control} text-left ${state.choice === choice ? 'border-blue-600 bg-blue-100' : 'bg-white'}`}
            onClick={() => dispatch({ type: 'answer', choice })}>{choice}</button>)}
        </div>
        {state.choice && <p role="status" className="mt-3 text-sm leading-6">{correct ? lesson.check.explanation : lesson.check.hint}</p>}
      </>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" className={control} disabled={state.index === 0} onClick={() => dispatch({ type: 'back' })}>{fr ? 'Étape précédente' : 'Previous step'}</button>
      {isCheck ? <button type="button" className={`${control} bg-blue-700 text-white`} disabled={!correct} onClick={onRetry}>{fr ? 'Réessayer mon exercice' : 'Retry my exercise'}</button> :
        <button type="button" className={`${control} bg-blue-700 text-white`} onClick={() => dispatch({ type: 'next' })}>{fr ? 'Étape suivante' : 'Next step'}</button>}
    </div>
    {isCheck && correct && <p className="text-sm">{lesson.retryGuidance}</p>}
    {onViewLesson && <button type="button" className={`${control} border-transparent underline`} onClick={onViewLesson}>{fr ? 'Voir la leçon complète' : 'View the full lesson'}</button>}
  </section>;
}
