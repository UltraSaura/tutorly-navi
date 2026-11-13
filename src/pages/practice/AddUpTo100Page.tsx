import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw, Volume2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { ADD_UP_TO_100_STEPS, isCorrectAddUpAnswer, nextAddUpValue } from '@/features/practice/addUpTo100';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { CountableDotModel } from '@/components/practice/CountableDotModel';

const KEY = 'tutorly:practice:add-up-to-100:v3';

export default function AddUpTo100Page() {
  const navigate = useNavigate();
  const learner = useLearner();
  const learnerId = learner?.learnerId ?? undefined;
  const storageKey = learnerStorageKey(KEY, learnerId);
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({ lang: 'en' });
  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState(ADD_UP_TO_100_STEPS[0].start);
  const [answer, setAnswer] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState<'recall' | 'guided' | null>(null);
  const [showGuidedOffer, setShowGuidedOffer] = useState(false);
  const step = ADD_UP_TO_100_STEPS[stepIndex];
  const isComplete = stepIndex >= ADD_UP_TO_100_STEPS.length;

  useEffect(() => {
    stop();
  }, [pathMode, stop, stepIndex]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setLoadedKey(null);
    setStepIndex(0);
    setValue(ADD_UP_TO_100_STEPS[0].start);
    setPathMode(null);
    setShowGuidedOffer(false);
    setAnswer('');
    setEntryError(null);
    setFeedback(null);
    setHintOpen(false);
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as { stepIndex?: number; value?: number; completed?: boolean; pathMode?: 'recall' | 'guided' | null; showGuidedOffer?: boolean } : null;
      if (parsed?.pathMode) setPathMode(parsed.pathMode);
      if (parsed?.showGuidedOffer) setShowGuidedOffer(true);
      if (parsed?.completed) setStepIndex(ADD_UP_TO_100_STEPS.length);
      else if (parsed && Number.isInteger(parsed.stepIndex) && parsed.stepIndex! >= 0 && parsed.stepIndex! < ADD_UP_TO_100_STEPS.length) {
        const restoredStep = ADD_UP_TO_100_STEPS[parsed.stepIndex!];
        setStepIndex(parsed.stepIndex!);
        setValue(Math.max(restoredStep.start, Math.min(restoredStep.target, Number(parsed.value) || restoredStep.start)));
      }
    } catch { /* local progress is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        stepIndex: Math.min(stepIndex, ADD_UP_TO_100_STEPS.length - 1),
        value,
        completed: isComplete,
        pathMode,
        showGuidedOffer,
      }));
    } catch { /* lesson remains usable if storage is unavailable */ }
  }, [isComplete, loadedKey, pathMode, showGuidedOffer, stepIndex, storageKey, value]);

  const resetStep = () => {
    setValue(step.start);
    setAnswer('');
    setEntryError(null);
    setFeedback(null);
  };

  const check = () => {
    let current = value;
    if (step.mode === 'choice') {
      if (!answer) {
        setEntryError('Choose an answer before checking.');
        return;
      }
      current = Number(answer);
    }
    if (step.mode === 'answer') {
      const response = answer.trim();
      if (!response) {
        setEntryError('Enter a whole number before checking.');
        return;
      }
      if (!/^[+-]?\d+$/.test(response)) {
        setEntryError('Use a whole number, such as 30.');
        return;
      }
      current = Number(response);
    }
    setEntryError(null);
    if (isCorrectAddUpAnswer(step, current)) setFeedback('correct');
    else setFeedback('incorrect');
  };

  const addToModel = (amount: 1 | 10) => {
    const nextValue = nextAddUpValue(value, amount, step.target);
    setFeedback(null);
    setEntryError(null);
    if (step.mode === 'tens' && nextValue >= step.target && stepIndex + 1 < ADD_UP_TO_100_STEPS.length) {
      const nextStep = ADD_UP_TO_100_STEPS[stepIndex + 1];
      setStepIndex((index) => index + 1);
      setValue(nextStep.start);
      setAnswer('');
      setHintOpen(false);
      return;
    }
    setValue(nextValue);
  };

  const continueLesson = () => {
    if (stepIndex + 1 >= ADD_UP_TO_100_STEPS.length && pathMode === 'recall') {
      setShowGuidedOffer(true);
      setFeedback(null);
      return;
    }
    if (stepIndex + 1 >= ADD_UP_TO_100_STEPS.length) {
      setStepIndex(ADD_UP_TO_100_STEPS.length);
      return;
    }
    const next = ADD_UP_TO_100_STEPS[stepIndex + 1];
    setStepIndex(stepIndex + 1);
    setValue(next.start);
    setAnswer('');
    setEntryError(null);
    setFeedback(null);
    setHintOpen(false);
  };

  const restart = () => {
    setStepIndex(0);
    setValue(ADD_UP_TO_100_STEPS[0].start);
    setPathMode('guided');
    setShowGuidedOffer(false);
    setAnswer('');
    setEntryError(null);
    setFeedback(null);
    setHintOpen(false);
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Add up to 100 | Practice" description="Build numbers with groups of ten and single dots." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-10 pt-5 text-[#17213C] motion-reduce:scroll-auto">
      <PageMeta title="Add up to 100 | Practice" description="Build numbers with groups of ten and single dots." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice
        </button>
        <header className="mb-5">
          <p className="text-sm font-bold text-[#5145B5]">Maths · Add up to 100</p>
          {!isComplete && pathMode && !showGuidedOffer && <p className="mt-1 text-sm text-[#667085]">{pathMode === 'recall' ? 'Recall check' : 'Guided lesson'} · Step {stepIndex + 1} of {ADD_UP_TO_100_STEPS.length}</p>}
        </header>

        {!pathMode ? (
          <section aria-labelledby="start-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 shadow-sm sm:p-8">
            <h1 id="start-title" className="text-2xl font-extrabold">Add up to 100</h1>
            <p className="mt-2 text-[#667085]">First, try a short check using grouped dots. You can ask for help at any step.</p>
            <button type="button" onClick={() => { setPathMode('recall'); setShowGuidedOffer(false); }} className="mt-6 min-h-14 w-full rounded-xl bg-[#5145B5] px-4 py-3 text-left font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">Start the check</button>
            <p className="mt-4 text-xs text-[#667085]">This check is untimed and does not award mastery.</p>
          </section>
        ) : showGuidedOffer ? (
          <section aria-labelledby="recall-complete-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="recall-complete-title" className="mt-4 text-2xl font-extrabold">Recall check complete</h1>
            <p className="mt-2 text-[#667085]">Ready to work through the ideas together? You can start at the beginning.</p>
            <button type="button" onClick={restart} className="mt-6 min-h-11 rounded-xl bg-[#5145B5] px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Start from the beginning</button>
          </section>
        ) : isComplete ? (
          <section aria-labelledby="complete-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="complete-title" className="mt-4 text-2xl font-extrabold">Lesson complete</h1>
            <p className="mt-2 text-[#667085]">You built numbers with tens and ones, then used the same idea to solve an addition.</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <button type="button" onClick={() => navigate('/practice/numbers-after-ten')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5145B5] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try numbers after ten <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D0D5DD] px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again</button>
            </div>
            <p className="mt-4 text-xs text-[#667085]">Your place is saved on this device.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">{step.prompt}</h1>
              {isSupported && <button type="button" onClick={() => isSpeaking ? stop() : speak(step.prompt)} aria-label={isSpeaking ? 'Stop reading instruction' : 'Read instruction aloud'} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Volume2 className="h-5 w-5" aria-hidden="true" /></button>}
            </div>
            <div className="mt-5"><CountableDotModel value={value} showTotal={false} /></div>

            <div className="mt-5">
              {step.mode === 'answer' ? (
                <label className="block text-sm font-semibold">Your answer
                  <input type="number" inputMode="numeric" value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback(null); setEntryError(null); }} onKeyDown={(event) => { if (event.key === 'Enter') check(); }} className="mt-2 min-h-12 w-full rounded-xl border border-[#D0D5DD] px-4 text-lg font-bold focus:border-[#5145B5] focus:outline-none focus:ring-2 focus:ring-[#5145B5]/25" aria-label="Your answer" aria-describedby={entryError ? 'lesson-entry-error' : undefined} />
                </label>
              ) : step.mode === 'choice' ? (
                <div role="group" aria-label="Choose an answer" className="grid grid-cols-2 gap-3">
                  {step.choices?.map((choice) => (
                    <button key={choice} type="button" aria-pressed={answer === String(choice)} onClick={() => { setAnswer(String(choice)); setEntryError(null); setFeedback(null); }} className={`min-h-14 rounded-xl border-2 px-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${answer === String(choice) ? 'border-[#5145B5] bg-[#F0EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F6F5FF]'}`}>
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3">
                  {(step.mode === 'tens' || step.mode === 'both') && <button type="button" aria-label="Add one group of ten" disabled={value >= step.target} onClick={() => addToModel(10)} className="min-h-14 flex-1 rounded-xl border-2 border-[#5145B5] bg-white px-3 font-bold text-[#5145B5] hover:bg-[#F6F5FF] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><span aria-hidden="true" className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5145B5] text-xl text-white">+</span>Add 10</button>}
                  {(step.mode === 'ones' || step.mode === 'both') && <button type="button" disabled={value >= step.target} onClick={() => addToModel(1)} className="min-h-12 flex-1 rounded-xl border-2 border-[#D99A2B] bg-white px-3 font-bold text-[#8A5B09] hover:bg-[#FFF9EB] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99A2B]">Add 1</button>}
                </div>
              )}
            </div>

            {entryError && <p id="lesson-entry-error" role="alert" className="mt-2 text-sm font-semibold text-[#8A4B08]">{entryError}</p>}
            {feedback && <div role="status" aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${feedback === 'correct' ? 'bg-[#E7F7F0] text-[#087F68]' : 'bg-[#FFF4E5] text-[#8A4B08]'}`}>
              {feedback === 'correct' ? <><p>That’s right.</p><p className="mt-1 font-medium">{step.explanation}</p><button type="button" onClick={continueLesson} className="mt-3 min-h-11 rounded-lg bg-[#087F68] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">{stepIndex + 1 === ADD_UP_TO_100_STEPS.length && pathMode === 'guided' ? 'Finish lesson' : 'Continue'}</button></> : <><p>Not quite yet. {step.mode === 'choice' ? 'Choose another answer, then check again.' : step.mode === 'answer' ? 'Check the dots and try another answer.' : 'Adjust the dots, then check again.'}</p><p className="mt-1 font-medium">{step.explanation}</p><button type="button" onClick={resetStep} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry this step</button></>}
            </div>}

            {!feedback && step.mode !== 'tens' && <button type="button" onClick={check} className="mt-4 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Check answer</button>}
            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Lightbulb className="h-4 w-4" aria-hidden="true" /> {hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-1 rounded-xl bg-[#F6F5FF] p-3 text-sm text-[#40369B]">{step.hint}</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
