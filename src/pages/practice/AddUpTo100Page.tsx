import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lightbulb, RotateCcw, Volume2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { countableObjectName, createDifferentCountingExercise, createCountingExercise, CountingExercise, CountingExercisePhase, countingExerciseStart, countingExerciseTotal, isValidCountingExercise } from '@/features/practice/countingExercise';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { CountableObjectModel } from '@/components/practice/CountableObjectModel';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const KEY = 'tutorly:practice:count-objects:v1';

type SavedCountingExercise = {
  exercise?: unknown;
  addedGroups?: number;
  attemptCount?: number;
  phase?: CountingExercisePhase;
  selectedAnswer?: number | null;
};

const isCountingExercisePhase = (phase: unknown): phase is CountingExercisePhase => phase === 'adding' || phase === 'choosing' || phase === 'complete';

export default function AddUpTo100Page() {
  const navigate = useNavigate();
  const learner = useLearner();
  const learnerId = learner?.learnerId ?? undefined;
  const storageKey = learnerStorageKey(KEY, learnerId);
  const [exercise, setExercise] = useState<CountingExercise>(() => createCountingExercise());
  const [addedGroups, setAddedGroups] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [phase, setPhase] = useState<CountingExercisePhase>('adding');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'incorrect' | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({ lang: 'en' });

  const startingValue = countingExerciseStart(exercise);
  const currentValue = startingValue + addedGroups * 10;
  const total = countingExerciseTotal(exercise);
  const objectName = countableObjectName(exercise.object, total);
  const prompt = phase === 'adding'
    ? `Start with ${startingValue} ${countableObjectName(exercise.object, startingValue)}. Add ${exercise.groupsToAdd} ${exercise.groupsToAdd === 1 ? 'group' : 'groups'} of ten.`
    : `How many ${objectName} are there altogether?`;

  useEffect(() => { stop(); }, [phase, stop]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setLoadedKey(null);
    const freshExercise = createCountingExercise();
    setExercise(freshExercise);
    setAddedGroups(0);
    setAttemptCount(0);
    setPhase('adding');
    setSelectedAnswer(null);
    setFeedback(null);
    setEntryError(null);
    setHintOpen(false);
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as SavedCountingExercise : null;
      if (parsed && isValidCountingExercise(parsed.exercise) && isCountingExercisePhase(parsed.phase)) {
        const restoredAddedGroups = Number.isInteger(parsed.addedGroups)
          ? Math.max(0, Math.min(parsed.exercise.groupsToAdd, parsed.addedGroups!))
          : 0;
        setExercise(parsed.exercise);
        setAddedGroups(restoredAddedGroups);
        setAttemptCount(Number.isInteger(parsed.attemptCount) ? Math.max(0, parsed.attemptCount!) : 0);
        setPhase(parsed.phase);
        setSelectedAnswer(Number.isInteger(parsed.selectedAnswer) ? parsed.selectedAnswer! : null);
        if (parsed.phase === 'choosing' && restoredAddedGroups < parsed.exercise.groupsToAdd) {
          setAddedGroups(parsed.exercise.groupsToAdd);
        }
      }
    } catch { /* local progress is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ exercise, addedGroups, attemptCount, phase, selectedAnswer }));
    } catch { /* the activity remains usable if storage is unavailable */ }
  }, [addedGroups, attemptCount, exercise, loadedKey, phase, selectedAnswer, storageKey]);

  const addBundle = () => {
    const nextAddedGroups = Math.min(exercise.groupsToAdd, addedGroups + 1);
    setAddedGroups(nextAddedGroups);
    setEntryError(null);
    if (nextAddedGroups >= exercise.groupsToAdd) setPhase('choosing');
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) {
      setEntryError('Choose one of the numbers first.');
      return;
    }
    setEntryError(null);
    setAttemptCount((count) => count + 1);
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
    setExercise(createDifferentCountingExercise(exercise));
    setAddedGroups(0);
    setAttemptCount(0);
    setPhase('adding');
    setSelectedAnswer(null);
    setFeedback(null);
    setEntryError(null);
    setHintOpen(false);
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Count objects | Practice" description="Practise counting objects in groups of ten and ones." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-32 pt-5 text-[#17213C] motion-reduce:scroll-auto sm:pb-10">
      <PageMeta title="Count objects | Practice" description="Practise counting objects in groups of ten and ones." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice
        </button>
        <header className="mb-5">
          <p className="text-sm font-bold text-[#5145B5]">Maths · Count to 100</p>
          {phase !== 'complete' && <p className="mt-1 text-sm text-[#667085]">Count objects in groups of ten · Scored practice · No timer</p>}
        </header>

        {phase === 'complete' ? (
          <section aria-labelledby="complete-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="complete-title" className="mt-4 text-2xl font-extrabold">You counted {total} {objectName}.</h1>
            <p className="mt-2 text-[#667085]">{startingValue} plus {exercise.groupsToAdd} {exercise.groupsToAdd === 1 ? 'group' : 'groups'} of ten makes {total}.</p>
            <p className="mt-2 font-bold text-[#087F68]">Score: {scoreQuestionWithPenalty(1, Math.max(1, attemptCount), true).awardedPoints} / 1 point</p>
            <button type="button" onClick={nextChallenge} className="mt-6 min-h-12 rounded-xl bg-[#5145B5] px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try another count</button>
            <p className="mt-4 text-xs text-[#667085]">Your place is saved on this device. This practice does not award mastery.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">{prompt}</h1>
              {isSupported && <button type="button" onClick={() => isSpeaking ? stop() : speak(prompt)} aria-label={isSpeaking ? 'Stop reading instruction' : 'Read instruction aloud'} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Volume2 className="h-5 w-5" aria-hidden="true" /></button>}
            </div>
            <div className="mt-5"><CountableObjectModel object={exercise.object} value={currentValue} /></div>

            {phase === 'adding' ? (
              <button type="button" aria-label={`Add one group of ten ${countableObjectName(exercise.object, 10)}`} onClick={addBundle} className="mt-5 min-h-14 w-full rounded-xl border-2 border-[#5145B5] bg-white px-3 font-bold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">
                <span aria-hidden="true" className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5145B5] text-xl text-white">+</span>
                Add one group of ten
              </button>
            ) : (
              <div role="group" aria-label={`Choose how many ${objectName} there are`} className="mt-5 grid grid-cols-2 gap-3">
                {exercise.answerChoices.map((choice) => (
                  <button key={choice} type="button" aria-label={`${choice} ${countableObjectName(exercise.object, choice)}`} aria-pressed={selectedAnswer === choice} onClick={() => { setSelectedAnswer(choice); setEntryError(null); setFeedback(null); }} className={`min-h-14 rounded-xl border-2 px-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${selectedAnswer === choice ? 'border-[#5145B5] bg-[#F0EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F6F5FF]'}`}>
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {entryError && <p role="alert" className="mt-2 text-sm font-semibold text-[#8A4B08]">{entryError}</p>}
            {feedback === 'incorrect' && <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-[#FFF4E5] p-3 text-sm font-semibold text-[#8A4B08]">
              <p>Not quite. Count ten objects in each group, then count the single ones.</p>
              <button type="button" onClick={retryAnswer} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Try another answer</button>
            </div>}
            {phase === 'choosing' && feedback !== 'incorrect' && <button type="button" onClick={checkAnswer} className="mt-4 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Check answer</button>}
            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Lightbulb className="h-4 w-4" aria-hidden="true" /> {hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-1 rounded-xl bg-[#F6F5FF] p-3 text-sm text-[#40369B]">Each outlined group has ten. Count the single ones, then count on the groups you added.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
