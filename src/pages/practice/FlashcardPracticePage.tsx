import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, Lightbulb, RotateCcw } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { ARITHMETIC_FLASHCARDS } from '@/features/practice/flashcardPractice';

const KEY = 'tutorly:practice:arithmetic-flashcards';

export default function FlashcardPracticePage() {
  const navigate = useNavigate();
  const { learnerId } = useLearner();
  const storageKey = learnerStorageKey(KEY, learnerId);
  const [cardIndex, setCardIndex] = useState(0);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const complete = cardIndex >= ARITHMETIC_FLASHCARDS.length;
  const card = ARITHMETIC_FLASHCARDS[cardIndex];
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setLoadedKey(null);
    setCardIndex(0);
    setResult(null);
    setHintOpen(false);
    setElapsedSeconds(0);
    setStartedAt(null);
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as { cardIndex?: number; complete?: boolean; elapsedSeconds?: number } : null;
      const savedElapsed = Math.max(0, Number(parsed?.elapsedSeconds) || 0);
      setElapsedSeconds(savedElapsed);
      if (!parsed?.complete) setStartedAt(Date.now() - savedElapsed * 1000);
      if (parsed?.complete) setCardIndex(ARITHMETIC_FLASHCARDS.length);
      else if (Number.isInteger(parsed?.cardIndex)) setCardIndex(Math.max(0, Math.min(parsed!.cardIndex!, ARITHMETIC_FLASHCARDS.length - 1)));
    } catch { /* local resume is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (startedAt === null || complete) return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [complete, startedAt]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        cardIndex: Math.min(cardIndex, ARITHMETIC_FLASHCARDS.length - 1),
        complete,
        elapsedSeconds,
      }));
    } catch { /* keep the cards usable if storage is unavailable */ }
  }, [cardIndex, complete, elapsedSeconds, loadedKey, storageKey]);

  const choose = (choice: number) => {
    if (result !== null) return;
    setResult(choice === card.answer ? 'correct' : 'incorrect');
  };
  const nextCard = () => {
    setCardIndex((index) => index + 1);
    setResult(null);
    setHintOpen(false);
  };
  const restart = () => {
    setCardIndex(0);
    setResult(null);
    setHintOpen(false);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
  };

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Number flashcards | Practice" description="Practise small addition and subtraction problems one card at a time." /><p role="status" className="mx-auto max-w-xl">Loading your saved place…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-10 pt-5 text-[#17213C] motion-reduce:scroll-auto">
      <PageMeta title="Number flashcards | Practice" description="Practise small addition and subtraction problems one card at a time." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-5">
          <p className="text-sm font-bold text-[#087F68]">Maths · Number flashcards</p>
          {!complete && <p className="mt-1 flex items-center gap-2 text-sm text-[#667085]"><span>Card {cardIndex + 1} of {ARITHMETIC_FLASHCARDS.length}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1 tabular-nums" aria-label={`Elapsed time ${formatTime(elapsedSeconds)}`}><Clock3 className="h-4 w-4" aria-hidden="true" />{formatTime(elapsedSeconds)}</span></p>}
        </header>

        {complete ? (
          <section aria-labelledby="flashcard-complete-title" className="rounded-3xl border border-[#D8EBE5] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
            <h1 id="flashcard-complete-title" className="mt-4 text-2xl font-extrabold">Practice complete</h1>
            <p className="mt-2 text-[#667085]">You reached the end of this set in {formatTime(elapsedSeconds)}. Try it again whenever you want more practice.</p>
            <button type="button" onClick={restart} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D0D5DD] px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Practise again</button>
            <p className="mt-4 text-xs text-[#667085]">Your place is saved on this device. This practice set does not award a score or mastery.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#D8EBE5] bg-white p-5 shadow-sm sm:p-7">
            <p className="mb-3 text-sm font-semibold text-[#667085]">Solve the problem:</p>
            <div className="flex min-h-36 items-center justify-center rounded-2xl bg-[#F2F8F6] px-4 py-7 text-center" aria-live="polite">
              <h1 className="text-4xl font-extrabold tracking-wide tabular-nums sm:text-5xl">{card.prompt}</h1>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Choose an answer">
              {card.choices.map((choice) => <button key={choice} type="button" onClick={() => choose(choice)} disabled={result !== null} className={`min-h-14 rounded-xl border-2 px-4 text-xl font-extrabold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] ${result === 'correct' && choice === card.answer ? 'border-[#12A879] bg-[#E7F7F0] text-[#087F68]' : 'border-[#D0D5DD] bg-white text-[#17213C] hover:border-[#087F68]'}`}>{choice}</button>)}
            </div>
            {result ? (
              <div role="status" aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${result === 'correct' ? 'bg-[#E7F7F0] text-[#087F68]' : 'bg-[#FFF4E5] text-[#8A4B08]'}`}>
                {result === 'correct' ? <><p>That’s right.</p><p className="mt-1 font-medium">{card.explanation}</p><button type="button" onClick={nextCard} className="mt-3 min-h-11 rounded-lg bg-[#087F68] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">{cardIndex + 1 === ARITHMETIC_FLASHCARDS.length ? 'Finish set' : 'Next card'}</button></> : <><p>{card.retryFeedback}</p><button type="button" onClick={() => setResult(null)} className="mt-2 min-h-11 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]">Try again</button></>}
              </div>
            ) : null}
            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#087F68] hover:bg-[#F2F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><Lightbulb className="h-4 w-4" aria-hidden="true" /> {hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-1 rounded-xl bg-[#F2F8F6] p-3 text-sm text-[#075B4B]">{card.hint}</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
