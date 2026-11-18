import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, RotateCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageMeta } from '@/components/seo/PageMeta';
import { PracticeFeedback } from '@/components/practice/PracticeFeedback';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { createClockExercise, isClockExercise, oneHourLater, type ClockExercise } from '@/features/practice/oneHourLater';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const STORAGE_KEY = 'tutorly:practice:one-hour-later:v1';
type SavedPractice = { exercise?: unknown; selectedHour?: number | null; phase?: 'answering' | 'complete'; wrongAttempts?: number };
type LoadedPractice = { exercise: ClockExercise; selectedHour: number | null; phase: 'answering' | 'complete'; wrongAttempts: number };
const CONFETTI_COLORS = ['#12C6A0', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];

function ClockFace({ hour }: { hour: number }) {
  const center = 120;
  const faceRadius = 102;
  const point = (angle: number, radius: number) => {
    const radians = (angle * 30 - 90) * Math.PI / 180;
    return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
  };
  const minutePoint = point(0, 65);
  const hourPoint = point(hour % 12, 50);
  const labelPositions = Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return { value, ...point(value % 12, 80) };
  });
  const ticks = Array.from({ length: 60 }, (_, index) => {
    const outer = point(index / 5, 94);
    const inner = point(index / 5, index % 5 === 0 ? 84 : 89);
    return { index, outer, inner, major: index % 5 === 0 };
  });

  return (
    <div className="mx-auto w-full max-w-[250px] rounded-full bg-[#F4F2FF] p-3 sm:max-w-[330px] sm:p-4">
      <svg viewBox="0 0 240 240" role="img" aria-label={`Analogue clock showing ${hour} o’clock. The short purple hand shows hours; the long green hand shows minutes.`} className="block h-auto w-full">
        <circle cx={center} cy={center} r={faceRadius} fill="#FFFFFF" stroke="#5145B5" strokeWidth="3" />
        {ticks.map(({ index, outer, inner, major }) => <line key={index} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={major ? '#667085' : '#D0D5DD'} strokeWidth={major ? 2.5 : 1.3} strokeLinecap="round" />)}
        {labelPositions.map(({ value, x, y }) => <text key={value} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill="#17213C">{value}</text>)}
        <line x1={center} y1={center} x2={hourPoint.x} y2={hourPoint.y} stroke="#5145B5" strokeWidth="8" strokeLinecap="round" />
        <line x1={center} y1={center} x2={minutePoint.x} y2={minutePoint.y} stroke="#12A879" strokeWidth="5" strokeLinecap="round" />
        <circle cx={center} cy={center} r="6" fill="#17213C" />
        <circle cx={center} cy={center} r="2.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

function ClockConfetti() {
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: 6 + ((index * 41) % 88),
    drift: (index % 2 === 0 ? -1 : 1) * (24 + (index * 19) % 78),
    fall: 90 + (index % 5) * 24,
    rotate: (index * 47) % 360,
    delay: (index % 6) * 0.025,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 5 + (index % 4) * 2,
  })), []);
  return <div data-testid="clock-practice-confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl">{pieces.map((piece) => <motion.span key={piece.id} initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }} animate={{ opacity: 0, x: piece.drift, y: piece.fall, rotate: piece.rotate }} transition={{ duration: 1.05, delay: piece.delay, ease: 'easeOut' }} className="absolute top-[12%] block rounded-sm" style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * 0.65, backgroundColor: piece.color }} />)}</div>;
}

function readSavedPractice(key: string): LoadedPractice | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as SavedPractice | null;
    if (!value || !isClockExercise(value.exercise)) return null;
    const phase = value.phase === 'complete' ? 'complete' : 'answering';
    const selectedHour = value.selectedHour === null || value.selectedHour === undefined ? null : value.exercise.choices.includes(value.selectedHour) ? value.selectedHour : null;
    const wrongAttempts = Number.isInteger(value.wrongAttempts) ? Math.max(0, Math.min(10, value.wrongAttempts ?? 0)) : 0;
    return { exercise: value.exercise, phase, selectedHour, wrongAttempts };
  } catch { return null; }
}

export default function OneHourLaterPracticePage() {
  const navigate = useNavigate();
  const learner = useLearner();
  const reduceMotion = useReducedMotion();
  const storageKey = learnerStorageKey(STORAGE_KEY, learner?.learnerId ?? undefined);
  const [exercise, setExercise] = useState<ClockExercise>(() => createClockExercise());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [phase, setPhase] = useState<'answering' | 'complete'>('answering');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const answer = oneHourLater(exercise.startHour);

  useEffect(() => {
    setLoadedKey(null);
    const saved = readSavedPractice(storageKey);
    setExercise(saved?.exercise ?? createClockExercise());
    setSelectedHour(saved?.selectedHour ?? null);
    setPhase(saved?.phase ?? 'answering');
    setWrongAttempts(saved?.wrongAttempts ?? 0);
    setHintOpen(false);
    setIncorrect(false);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ exercise, selectedHour, phase, wrongAttempts } satisfies SavedPractice)); } catch { /* Keep the practice available if local storage is disabled. */ }
  }, [exercise, loadedKey, phase, selectedHour, storageKey, wrongAttempts]);

  const choose = (hour: number) => {
    if (phase !== 'answering') return;
    setSelectedHour(hour);
    setIncorrect(false);
  };
  const checkAnswer = () => {
    if (selectedHour === null || phase !== 'answering') return;
    if (selectedHour === answer) {
      setPhase('complete');
      setIncorrect(false);
    } else {
      setWrongAttempts((current) => current + 1);
      setIncorrect(true);
    }
  };
  const retry = () => {
    setSelectedHour(null);
    setIncorrect(false);
  };
  const newExercise = () => {
    setExercise(createClockExercise());
    setSelectedHour(null);
    setPhase('answering');
    setWrongAttempts(0);
    setHintOpen(false);
    setIncorrect(false);
  };
  const score = scoreQuestionWithPenalty(1, Math.max(1, wrongAttempts + 1), true).awardedPoints;

  if (loadedKey !== storageKey) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="One hour later | Practice" description="Read an analogue clock and work out what time it will be one hour later." /><p role="status" className="mx-auto max-w-xl">Loading your saved practice…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-32 pt-5 text-[#17213C] sm:pb-10">
      <PageMeta title="One hour later | Practice" description="Read an analogue clock and work out what time it will be one hour later." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-4">
          <p className="text-sm font-bold text-[#5145B5]">Maths · Time and durations</p>
          <h1 className="mt-1 text-2xl font-extrabold">One hour later</h1>
        </header>

        {phase === 'complete' ? (
          <section aria-labelledby="clock-complete-title" className="relative overflow-hidden rounded-3xl border border-[#BCEFE3] bg-white p-5 text-center shadow-sm sm:p-7">
            {!reduceMotion && <ClockConfetti />}
            <div className="relative z-20">
              <PracticeFeedback status="correct" language="en" points={score} />
              <h2 id="clock-complete-title" className="text-2xl font-extrabold">That’s one hour later!</h2>
              <p className="mt-2 text-[#475467]">The minute hand stays at 12. Move the short hand forward one number: {exercise.startHour} o’clock becomes {answer} o’clock.</p>
              <div className="my-4"><ClockFace hour={answer} /></div>
              <p className="font-bold text-[#087F68]">Score: {score} / 1 point</p>
              <button type="button" onClick={newExercise} className="mt-5 min-h-12 rounded-xl bg-[#5145B5] px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Try another time</button>
              <p className="mt-4 text-xs text-[#667085]">Your current place is saved on this device. This practice does not mark a lesson as mastered.</p>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E4E7EC] bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">One hour after {exercise.startHour} o’clock?</h2>
            <div className="my-4"><ClockFace hour={exercise.startHour} /></div>
            <div role="group" aria-label="Choose the time one hour later" className="grid grid-cols-2 gap-3">
              {exercise.choices.map((hour) => <button key={hour} type="button" aria-pressed={selectedHour === hour} onClick={() => choose(hour)} className={`min-h-12 rounded-xl border-2 px-3 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] ${selectedHour === hour ? 'border-[#5145B5] bg-[#F2EEFF] text-[#40369B]' : 'border-[#D0D5DD] bg-white hover:bg-[#F8F7FF]'}`}>{hour} o’clock</button>)}
            </div>
            <button type="button" onClick={checkAnswer} disabled={selectedHour === null} className="mt-4 min-h-12 w-full rounded-xl bg-[#5145B5] px-4 font-bold text-white hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>
            {incorrect && <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-[#FFF4E5] p-3 text-sm font-semibold text-[#8A4B08]">
              <p>Not quite. The long hand stays on 12 for an exact hour. Move the short hand forward by one number.</p>
              <button type="button" onClick={retry} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><RotateCcw className="h-4 w-4" aria-hidden="true" />Try again</button>
            </div>}
            <div className="mt-3">
              <button type="button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5145B5] hover:bg-[#F6F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5]"><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintOpen ? 'Hide hint' : 'Show hint'}</button>
              {hintOpen && <p className="mt-1 rounded-xl bg-[#FFF8E6] p-3 text-sm text-[#694A00]">Look at the short hour hand. At an exact hour, the long minute hand points to 12. One hour later, the short hand moves forward by one number.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
