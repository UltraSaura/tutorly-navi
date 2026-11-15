import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lightbulb, RotateCcw } from 'lucide-react';
import { AdditionAcrossTenModel } from '@/components/practice/AdditionAcrossTenModel';
import { PageMeta } from '@/components/seo/PageMeta';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { additionAcrossTenTotal, countersToNextTen, createAdditionAcrossTenExercise, isValidAdditionAcrossTenExercise, type AdditionAcrossTenExercise, type AdditionAcrossTenPhase } from '@/features/practice/additionAcrossTen';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const KEY = 'tutorly:practice:addition-across-ten:v1';

type SavedAdditionExercise = {
  exercise?: unknown;
  movedToTen?: number;
  attemptCount?: number;
  phase?: AdditionAcrossTenPhase;
  selectedAnswer?: number | null;
};

function nextDifferentExercise(previous: AdditionAcrossTenExercise) {
  let next = createAdditionAcrossTenExercise();
  for (let attempt = 0; attempt < 8 && additionAcrossTenTotal(next) === additionAcrossTenTotal(previous); attempt += 1) {
    next = createAdditionAcrossTenExercise();
  }
  return next;
}

export default function AdditionAcrossTenPage() {
  const navigate = useNavigate();
  const learner = useLearner();
  const learnerId = learner?.learnerId ?? undefined;
  const storageKey = learnerStorageKey(KEY, learnerId);
  const [exercise, setExercise] = useState<AdditionAcrossTenExercise>(() => createAdditionAcrossTenExercise());
  const [movedToTen, setMovedToTen] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [phase, setPhase] = useState<AdditionAcrossTenPhase>('bridging');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'incorrect' | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requiredMoves = countersToNextTen(exercise.startNumber);
  const total = additionAcrossTenTotal(exercise);
  const remainder = exercise.addend - requiredMoves;
  const nextTen = exercise.startNumber - (exercise.startNumber % 10) + 10;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setLoadedKey(null);
    const fresh = createAdditionAcrossTenExercise();
    setExercise(fresh);
    setMovedToTen(0);
    setAttemptCount(0);
    setPhase('bridging');
    setSelectedAnswer(null);
    setFeedback(null);
    setEntryError(null);
    setHintOpen(false);
    try {
      const stored = localStorage.getItem(storageKey);
      const saved = stored ? JSON.parse(stored) as SavedAdditionExercise : null;
      if (saved && isValidAdditionAcrossTenExercise(saved.exercise)
        && ['bridging', 'answering', 'complete'].includes(String(saved.phase))) {
        const restoredMoves = Number.isInteger(saved.movedToTen)
          ? Math.max(0, Math.min(countersToNextTen(saved.exercise.startNumber), saved.movedToTen!))
          : 0;
        setExercise(saved.exercise);
        setMovedToTen(restoredMoves);
        setAttemptCount(Number.isInteger(saved.attemptCount) ? Math.max(0, saved.attemptCount!) : 0);
        setPhase(saved.phase!);
        setSelectedAnswer(Number.isInteger(saved.selectedAnswer) ? saved.selectedAnswer! : null);
        if (saved.phase !== 'bridging') setMovedToTen(countersToNextTen(saved.exercise.startNumber));
      }
    } catch { /* local progress is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ exercise, movedToTen, attemptCount, phase, selectedAnswer }));
    } catch { /* the activity remains usable if storage is unavailable */ }
  }, [attemptCount, exercise, loadedKey, movedToTen, phase, selectedAnswer, storageKey]);

  const moveCounter = () => {
    const next = Math.min(requiredMoves, movedToTen + 1);
    setMovedToTen(next);
    setEntryError(null);
    if (next >= requiredMoves) setPhase('answering');
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) {
      setEntryError('Choose an answer first.');
      return;
    }
    setAttemptCount((count) => count + 1);
    setEntryError(null);
    if (selectedAnswer === total) {
      setFeedback(null);
      setPhase('complete');
    } else {
      setFeedback('incorrect');
    }
  };

  const retryAnswer = () => {
    setSelectedAnswer(null);
    setFeedback(null);
    setEntryError(null);
  };

  const nextChallenge = () => {
    setExercise(nextDifferentExercise(exercise));
    setMovedToTen(0);
    setAttemptCount(0);
    setPhase('bridging');
    setSelectedAnswer(null);
    setFeedback(null);
    setEntryError(null);
    setHintOpen(false);
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Addition across ten | Practice" description="Practise bridging to the next ten in mental addition." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-32 pt-3 text-[#17213C] motion-reduce:scroll-auto sm:pb-10">
      <PageMeta title="Addition across ten | Practice" description="Practise bridging to the next ten in mental addition." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-3">
          <p className="text-sm font-bold text-[#5145B5]">CE1 · Maths · Calcul mental</p>
          <p className="mt-1 text-sm text-[#667085]">Review and fluency · Addition en ligne · Cross the next ten · Scored practice · No timer</p>
        </header>

        {phase === 'complete' ? (
          <section aria-labelledby="complete-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="complete-title" className="mt-4 text-2xl font-extrabold">{exercise.startNumber} + {exercise.addend} = {total}</h1>
            <p className="mt-2 text-[#667085]">Add {requiredMoves} to reach {nextTen}, then add the {remainder} left: {nextTen} + {remainder} = {total}.</p>
            <p className="mt-2 font-bold text-[#087F68]">Score: {scoreQuestionWithPenalty(1, Math.max(1, attemptCount), true).awardedPoints} / 1 point</p>
            <button type="button" onClick={nextChallenge} className="mt-6 min-h-12 rounded-xl bg-[#5145B5] px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try another addition</button>
            <p className="mt-4 text-xs text-[#667085]">Your place is saved on this device. This practice does not award mastery.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E4E7EC] bg-white p-4 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">Fill the next ten, then choose the total.</h1>
                <p className="mt-1 text-sm text-[#667085]">Move counters from {exercise.addend} until the frame is full.</p>
              </div>
            </div>
            <div className="mt-4"><AdditionAcrossTenModel startNumber={exercise.startNumber} addend={exercise.addend} movedToTen={movedToTen} /></div>

            {phase === 'bridging' ? (
              <button type="button" aria-label="Move one counter to fill the next ten" onClick={moveCounter} className="mt-5 min-h-14 w-full rounded-xl border-2 border-[#5145B5] bg-white px-3 font-bold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">
                <span aria-hidden="true" className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5145B5] text-xl text-white">+</span><span className="sm:hidden">Move one into the frame</span><span className="hidden sm:inline">Move one counter to the ten-frame</span>
              </button>
            ) : (
              <div role="group" aria-label={`Choose the total of ${exercise.startNumber} plus ${exercise.addend}`} className="mt-5 grid grid-cols-2 gap-3">
                {exercise.answerChoices.map((choice) => <button key={choice} type="button" aria-pressed={selectedAnswer === choice} onClick={() => { setSelectedAnswer(choice); setEntryError(null); setFeedback(null); }} className={`min-h-14 rounded-xl border-2 px-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${selectedAnswer === choice ? 'border-[#5145B5] bg-[#F0EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F6F5FF]'}`}>{choice}</button>)}
              </div>
            )}

            {entryError && <p role="alert" className="mt-2 text-sm font-semibold text-[#8A4B08]">{entryError}</p>}
            {feedback === 'incorrect' && <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-[#FFF4E5] p-3 text-sm font-semibold text-[#8A4B08]">
              <p>Not quite. You filled the next ten; add the counters left in the tray.</p>
              <button type="button" onClick={retryAnswer} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Try another answer</button>
            </div>}
            {phase === 'answering' && feedback !== 'incorrect' && <button type="button" onClick={checkAnswer} disabled={selectedAnswer === null} className="mt-4 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>}
            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-1 rounded-xl bg-[#F6F5FF] p-3 text-sm text-[#40369B]">How many more does {exercise.startNumber} need to reach {nextTen}? Move that many first.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
