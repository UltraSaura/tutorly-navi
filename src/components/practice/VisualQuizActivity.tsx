import { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { GraduatedNumberLineActivity, type NumberLineAnswerState } from '@/features/practice/numberLine/GraduatedNumberLineActivity';
import { LessonVisualBlock } from '@/components/learning/LessonVisualBlock';
import { PracticeFeedback } from './PracticeFeedback';
import {
  isVisualQuizAnswerCorrect, isVisualQuizExercise,
  type VisualQuizAnswer, type VisualQuizExercise,
} from '@/features/practice/visualQuiz';

type Props = {
  exercise: VisualQuizExercise;
  language?: string;
  disabled?: boolean;
  onChange?: (answer: VisualQuizAnswer) => void;
  onComplete?: (answer: VisualQuizAnswer) => void;
};
const control = 'min-h-11 rounded-xl border-2 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50';

/** Render only the authored bank payload. There is no learner-side sample generation. */
export function VisualQuizActivity(props: Props) {
  if (!isVisualQuizExercise(props.exercise)) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{props.language?.startsWith('en') ? 'This visual question is not configured correctly.' : 'Cette question visuelle est mal configurée.'}</p>;
  return <VisualQuizSession key={JSON.stringify(props.exercise)} {...props} />;
}

function VisualQuizSession({ exercise, language = 'fr', disabled = false, onChange, onComplete }: Props) {
  const fr = language.startsWith('fr');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [supported, setSupported] = useState(false);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const finished = useRef(false);
  const callbacks = useRef({ onChange, onComplete });
  useEffect(() => { callbacks.current = { onChange, onComplete }; }, [onChange, onComplete]);
  useEffect(() => {
    if (exercise.kind === 'analogue-clock') callbacks.current.onChange?.({ value: '', position: null, selectedHour, attempts, supported, complete });
  }, [selectedHour, attempts, supported, complete, exercise.kind]);
  const handleNumberLineState = useCallback((state: NumberLineAnswerState) => {
    if (exercise.kind !== 'graduated-number-line') return;
    const itemId = exercise.configuration.items[0].id;
    const candidate: VisualQuizAnswer = { value: state.answers[itemId] ?? '', position: state.placements[itemId] ?? null, selectedHour: null, attempts: state.attempts, supported: state.supported, complete: state.complete };
    candidate.complete = isVisualQuizAnswerCorrect(exercise, candidate);
    callbacks.current.onChange?.(candidate);
    if (candidate.complete && !finished.current) {
      finished.current = true;
      setComplete(true);
      callbacks.current.onComplete?.(candidate);
    }
  }, [exercise]);

  if (exercise.kind === 'graduated-number-line') return <section data-testid="visual-quiz-number-line" className="space-y-4" aria-label={fr ? 'Question sur une droite graduée' : 'Number-line question'}>
    <p className="text-lg font-semibold">{exercise.prompt}</p>
    <GraduatedNumberLineActivity config={exercise.configuration} language={language} disabled={disabled || complete} onStateChange={handleNumberLineState} />
  </section>;

  const check = () => {
    if (disabled || complete || feedback || selectedHour === null || finished.current) return;
    const nextAttempts = attempts + 1;
    const candidate: VisualQuizAnswer = { value: '', position: null, selectedHour, attempts: nextAttempts, supported, complete: true };
    setAttempts(nextAttempts);
    if (isVisualQuizAnswerCorrect(exercise, candidate)) {
      finished.current = true;
      setComplete(true);
      setHintOpen(false);
      callbacks.current.onChange?.(candidate);
      callbacks.current.onComplete?.(candidate);
    } else setFeedback(true);
  };
  const hint = exercise.mode === 'read'
    ? (fr ? 'Repère la petite aiguille : elle indique les heures. La grande aiguille indique les minutes. Observe vers quel trait pointe la petite aiguille.' : 'Find the short hand: it shows hours. The long hand shows minutes. Look at the mark toward which the short hand points.')
    : (fr ? 'Lis d’abord la position de la petite aiguille. Une heure plus tard, elle avance jusqu’au prochain trait des heures. Après douze, le cadran recommence.' : 'First read the short hand. One hour later, it moves to the next hour mark. After twelve, the clock starts around again.');
  return <section data-testid="visual-quiz-clock" className="space-y-4" aria-label={fr ? 'Question sur une horloge' : 'Clock question'}>
    <p className="text-lg font-semibold">{exercise.prompt}</p>
    <LessonVisualBlock title={fr ? 'Observe les aiguilles' : 'Look at the hands'} visual={{ kind: 'clock', data: { hour: exercise.startHour, minute: 0 }, alt_text: fr ? 'Horloge à aiguilles, petite aiguille des heures et grande aiguille des minutes.' : 'Analogue clock with a short hour hand and a long minute hand.' }} />
    {!complete && <div className="grid grid-cols-2 gap-2" role="group" aria-label={fr ? 'Heures proposées' : 'Hour choices'}>{exercise.answerChoices.map(hour => <button key={hour} type="button" className={`${control} ${selectedHour === hour ? 'border-violet-700 bg-violet-50 text-violet-950' : 'border-slate-300 bg-white text-slate-900'}`} aria-pressed={selectedHour === hour} disabled={disabled || feedback} onClick={() => setSelectedHour(hour)}>{hour} h</button>)}</div>}
    {complete ? <div data-testid="visual-quiz-complete" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4"><PracticeFeedback status="correct" language={fr ? 'fr' : 'en'} /><p>{supported ? (fr ? 'Réussi avec aide.' : 'Solved with help.') : (fr ? 'Réussi sans aide.' : 'Solved without help.')}</p></div>
      : feedback ? <div role="status" className="space-y-3 rounded-xl bg-amber-50 p-4"><p>{fr ? 'Pas encore. Observe à nouveau les aiguilles et réessaie.' : 'Not yet. Look at the hands again and try once more.'}</p><button type="button" className={`${control} border-slate-300 bg-white`} disabled={disabled} onClick={() => { setFeedback(false); }}>{fr ? 'Réessayer' : 'Try again'}</button></div>
        : <button type="button" className={`${control} w-full border-violet-700 bg-violet-700 text-white`} disabled={disabled || selectedHour === null} onClick={check}>{fr ? 'Vérifier' : 'Check answer'}</button>}
    {!complete && <div><button type="button" className={`${control} flex items-center gap-2 border-transparent text-violet-900`} disabled={disabled} aria-expanded={hintOpen} onClick={() => { if (!hintOpen) setSupported(true); setHintOpen(value => !value); }}><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintOpen ? (fr ? 'Masquer l’indice' : 'Hide hint') : (fr ? 'Afficher un indice' : 'Show hint')}</button>{hintOpen && <p data-testid="visual-quiz-hint" className="mt-2 rounded-xl bg-amber-50 p-4 text-sm">{hint}</p>}</div>}
  </section>;
}
