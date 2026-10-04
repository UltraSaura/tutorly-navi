import React from 'react';
import type { QuickExplanation, VisualPhase } from './quickExplanation';

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

export function visibleGroupsForPhase(lesson: QuickExplanation, phase: VisualPhase): number {
  const target = Math.min(Math.max(Math.floor(lesson.workedExample.dividend / lesson.workedExample.divisor), 1), 12);
  return phase === 'form_groups' || phase === 'count_groups' || phase === 'show_remainder' || phase === 'verify' ? target : 0;
}

function DivisionVisual({ lesson, phase, language, replayToken }: { lesson: QuickExplanation; phase: VisualPhase; language: string; replayToken: number }) {
  const { workedExample: example, canonicalSkill } = lesson;
  const targetGroups = visibleGroupsForPhase(lesson, phase);
  const [visibleGroups, setVisibleGroups] = React.useState(0);
  const leftover = example.dividend % example.divisor;
  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  React.useEffect(() => {
    setVisibleGroups(phase === 'form_groups' && !reducedMotion ? 0 : targetGroups);
    if (phase !== 'form_groups' || reducedMotion || targetGroups === 0) return;
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1; setVisibleGroups(next);
      if (next >= targetGroups) window.clearInterval(timer);
    }, 280);
    return () => window.clearInterval(timer);
  }, [phase, replayToken, reducedMotion, targetGroups]);
  const fr = /^fr/i.test(language);
  const totalLabel = fr ? `${example.dividend} au total` : `${example.dividend} total`;
  const groupLabel = fr ? `groupes de ${example.divisor}` : `groups of ${example.divisor}`;
  const countLabel = fr ? `${visibleGroups} groupes complets` : `${visibleGroups} complete groups`;
  const remainderLabel = fr ? `reste : ${leftover}` : `remainder: ${leftover}`;
  const visualName = fr
    ? (canonicalSkill.preferredVisual === 'equal_groups_or_array' ? 'groupes égaux' : canonicalSkill.preferredVisual === 'equal_groups_with_remainder' ? 'groupes égaux avec reste' : 'représentation mathématique')
    : (canonicalSkill.preferredVisual === 'equal_groups_or_array' ? 'equal groups' : canonicalSkill.preferredVisual === 'equal_groups_with_remainder' ? 'equal groups with remainder' : 'mathematical representation');
  const visualLabel = fr ? `${visualName}, ${visibleGroups} groupes` : `${visualName}, ${visibleGroups} groups`;
  return <div className="rounded-xl border border-blue-200 bg-white/80 p-3" aria-label={visualLabel}>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700"><span><span className="mr-1 inline-block h-3 w-3 rounded bg-blue-500" aria-hidden="true" />{totalLabel}</span>{phase !== 'show_total' && <span><span className="mr-1 inline-block h-3 w-3 rounded bg-purple-500" aria-hidden="true" />{groupLabel}</span>}</div>
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" aria-hidden="true">{Array.from({ length: visibleGroups }, (_, index) => <div key={index} className="flex min-h-8 items-center justify-center rounded border-2 border-purple-300 bg-purple-50 text-xs font-bold text-purple-800">{example.divisor}</div>)}{phase === 'show_remainder' || phase === 'verify' ? leftover > 0 && <div className="flex min-h-8 items-center justify-center rounded border-2 border-orange-300 bg-orange-50 text-xs font-bold text-orange-800">+{leftover}</div> : null}</div>
    {phase === 'count_groups' || phase === 'verify' ? <p className="mt-2 text-xs font-semibold text-emerald-800">{countLabel}</p> : null}
    {phase === 'show_remainder' || (phase === 'verify' && leftover > 0) ? <p className="mt-2 text-xs font-semibold text-orange-800">{remainderLabel}</p> : null}
    {phase === 'verify' && <p className="mt-2 text-xs font-semibold text-emerald-800">{leftover > 0 ? `${example.divisor} × ${visibleGroups} + ${leftover} = ${example.dividend}` : (fr ? 'aucun reste' : 'no remainder')}</p>}
  </div>;
}

export function QuickExplanationFlow({ lesson, language, onRetry, onViewLesson, onReviewExample }: { lesson: QuickExplanation; language: string; onRetry?: () => void; onViewLesson?: () => void; onReviewExample?: () => void }) {
  const [state, setState] = React.useState<QuickFlowState>({ index: 0, choice: null, validated: false, wrongAttempts: 0, showReasoning: false });
  const [replayToken, setReplayToken] = React.useState(0);
  const dispatch = (action: QuickFlowAction) => setState(previous => quickFlowTransition(previous, action, lesson));
  const fr = /^fr/i.test(language);
  const checkIndex = lesson.frames.length + 1;
  const isCheck = state.index === checkIndex;
  const correct = state.validated && state.choice === lesson.check.correctChoice;
  const frame = lesson.frames[state.index - 1];
  const phase: VisualPhase = state.index === 0 ? 'show_total' : isCheck ? 'show_total' : frame?.visualPhase || 'show_total';
  const title = state.index === 0 ? (fr ? 'Exemple guidé' : 'Guided example') : isCheck ? (fr ? 'À toi de réfléchir' : 'Your turn to think') : frame.title;
  const hint = state.wrongAttempts >= 2 ? (fr ? 'Reprends l’exemple : compare les deux multiples autour du dividende, puis vérifie le résultat.' : 'Review the example: compare the two multiples around the dividend, then verify the result.') : lesson.check.hint;
  return <section className="space-y-3" data-explanation-flow="quick">
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950"><span aria-hidden="true">💡</span>{fr ? 'Comprendre' : 'Understand'}</div><p className="text-sm leading-6 text-slate-800">{lesson.concept}</p>{!isCheck && <div className="mt-3"><DivisionVisual lesson={lesson} phase={phase} language={language} replayToken={replayToken} /><button type="button" className={`${control} mt-2 w-full bg-white`} onClick={() => setReplayToken(value => value + 1)}>{fr ? 'Revoir l’animation' : 'Replay animation'}</button></div>}</article>
      <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm"><div className="mb-2 flex items-center justify-between gap-3"><h4 className="font-bold text-violet-950" tabIndex={-1}>{title}</h4><span aria-label={fr ? 'Progression' : 'Progress'}>{state.index + 1}/{checkIndex + 1}</span></div>
        {!isCheck ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{state.index === 0 ? (fr ? 'Avance pour suivre les étapes du raisonnement.' : 'Move forward to follow the reasoning steps.') : frame.body}</p> : <><p className="font-semibold text-slate-900">{lesson.check.question}</p><div role="group" aria-label={fr ? 'Choisis une réponse' : 'Choose an answer'} className="mt-3 grid gap-2">{lesson.check.choices.map(choice => <button key={choice} type="button" aria-pressed={state.choice === choice} className={`${control} text-left ${state.choice === choice ? 'border-violet-600 bg-violet-100' : 'bg-white'}`} onClick={() => dispatch({ type: 'select', choice })}>{choice}</button>)}</div><button type="button" className={`${control} mt-3 w-full bg-violet-700 text-white`} disabled={!state.choice || state.validated} onClick={() => dispatch({ type: 'validate' })}>{fr ? 'Valider ma réponse' : 'Validate my answer'}</button>{correct && <p role="status" className="mt-3 text-sm leading-6 text-emerald-800">{lesson.check.explanation}</p>}{state.wrongAttempts > 0 && !state.validated && !state.showReasoning && <p role="status" className="mt-3 text-sm leading-6 text-amber-900">{hint}</p>}{state.showReasoning && <div role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">{lesson.check.explanation}</div>}</>}
      </article>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" className={control} disabled={state.index === 0} onClick={() => dispatch({ type: 'back' })}>{fr ? 'Étape précédente' : 'Previous step'}</button>{!isCheck && <button type="button" className={`${control} bg-violet-700 text-white`} onClick={() => dispatch({ type: 'next' })}>{fr ? 'Étape suivante' : 'Next step'}</button>}{isCheck && (correct || state.showReasoning) && <button type="button" className={`${control} bg-emerald-700 text-white`} onClick={onRetry}>{fr ? 'Réessayer mon exercice' : 'Retry my exercise'}</button>}</div>
    {isCheck && state.showReasoning && <button type="button" className={`${control} border-transparent underline`} onClick={() => { onReviewExample?.(); setState(previous => ({ ...previous, index: 1, choice: null, validated: false, showReasoning: false })); }}>{fr ? 'Revoir l’exemple' : 'Review the example'}</button>}
    {onViewLesson && <button type="button" className={`${control} border-transparent underline`} onClick={onViewLesson}>{fr ? 'Voir la leçon complète' : 'View the full lesson'}</button>}
  </section>;
}
