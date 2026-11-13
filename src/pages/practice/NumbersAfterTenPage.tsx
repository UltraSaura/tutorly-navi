import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw, Volume2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { CountableDotModel } from '@/components/practice/CountableDotModel';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { isCorrectNumberAfterTen, NUMBERS_AFTER_TEN_STEPS } from '@/features/practice/numbersAfterTen';
import { nextAddUpValue } from '@/features/practice/addUpTo100';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

const KEY = 'tutorly:practice:numbers-after-ten';

export default function NumbersAfterTenPage() {
  const navigate = useNavigate();
  const { learnerId } = useLearner();
  const storageKey = learnerStorageKey(KEY, learnerId);
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({ lang: 'en' });
  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState(10);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const isComplete = stepIndex >= NUMBERS_AFTER_TEN_STEPS.length;
  const step = NUMBERS_AFTER_TEN_STEPS[stepIndex];

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { stop(); }, [stop, stepIndex]);

  useEffect(() => {
    setLoadedKey(null);
    setStepIndex(0);
    setValue(10);
    setFeedback(null);
    setHintOpen(false);
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as { stepIndex?: number; value?: number; completed?: boolean } : null;
      if (parsed?.completed) setStepIndex(NUMBERS_AFTER_TEN_STEPS.length);
      else if (parsed && Number.isInteger(parsed.stepIndex) && parsed.stepIndex! >= 0 && parsed.stepIndex! < NUMBERS_AFTER_TEN_STEPS.length) {
        setStepIndex(parsed.stepIndex!);
        setValue(Math.max(10, Math.min(NUMBERS_AFTER_TEN_STEPS[parsed.stepIndex!].target, Number(parsed.value) || 10)));
      }
    } catch { /* local progress is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ stepIndex: Math.min(stepIndex, NUMBERS_AFTER_TEN_STEPS.length - 1), value, completed: isComplete }));
    } catch { /* keep the activity usable when storage is unavailable */ }
  }, [isComplete, loadedKey, stepIndex, storageKey, value]);

  const check = () => setFeedback(isCorrectNumberAfterTen(step.target, value) ? 'correct' : 'incorrect');
  const nextStep = () => {
    setStepIndex((current) => current + 1);
    setValue(10);
    setFeedback(null);
    setHintOpen(false);
  };
  const restart = () => {
    setStepIndex(0);
    setValue(10);
    setFeedback(null);
    setHintOpen(false);
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Numbers after ten | Practice" description="See how a ten and extra ones make numbers after ten." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-10 pt-5 text-[#17213C] motion-reduce:scroll-auto">
      <PageMeta title="Numbers after ten | Practice" description="See how a ten and extra ones make numbers after ten." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-5">
          <p className="text-sm font-bold text-[#5145B5]">Maths · Numbers after ten</p>
          {!isComplete && <p className="mt-1 text-sm text-[#667085]">Guided lesson · Step {stepIndex + 1} of {NUMBERS_AFTER_TEN_STEPS.length}</p>}
        </header>

        {isComplete ? (
          <section aria-labelledby="numbers-complete-title" className="rounded-3xl border border-[#D9DDF8] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="numbers-complete-title" className="mt-4 text-2xl font-extrabold">Lesson complete</h1>
            <p className="mt-2 text-[#667085]">A full group of ten plus extra ones makes a number after ten.</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <button type="button" onClick={() => navigate('/practice/add-up-to-100')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5145B5] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try counting objects <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
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
            <div className="mt-5"><CountableDotModel value={value} maximum={20} /></div>
            <button type="button" disabled={value >= step.target} onClick={() => { setValue((current) => nextAddUpValue(current, 1, step.target)); setFeedback(null); }} className="mt-5 min-h-12 w-full rounded-xl border-2 border-[#5145B5] bg-white px-4 font-bold text-[#5145B5] hover:bg-[#F6F5FF] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]">Add 1</button>
            {feedback && <div role="status" aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${feedback === 'correct' ? 'bg-[#E7F7F0] text-[#087F68]' : 'bg-[#FFF4E5] text-[#8A4B08]'}`}>
              {feedback === 'correct' ? <><p>That’s right.</p><p className="mt-1 font-medium">{step.explanation}</p><button type="button" onClick={nextStep} className="mt-3 min-h-11 rounded-lg bg-[#087F68] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">{stepIndex + 1 === NUMBERS_AFTER_TEN_STEPS.length ? 'Finish lesson' : 'Continue'}</button></> : <><p>Not quite. Add single dots to the group of ten, then check again.</p><p className="mt-1 font-medium">{step.explanation}</p><button type="button" onClick={() => { setValue(10); setFeedback(null); }} className="mt-2 min-h-11 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" /> Retry this step</button></>}
            </div>}
            {!feedback && <button type="button" onClick={check} className="mt-3 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Check answer</button>}
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
