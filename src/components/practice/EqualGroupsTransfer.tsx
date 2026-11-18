import { useEffect, useMemo, useState } from 'react';
import { createEqualGroupsTransfer, equalGroupsFeedback } from '@/features/practice/equalGroupsFeedback';
import { guidedFamilyAnswer, makeGuidedFamilyChoices, type EqualGroupsExercise } from '@/features/practice/guidedFamilies';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';
import { PracticeFeedback } from './PracticeFeedback';

type TransferState = { started: boolean; selected: number | null; attempts: number; supported: boolean; complete: boolean };
const empty: TransferState = { started: false, selected: null, attempts: 0, supported: false, complete: false };
const button = 'min-h-11 rounded-xl border-2 border-violet-600 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-50';

/** A separate local Practice attempt; it never updates the original score or mastery. */
export function EqualGroupsTransfer({ source, storageKey }: { source: EqualGroupsExercise; storageKey: string }) {
  const exercise = useMemo(() => createEqualGroupsTransfer(source), [source]);
  const choices = useMemo(() => makeGuidedFamilyChoices(exercise), [exercise]);
  const fingerprint = JSON.stringify(exercise);
  const [state, setState] = useState<TransferState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${storageKey}:transfer:v1`) ?? 'null');
      const value = saved?.state;
      if (saved?.fingerprint === fingerprint && value?.started === true && Number.isInteger(value.attempts) && value.attempts >= 0 && value.attempts <= 1000 && (value.selected === null || choices.includes(value.selected))) {
        return { started: true, selected: value.selected, attempts: value.attempts, supported: value.supported === true || value.attempts > 1,
          complete: value.complete === true && value.attempts >= 1 && value.selected === guidedFamilyAnswer(exercise) };
      }
    } catch { /* Local persistence is optional. */ }
    return empty;
  });
  const [hint, setHint] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(`${storageKey}:transfer:v1`, JSON.stringify({ fingerprint, state })); } catch { /* Keep working when storage is unavailable. */ }
  }, [fingerprint, state, storageKey]);
  if (!state.started) return <button type="button" className={button} onClick={() => setState({ ...empty, started: true })}>Essayer sans le modèle</button>;
  const names = { apple: ['pomme', 'pommes'], book: ['livre', 'livres'], pencil: ['crayon', 'crayons'], star: ['étoile', 'étoiles'] };
  const check = () => {
    if (state.selected === null || error || state.complete) return;
    const correct = state.selected === guidedFamilyAnswer(exercise);
    setState(current => ({ ...current, attempts: current.attempts + 1, supported: current.supported || !correct, complete: correct }));
    setError(!correct);
    setHint(false);
  };
  return <section className="space-y-3 rounded-2xl border border-violet-200 p-4" aria-label="Nouvel essai sans modèle" data-testid="equal-groups-transfer">
    <h3 className="text-lg font-bold">À toi, sans le modèle</h3>
    <p>Il y a {exercise.groups} {exercise.groups === 1 ? 'groupe' : 'groupes'} de {exercise.perGroup} {names[exercise.object][exercise.perGroup === 1 ? 0 : 1]}. Combien y en a-t-il en tout ?</p>
    {!state.complete && <>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Réponses du nouvel essai">{choices.map(choice => <button type="button" key={choice} className={`${button} ${state.selected === choice ? 'bg-violet-100' : 'bg-white'}`} aria-pressed={state.selected === choice} disabled={error} onClick={() => setState(current => ({ ...current, selected: choice }))}>{choice}</button>)}</div>
      <button type="button" className={`${button} w-full bg-violet-700 text-white`} disabled={state.selected === null || error} onClick={check}>Vérifier ce nouvel essai</button>
      {error && <div role="status" className="rounded-xl bg-amber-50 p-3"><p>{equalGroupsFeedback(exercise, state.selected!, 'fr', false)}</p><button type="button" className={`${button} mt-3`} onClick={() => { setError(false); setState(current => ({ ...current, selected: null })); }}>Réessayer le nouvel essai</button></div>}
      <button type="button" className={button} aria-expanded={hint} onClick={() => { setHint(current => !current); setState(current => ({ ...current, supported: true })); }}>{hint ? 'Masquer l’aide' : 'Besoin d’aide ?'}</button>
      {hint && <p className="rounded-xl bg-amber-50 p-3">Imagine chaque groupe. Additionne la quantité d’un groupe autant de fois qu’il y a de groupes. La multiplication représente cette addition répétée.</p>}
    </>}
    {state.complete && <div role="status" data-testid="equal-groups-transfer-complete"><PracticeFeedback status="correct" language="fr" /><p>{state.supported ? 'Tu as réussi avec une aide ou une correction. Continue à t’entraîner.' : 'Tu as réussi ce nouvel exemple seul, dès le premier essai.'}</p><p>Score du nouvel essai : {scoreQuestionWithPenalty(source.points ?? 1, state.attempts, true).awardedPoints} / {source.points ?? 1}</p></div>}
  </section>;
}
