import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Minus, Plus, RotateCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SubtractionWithDotsModel } from '@/components/practice/SubtractionWithDotsModel';
import { PracticeFeedback } from '@/components/practice/PracticeFeedback';
import { PageMeta } from '@/components/seo/PageMeta';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { createSubtractionWithDotsExercise, isValidSubtractionWithDotsExercise, makeSubtractionWithDotsEquationChoices, normalizeSubtractionObject, SUBTRACTION_OBJECTS, subtractionObjectName, subtractionWithDotsTotal, type SubtractionWithDotsExercise, type SubtractionWithDotsPhase } from '@/features/practice/subtractionWithDots';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const KEY = 'tutorly:practice/subtraction-with-dots:v1';
const phases: SubtractionWithDotsPhase[] = ['building', 'removing', 'equation', 'answering', 'complete'];

type SavedSubtraction = {
  exercise?: unknown;
  dotsAdded?: number;
  dotsRemoved?: number;
  phase?: SubtractionWithDotsPhase;
  selectedEquation?: string | null;
  selectedAnswer?: number | null;
  wrongAttempts?: number;
};

const CONFETTI_COLORS = ['#12C6A0', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];

function SubtractionConfetti() {
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: 8 + Math.random() * 84,
    drift: (Math.random() * 2 - 1) * 100,
    fall: 100 + Math.random() * 130,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.12,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 5,
  })), []);

  if (reduceMotion) return null;
  return (
    <div data-testid="subtraction-confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: piece.drift, y: piece.fall, rotate: piece.rotation }}
          transition={{ duration: 1.05, delay: piece.delay, ease: 'easeOut' }}
          className="absolute top-[15%] block rounded-sm"
          style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * 0.65, backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
}

function nextExercise(previous: SubtractionWithDotsExercise) {
  const previousObject = normalizeSubtractionObject(previous.object);
  let next = createSubtractionWithDotsExercise();
  for (let attempt = 0; attempt < 12 && (next.object === previousObject || (next.targetCount === previous.targetCount && next.takeAway === previous.takeAway)); attempt += 1) {
    next = createSubtractionWithDotsExercise();
  }
  if (next.object === previousObject) {
    const previousIndex = SUBTRACTION_OBJECTS.indexOf(previousObject);
    next = { ...next, object: SUBTRACTION_OBJECTS[(previousIndex + 1) % SUBTRACTION_OBJECTS.length] };
  }
  return next;
}

export default function SubtractionWithDotsPage() {
  const navigate = useNavigate();
  const learner = useLearner();
  const storageKey = learnerStorageKey(KEY, learner?.learnerId ?? undefined);
  const [exercise, setExercise] = useState<SubtractionWithDotsExercise>(() => createSubtractionWithDotsExercise());
  const [dotsAdded, setDotsAdded] = useState(0);
  const [dotsRemoved, setDotsRemoved] = useState(0);
  const [phase, setPhase] = useState<SubtractionWithDotsPhase>('building');
  const [selectedEquation, setSelectedEquation] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<'equation' | 'answer' | 'equation-correct' | null>(null);
  const [celebrateCompletion, setCelebrateCompletion] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const total = subtractionWithDotsTotal(exercise);
  const object = normalizeSubtractionObject(exercise.object);
  const objectName = subtractionObjectName(object, exercise.targetCount);
  const expressions = makeSubtractionWithDotsEquationChoices(exercise.targetCount, exercise.takeAway);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setLoadedKey(null);
    const fresh = createSubtractionWithDotsExercise();
    setExercise(fresh);
    setDotsAdded(0);
    setDotsRemoved(0);
    setPhase('building');
    setSelectedEquation(null);
    setSelectedAnswer(null);
    setWrongAttempts(0);
    setFeedback(null);
    setHintOpen(false);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) as SavedSubtraction : null;
      if (saved && isValidSubtractionWithDotsExercise(saved.exercise) && phases.includes(saved.phase!)) {
        const restoredAdded = Math.min(saved.exercise.targetCount, Math.max(0, Number.isInteger(saved.dotsAdded) ? saved.dotsAdded! : 0));
        const restoredRemoved = Math.min(saved.exercise.takeAway, Math.max(0, Number.isInteger(saved.dotsRemoved) ? saved.dotsRemoved! : 0));
        setExercise(saved.exercise);
        setDotsAdded(restoredAdded);
        setDotsRemoved(restoredRemoved);
        setPhase(saved.phase!);
        setSelectedEquation(typeof saved.selectedEquation === 'string' ? saved.selectedEquation : null);
        setSelectedAnswer(Number.isInteger(saved.selectedAnswer) ? saved.selectedAnswer! : null);
        setWrongAttempts(Number.isInteger(saved.wrongAttempts) ? Math.max(0, saved.wrongAttempts!) : 0);
      }
    } catch { /* local progress is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ exercise, dotsAdded, dotsRemoved, phase, selectedEquation, selectedAnswer, wrongAttempts })); }
    catch { /* the activity remains usable if storage is unavailable */ }
  }, [dotsAdded, dotsRemoved, exercise, loadedKey, phase, selectedAnswer, selectedEquation, storageKey, wrongAttempts]);

  const addBubble = () => {
    const next = Math.min(exercise.targetCount, dotsAdded + 1);
    setDotsAdded(next);
    if (next === exercise.targetCount) setPhase('removing');
  };

  const removeBubble = () => {
    const next = Math.min(exercise.takeAway, dotsRemoved + 1);
    setDotsRemoved(next);
    if (next === exercise.takeAway) setPhase('equation');
  };

  const checkEquation = () => {
    if (!selectedEquation) return;
    if (selectedEquation === expressions[0]) {
      setFeedback('equation-correct');
      setSelectedAnswer(null);
      setPhase('answering');
    } else {
      setWrongAttempts((count) => count + 1);
      setFeedback('equation');
    }
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) return;
    if (selectedAnswer === total) {
      setFeedback(null);
      setCelebrateCompletion(true);
      setPhase('complete');
    } else {
      setWrongAttempts((count) => count + 1);
      setFeedback('answer');
    }
  };

  const retry = () => {
    setFeedback(null);
    if (feedback === 'equation') setSelectedEquation(null);
    if (feedback === 'answer') setSelectedAnswer(null);
  };

  const newExercise = () => {
    setExercise(nextExercise(exercise));
    setDotsAdded(0);
    setDotsRemoved(0);
    setPhase('building');
    setSelectedEquation(null);
    setSelectedAnswer(null);
    setWrongAttempts(0);
    setFeedback(null);
    setCelebrateCompletion(false);
    setHintOpen(false);
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Subtraction with objects | Practice" description="Practise subtraction by adding and taking away countable objects." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-32 pt-3 text-[#17213C] motion-reduce:scroll-auto sm:pb-10">
      <PageMeta title="Subtraction with objects | Practice" description="Practise subtraction by adding and taking away countable objects." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-3">
          <p className="text-sm font-bold text-[#5145B5]">CE1 · Maths · Calcul mental</p>
          <p className="mt-1 text-sm text-[#667085]">Review and fluency · Subtract within ten · Scored practice · No timer</p>
        </header>

        {phase === 'complete' ? (
          <section aria-labelledby="complete-title" className="relative overflow-hidden rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            {celebrateCompletion && <SubtractionConfetti />}
            <div className="relative z-20">
            <PracticeFeedback status="correct" language="en" points={scoreQuestionWithPenalty(1, Math.max(1, wrongAttempts + 1), true).awardedPoints} />
            <h1 id="complete-title" className="mt-4 text-2xl font-extrabold">{exercise.targetCount} − {exercise.takeAway} = {total}</h1>
            <p className="mt-2 text-[#667085]">You added {exercise.targetCount} {objectName}, then took away {exercise.takeAway}. {total} {subtractionObjectName(object, total)} {total === 1 ? 'remains' : 'remain'}.</p>
            <p className="mt-2 font-bold text-[#087F68]">Score: {scoreQuestionWithPenalty(1, Math.max(1, wrongAttempts + 1), true).awardedPoints} / 1 point</p>
            <button type="button" onClick={newExercise} className="mt-6 min-h-12 rounded-xl bg-[#5145B5] px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try another subtraction</button>
            <p className="mt-4 text-xs text-[#667085]">Your place is saved on this device. This practice does not award mastery.</p>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E4E7EC] bg-white p-4 shadow-sm sm:p-7">
            <div>
              <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">
                {phase === 'building' && `Add ${exercise.targetCount} ${objectName}.`}
                {phase === 'removing' && `Now take away ${exercise.takeAway} ${objectName}.`}
                {phase === 'equation' && `Which subtraction shows what you did?`}
                {phase === 'answering' && `How many ${objectName} are left?`}
              </h1>
              <p className="mt-1 text-sm text-[#667085]">
                {phase === 'building' && `Tap + to add one ${subtractionObjectName(object, 1)} at a time.`}
                {phase === 'removing' && `Tap the minus button to remove one ${subtractionObjectName(object, 1)} at a time.`}
                {phase === 'equation' && `${exercise.targetCount} ${objectName} were there. You took away ${exercise.takeAway}.`}
                {phase === 'answering' && `${exercise.targetCount} − ${exercise.takeAway} = ?`}
              </p>
            </div>

            <div className="mt-4"><SubtractionWithDotsModel targetCount={exercise.targetCount} dotsAdded={dotsAdded} dotsRemoved={dotsRemoved} object={object} seed={exercise.id} showAllRemoved={phase !== 'building'} revealAnswerCount={false} /></div>

            {phase === 'building' && <button type="button" aria-label={`Add one ${subtractionObjectName(object, 1)}`} onClick={addBubble} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#5145B5] bg-white px-3 font-bold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5145B5] text-white"><Plus className="h-5 w-5" /></span>Add one {subtractionObjectName(object, 1)}</button>}

            {phase === 'removing' && <button type="button" aria-label={`Take away one ${subtractionObjectName(object, 1)}`} onClick={removeBubble} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#E6A70A] bg-white px-3 font-bold text-[#8A5A00] hover:bg-[#FFF8E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F2B824] text-[#3B2A00]"><Minus className="h-5 w-5" /></span>Take away one {subtractionObjectName(object, 1)}</button>}

            {phase === 'equation' && <div role="group" aria-label="Choose the subtraction equation" className="mt-4 grid grid-cols-2 gap-3">{expressions.map((expression) => <button key={expression} type="button" aria-pressed={selectedEquation === expression} onClick={() => { setSelectedEquation(expression); setFeedback(null); }} className={`min-h-12 rounded-xl border-2 px-3 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${selectedEquation === expression ? 'border-[#5145B5] bg-[#F0EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F6F5FF]'}`}>{expression}</button>)}</div>}

            {phase === 'answering' && <div role="group" aria-label={`Choose how many remain after ${exercise.targetCount} minus ${exercise.takeAway}`} className="mt-4 grid grid-cols-2 gap-3">{exercise.answerChoices.map((choice) => <button key={choice} type="button" aria-pressed={selectedAnswer === choice} onClick={() => { setSelectedAnswer(choice); setFeedback(null); }} className={`min-h-12 rounded-xl border-2 px-3 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${selectedAnswer === choice ? 'border-[#5145B5] bg-[#F0EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F6F5FF]'}`}>{choice}</button>)}</div>}

            {(phase === 'equation' || phase === 'answering') && <button type="button" onClick={phase === 'equation' ? checkEquation : checkAnswer} disabled={phase === 'equation' ? selectedEquation === null : selectedAnswer === null} className="mt-4 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{phase === 'equation' ? 'Check equation' : 'Check answer'}</button>}

            {feedback === 'equation-correct' && <PracticeFeedback status="correct" language="en" />}

            {(feedback === 'equation' || feedback === 'answer') && <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-[#FFF4E5] p-3 text-sm font-semibold text-[#8A4B08]">
                <p>{feedback === 'equation' ? `Not quite. Think about the number of ${objectName} you started with and how many you took away.` : 'Not quite. Count what remains after taking some away.'}</p>
              <button type="button" onClick={retry} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" />Try again</button>
            </div>}

            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-2 rounded-xl bg-[#FFF8E6] p-3 text-sm text-[#694A00]">First count {exercise.targetCount} {objectName}. Then count what is left after you take away {exercise.takeAway}.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
