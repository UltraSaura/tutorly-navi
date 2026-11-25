import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, Lightbulb, X } from 'lucide-react';
import { PracticeFeedback } from './PracticeFeedback';
import {
  arithmeticProblemAnswer, arithmeticQuizPrompt, asMentalCalculation, evaluateArithmeticQuiz,
  isArithmeticLessonHref, isArithmeticQuizComplete, isArithmeticQuizExercise,
  type ArithmeticQuizAnswer, type ArithmeticQuizExercise, type ArithmeticQuizProblem,
} from '@/features/practice/arithmeticQuiz';
import { formatMentalCalculation, getCalculationExplanation, getCalculationHint, getRelatedMultiplicationFacts, type MentalOperation } from '@/features/practice/mentalCalculationRace';
import { cn } from '@/lib/utils';

export type ArithmeticQuizActivityProps = {
  exercise: ArithmeticQuizExercise;
  initialState?: ArithmeticQuizAnswer;
  language?: string;
  disabled?: boolean;
  lessonLinks?: Partial<Record<MentalOperation, string>>;
  onChange?: (answer: ArithmeticQuizAnswer) => void;
  onComplete?: (answer: ArithmeticQuizAnswer) => void;
};

const button = 'min-h-11 rounded-xl border-2 px-4 py-3 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${button} border-violet-700 bg-violet-700 text-white`;
function method(problem: ArithmeticQuizProblem, language: string): string {
  if (!language.startsWith('fr')) return getCalculationHint(asMentalCalculation(problem));
  if (problem.operation === 'addition') return 'Décompose les nombres en unités, dizaines et autres rangs. Additionne les parties, puis réunis-les.';
  if (problem.operation === 'subtraction' && problem.left < problem.right) return 'La quantité retirée dépasse la quantité de départ : le résultat est négatif. Cherche l’écart entre les quantités, puis tiens compte du signe.';
  if (problem.operation === 'subtraction') return 'Cherche ce qu’il faut ajouter au plus petit nombre pour retrouver le plus grand, ou enlève les quantités par étapes.';
  if (problem.operation === 'multiplication') return 'Utilise une table connue ou décompose un facteur. Multiplie chaque partie et additionne les produits.';
  return 'Cherche la multiplication inverse : par quel nombre faut-il multiplier le diviseur pour retrouver le dividende ?';
}
function explanation(problem: ArithmeticQuizProblem, language: string): string {
  if (!language.startsWith('fr')) return getCalculationExplanation(asMentalCalculation(problem));
  const expression = formatMentalCalculation(asMentalCalculation(problem)).replace('?', String(arithmeticProblemAnswer(problem)));
  return `${expression}. ${method(problem, language)}`;
}
function elapsedLabel(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }

export function ArithmeticQuizActivity(props: ArithmeticQuizActivityProps) {
  if (!isArithmeticQuizExercise(props.exercise)) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Cette série de calculs n’est pas configurée correctement.</p>;
  return <ArithmeticQuizSession key={JSON.stringify(props.exercise)} {...props} />;
}

function ArithmeticQuizSession({ exercise, initialState, language = 'fr', disabled = false, lessonLinks, onChange, onComplete }: ArithmeticQuizActivityProps) {
  const fr = language.startsWith('fr');
  const race = exercise.kind === 'calculation-race';
  const [responses, setResponses] = useState<Record<string, number>>(() => {
    const restored: Record<string, number> = {};
    for (const problem of exercise.problems) {
      const selected = initialState?.responses?.[problem.id];
      if (typeof selected !== 'number' || !problem.choices.includes(selected)) break;
      restored[problem.id] = selected;
    }
    return restored;
  });
  const [complete, setComplete] = useState(isArithmeticQuizComplete(exercise, initialState));
  const [index, setIndex] = useState(() => {
    const unanswered = exercise.problems.findIndex(problem => !problem.choices.includes(initialState?.responses?.[problem.id] ?? NaN));
    return unanswered < 0 ? exercise.problems.length - 1 : unanswered;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [cardFeedback, setCardFeedback] = useState(false);
  const [supported, setSupported] = useState(initialState?.supported === true);
  const [hintOpen, setHintOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<string[]>([]);
  const initialSeconds = typeof initialState?.elapsedSeconds === 'number' && Number.isFinite(initialState.elapsedSeconds) && initialState.elapsedSeconds >= 0 ? initialState.elapsedSeconds : 0;
  const [elapsedSeconds, setElapsed] = useState(initialSeconds);
  const started = useRef(Date.now() - initialSeconds * 1000);
  const finished = useRef(complete);
  const submissionLock = useRef<string | null>(null);
  const advanceLock = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const heading = useRef<HTMLHeadingElement>(null);
  const problem = exercise.problems[index];
  const evaluation = evaluateArithmeticQuiz(exercise, responses);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { submissionLock.current = null; advanceLock.current = null; heading.current?.focus(); }, [index]);
  useEffect(() => {
    if (complete || disabled) return;
    const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - started.current) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [complete, disabled]);
  useEffect(() => {
    onChangeRef.current?.({ responses, correctCount: evaluation.correctCount, total: evaluation.total, complete, attempts: complete ? 1 : 0, elapsedSeconds, supported });
  }, [responses, evaluation.correctCount, evaluation.total, complete, elapsedSeconds, supported]);

  const submit = (choice: number) => {
    if (disabled || complete || cardFeedback || finished.current || submissionLock.current === problem.id || !problem.choices.includes(choice)) return;
    submissionLock.current = problem.id;
    const nextResponses = { ...responses, [problem.id]: choice };
    const final = index === exercise.problems.length - 1;
    const usedSupport = supported || (!race && choice !== arithmeticProblemAnswer(problem));
    setResponses(nextResponses); setSupported(usedSupport);
    if (final) {
      const result = evaluateArithmeticQuiz(exercise, nextResponses);
      const seconds = Math.max(0, Math.floor((Date.now() - started.current) / 1000));
      const answer = { responses: nextResponses, correctCount: result.correctCount, total: result.total, complete: true, attempts: 1, elapsedSeconds: seconds, supported: usedSupport };
      finished.current = true; setComplete(true); setElapsed(seconds);
      onComplete?.(answer);
    } else if (race) { setIndex(value => value + 1); setSelected(null); }
    else { setCardFeedback(true); setSelected(choice); }
  };

  if (complete) return <section className="space-y-4" data-testid="arithmetic-quiz-complete">
    <PracticeFeedback status={evaluation.correctCount === evaluation.total ? 'correct' : evaluation.correctCount > 0 ? 'partial' : 'incorrect'} language={language} />
    <h3 className="text-xl font-bold">{fr ? 'Série terminée' : 'Deck complete'}</h3>
    <p>{fr ? `${evaluation.correctCount} réponses correctes sur ${evaluation.total}.` : `${evaluation.correctCount} correct answers out of ${evaluation.total}.`}</p>
    <p className="flex items-center gap-2 text-sm text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4" />{fr ? 'Temps écoulé' : 'Elapsed time'} : {elapsedLabel(elapsedSeconds)}</p>
    {evaluation.results.every(result => result.correct) && <p className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{fr ? 'Tous les calculs de cette série sont réussis.' : 'Every calculation in this deck is correct.'}</p>}
    <div className="space-y-3">
      <h4 className="font-bold">{fr ? 'Résultats des calculs' : 'Calculation results'}</h4>
      {evaluation.results.map((result, index) => {
        const calculation = exercise.problems.find(item => item.id === result.id)!;
        const link = calculation.lessonHref ?? lessonLinks?.[calculation.operation];
        const facts = getRelatedMultiplicationFacts(asMentalCalculation(calculation));
        return <article
          key={result.id}
          data-testid={`arithmetic-result-${result.id}`}
          data-result={result.correct ? 'correct' : 'incorrect'}
          aria-label={`${fr ? 'Calcul' : 'Calculation'} ${index + 1}: ${result.correct ? (fr ? 'Correct' : 'Correct') : (fr ? 'Incorrect' : 'Incorrect')}`}
          className={`space-y-3 rounded-xl border-2 p-4 ${result.correct ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}
        >
          <div className={`flex items-center gap-2 font-bold ${result.correct ? 'text-emerald-800' : 'text-rose-800'}`}>
            <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full ${result.correct ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {result.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            {result.correct ? (fr ? 'Correct' : 'Correct') : (fr ? 'Incorrect' : 'Incorrect')}
          </div>
          <p className="font-mono text-lg font-bold">{formatMentalCalculation(asMentalCalculation(calculation))}</p>
          <p className="text-sm text-slate-700">{fr ? 'Ta réponse' : 'Your answer'} : {result.selected}</p>
          {!result.correct && <p className="text-sm font-semibold text-emerald-800">{fr ? 'Réponse correcte' : 'Correct answer'} : {arithmeticProblemAnswer(calculation)}</p>}
          {!result.correct && <>
            <button type="button" disabled={disabled} className={`${button} border-slate-300 bg-white`} aria-expanded={reviewOpen.includes(result.id)} onClick={() => { setReviewOpen(current => current.includes(result.id) ? current.filter(id => id !== result.id) : [...current, result.id]); }}>{fr ? 'Voir la méthode' : 'Show method'}</button>
            {reviewOpen.includes(result.id) && <div className="space-y-2 rounded-lg bg-white/80 p-3"><p className="text-sm leading-relaxed">{explanation(calculation, language)}</p>{facts.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">{fr ? 'Table de multiplication associée' : 'Related multiplication table'}</summary><ul className="grid grid-cols-2 gap-2 text-sm">{facts.map(fact => <li key={fact.multiplier}>{calculation.right} × {fact.multiplier} = {fact.product}</li>)}</ul></details>}</div>}
            {isArithmeticLessonHref(link) && <a href={link} className="inline-flex min-h-11 items-center font-bold text-violet-800 underline">{fr ? 'Ouvrir la leçon associée' : 'Open related lesson'}</a>}
          </>}
        </article>;
      })}
    </div>
  </section>;

  return <section className="space-y-4" data-testid={`arithmetic-quiz-${exercise.kind}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600"><span>{fr ? 'Calcul' : 'Calculation'} {index + 1} {fr ? 'sur' : 'of'} {exercise.problems.length}</span><span className="flex items-center gap-2" role="timer" aria-live="off"><Clock3 aria-hidden="true" className="h-4 w-4" />{fr ? 'Temps écoulé' : 'Elapsed time'} : {elapsedLabel(elapsedSeconds)}</span></div>
    <p className="text-sm text-slate-600">{arithmeticQuizPrompt(exercise, language)}</p>
    <h3 ref={heading} tabIndex={-1} className="rounded-2xl bg-violet-50 px-4 py-8 text-center font-mono text-3xl font-bold outline-none" aria-live="polite">{formatMentalCalculation(asMentalCalculation(problem))}</h3>
    <div className="grid grid-cols-2 gap-3" role="group" aria-label={fr ? 'Réponses proposées' : 'Answer choices'}>{problem.choices.map(choice => <button type="button" key={choice} disabled={disabled || cardFeedback} aria-pressed={!race && selected === choice} className={cn(button, 'border-slate-300 bg-white text-slate-900', !race && selected === choice && 'border-violet-700 bg-violet-50')} onClick={() => race ? submit(choice) : setSelected(choice)}>{choice}</button>)}</div>
    {!race && !cardFeedback && <><button type="button" className={`${primary} w-full`} disabled={disabled || selected === null} onClick={() => { if (selected !== null) submit(selected); }}>{fr ? 'Vérifier' : 'Check answer'}</button><button type="button" className="flex min-h-11 items-center gap-2 font-bold text-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300" disabled={disabled} aria-expanded={hintOpen} onClick={() => { setHintOpen(value => !value); setSupported(true); }}><Lightbulb aria-hidden="true" className="h-4 w-4" />{hintOpen ? (fr ? 'Masquer l’indice' : 'Hide hint') : (fr ? 'Afficher un indice' : 'Show hint')}</button>{hintOpen && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{method(problem, language)}</p>}</>}
    {!race && cardFeedback && <div className="space-y-3 rounded-xl border bg-slate-50 p-4"><PracticeFeedback status={responses[problem.id] === arithmeticProblemAnswer(problem) ? 'correct' : 'incorrect'} language={language} />{responses[problem.id] !== arithmeticProblemAnswer(problem) && <p className="text-sm leading-relaxed">{method(problem, language)}</p>}<button type="button" disabled={disabled} className={`${primary} w-full`} onClick={() => { if (advanceLock.current === problem.id) return; advanceLock.current = problem.id; setIndex(value => value + 1); setSelected(null); setCardFeedback(false); setHintOpen(false); }}>{fr ? 'Carte suivante' : 'Next card'}</button></div>}
  </section>;
}
