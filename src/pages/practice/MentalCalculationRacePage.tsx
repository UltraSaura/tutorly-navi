import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageMeta } from '@/components/seo/PageMeta';
import { PracticeFeedback } from '@/components/practice/PracticeFeedback';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { useStudentCurriculum } from '@/hooks/useStudentCurriculum';
import { supabase } from '@/integrations/supabase/client';
import {
  createMentalCalculationRace,
  findMentalOperationLesson,
  formatMentalCalculation,
  getCalculationExplanation,
  getCalculationHint,
  getRelatedMultiplicationFacts,
  isCorrectMentalCalculation,
  MENTAL_OPERATIONS,
  MENTAL_OPERATION_LABELS,
  type MentalCalculation,
  type MentalOperation,
} from '@/features/practice/mentalCalculationRace';

const STORAGE_KEY = 'tutorly:practice:mental-calculation-race:v1';
const RACE_LENGTH = 10;
type RaceStage = 'setup' | 'racing' | 'review';
type AnswerResult = 'correct' | 'incorrect' | null;

type SavedRace = {
  stage: RaceStage;
  operations: MentalOperation[];
  maximum: number;
  calculations: MentalCalculation[];
  currentIndex: number;
  results: Array<boolean | null>;
  responses: Array<string | null>;
  elapsedSeconds: number;
  answer?: string;
  answerResult?: AnswerResult;
};

function isOperation(value: unknown): value is MentalOperation {
  return MENTAL_OPERATIONS.includes(value as MentalOperation);
}

function isCalculation(value: unknown): value is MentalCalculation {
  if (!value || typeof value !== 'object') return false;
  const calculation = value as MentalCalculation;
  if (typeof calculation.id !== 'string' || !isOperation(calculation.operation)) return false;
  if (!Number.isInteger(calculation.left) || !Number.isInteger(calculation.right) || !Number.isInteger(calculation.answer)) return false;
  if (calculation.operation === 'addition') return calculation.left + calculation.right === calculation.answer;
  if (calculation.operation === 'subtraction') return calculation.left - calculation.right === calculation.answer;
  if (calculation.operation === 'multiplication') return calculation.left * calculation.right === calculation.answer;
  return calculation.right > 0 && calculation.left / calculation.right === calculation.answer;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
}

export default function MentalCalculationRacePage() {
  const navigate = useNavigate();
  const { learnerId } = useLearner();
  const storageKey = learnerStorageKey(STORAGE_KEY, learnerId);
  const curriculum = useStudentCurriculum();
  const [stage, setStage] = useState<RaceStage>('setup');
  const [operations, setOperations] = useState<MentalOperation[]>([...MENTAL_OPERATIONS]);
  const [maximum, setMaximum] = useState(10);
  const [calculations, setCalculations] = useState<MentalCalculation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Array<boolean | null>>([]);
  const [responses, setResponses] = useState<Array<string | null>>([]);
  const [answer, setAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerResult>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [raceStartedAt, setRaceStartedAt] = useState<number | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [openHints, setOpenHints] = useState<string[]>([]);

  const topicEntries = useMemo(() => curriculum.subjects.flatMap((subject) => subject.domains.flatMap((domain) =>
    domain.subdomains.flatMap((subdomain) => subdomain.topics.map((topic) => ({
      id: topic.id,
      topicLabel: topic.topicLabel,
      topicSlug: topic.slug,
      subjectSlug: subject.slug,
      hasCurriculumContent: topic.videoCount > 0,
    })))
  )), [curriculum.subjects]);
  const topicIds = useMemo(() => topicEntries.map((topic) => topic.id), [topicEntries]);
  const lessonRowsQuery = useQuery({
    queryKey: ['mental-race-lesson-topics', topicIds],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('id, lesson_content').in('id', topicIds);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const lessonCandidates = useMemo(() => topicEntries.map((topic) => ({
    topicLabel: topic.topicLabel,
    topicSlug: topic.topicSlug,
    subjectSlug: topic.subjectSlug,
    hasLesson: topic.hasCurriculumContent || Boolean(lessonRowsQuery.data?.find((row) => row.id === topic.id)?.lesson_content),
  })), [lessonRowsQuery.data, topicEntries]);
  const lessonByOperation = useMemo(() => Object.fromEntries(
    MENTAL_OPERATIONS.map((operation) => [operation, findMentalOperationLesson(operation, lessonCandidates)])
  ) as Record<MentalOperation, ReturnType<typeof findMentalOperationLesson>>, [lessonCandidates]);

  const currentCalculation = calculations[currentIndex];
  const correctCount = results.filter((result) => result === true).length;
  const missedCalculations = calculations.filter((_, index) => results[index] === false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setLoadedKey(null);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) as Partial<SavedRace> : null;
      if (saved && ['setup', 'racing', 'review'].includes(String(saved.stage))
        && Array.isArray(saved.calculations) && saved.calculations.length === RACE_LENGTH
        && saved.calculations.every(isCalculation)) {
        const safeResults = Array.isArray(saved.results) ? saved.results.slice(0, RACE_LENGTH) : [];
        const safeResponses = Array.isArray(saved.responses) ? saved.responses.slice(0, RACE_LENGTH) : [];
        setStage(saved.stage!);
        setOperations(Array.isArray(saved.operations) ? saved.operations.filter(isOperation) : [...MENTAL_OPERATIONS]);
        setMaximum([10, 20, 100].includes(Number(saved.maximum)) ? Number(saved.maximum) : 10);
        setCalculations(saved.calculations);
        setCurrentIndex(Math.max(0, Math.min(RACE_LENGTH - 1, Number(saved.currentIndex) || 0)));
        setResults(Array.from({ length: RACE_LENGTH }, (_, index) => typeof safeResults[index] === 'boolean' ? safeResults[index]! : null));
        setResponses(Array.from({ length: RACE_LENGTH }, (_, index) => typeof safeResponses[index] === 'string' ? safeResponses[index]! : null));
        setElapsedSeconds(Math.max(0, Number(saved.elapsedSeconds) || 0));
        setAnswer(typeof saved.answer === 'string' ? saved.answer : '');
        setAnswerResult(saved.answerResult === 'correct' || saved.answerResult === 'incorrect' ? saved.answerResult : null);
        if (saved.stage === 'racing') setRaceStartedAt(Date.now() - Math.max(0, Number(saved.elapsedSeconds) || 0) * 1000);
      }
    } catch { /* a saved race is optional */ }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (stage !== 'racing' || raceStartedAt === null) return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - raceStartedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [raceStartedAt, stage]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    const saved: SavedRace = { stage, operations, maximum, calculations, currentIndex, results, responses, elapsedSeconds, answer, answerResult };
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { /* the race remains playable if local storage is unavailable */ }
  }, [answer, answerResult, calculations, currentIndex, elapsedSeconds, loadedKey, maximum, operations, responses, results, stage, storageKey]);

  const toggleOperation = (operation: MentalOperation) => {
    setOperations((current) => current.includes(operation)
      ? current.filter((item) => item !== operation)
      : [...current, operation]);
  };

  const startRace = () => {
    if (!operations.length) return;
    const nextRace = createMentalCalculationRace(operations, maximum, Math.random, RACE_LENGTH);
    setCalculations(nextRace);
    setCurrentIndex(0);
    setResults(Array.from({ length: RACE_LENGTH }, () => null));
    setResponses(Array.from({ length: RACE_LENGTH }, () => null));
    setAnswer('');
    setAnswerResult(null);
    setEntryError(null);
    setElapsedSeconds(0);
    setRaceStartedAt(Date.now());
    setOpenHints([]);
    setStage('racing');
  };

  const checkAnswer = () => {
    if (!currentCalculation) return;
    if (!/^\d+$/.test(answer.trim())) {
      setEntryError('Enter a whole-number answer to continue.');
      return;
    }
    const correct = isCorrectMentalCalculation(currentCalculation, answer);
    setResults((current) => current.map((result, index) => index === currentIndex ? correct : result));
    setResponses((current) => current.map((response, index) => index === currentIndex ? answer.trim() : response));
    setAnswerResult(correct ? 'correct' : 'incorrect');
    setEntryError(null);
  };

  const continueRace = () => {
    if (answerResult === null) return;
    if (currentIndex + 1 >= calculations.length) {
      setElapsedSeconds(raceStartedAt === null ? elapsedSeconds : Math.floor((Date.now() - raceStartedAt) / 1000));
      setRaceStartedAt(null);
      setStage('review');
      setAnswerResult(null);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setAnswer('');
    setAnswerResult(null);
    setEntryError(null);
  };

  const restart = () => {
    setStage('setup');
    setCalculations([]);
    setCurrentIndex(0);
    setResults([]);
    setResponses([]);
    setAnswer('');
    setAnswerResult(null);
    setElapsedSeconds(0);
    setRaceStartedAt(null);
    setOpenHints([]);
  };

  const toggleHint = (id: string) => setOpenHints((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  if (loadedKey !== storageKey || curriculum.isLoading) {
    return <main className="min-h-screen bg-[#F7F8FC] px-4 pt-8 text-[#475467]"><PageMeta title="Mental calculation race | Practice" description="Practise addition, subtraction, multiplication, and division." /><p role="status" className="mx-auto max-w-xl">Loading your practice…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 pb-10 pt-5 text-[#17213C] motion-reduce:scroll-auto">
      <PageMeta title="Mental calculation race | Practice" description="Practise addition, subtraction, multiplication, and division." />
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => navigate('/practice')} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Practice</button>
        <header className="mb-4">
          <p className="text-sm font-bold text-[#087F68]">Maths · Mental calculation</p>
          <h1 className="mt-1 text-2xl font-extrabold">Calculation race</h1>
          <p className="mt-1 text-sm text-[#667085]">One calculation at a time. Any missed answers can be reviewed after the race.</p>
        </header>

        {stage === 'setup' && (
          <section className="rounded-3xl border border-[#D8EBE5] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-extrabold">Choose what to practise</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {MENTAL_OPERATIONS.map((operation) => {
                const selected = operations.includes(operation);
                return <button key={operation} type="button" aria-pressed={selected} onClick={() => toggleOperation(operation)} className={`min-h-12 rounded-xl border-2 px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] ${selected ? 'border-[#087F68] bg-[#E8F8F3] text-[#075B4B]' : 'border-[#D0D5DD] bg-white text-[#475467]'}`}>{MENTAL_OPERATION_LABELS[operation]}</button>;
              })}
            </div>
            <label className="mt-4 block text-sm font-semibold" htmlFor="calculation-range">Largest answer
              <select id="calculation-range" value={maximum} onChange={(event) => setMaximum(Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 focus:border-[#087F68] focus:outline-none focus:ring-2 focus:ring-[#087F68]/25">
                <option value={10}>Up to 10</option><option value={20}>Up to 20</option><option value={100}>Up to 100</option>
              </select>
            </label>
            {!operations.length && <p role="alert" className="mt-3 text-sm font-semibold text-[#A12B2B]">Choose at least one operation.</p>}
            <p className="mt-3 text-xs text-[#667085]">Each race has 10 questions. Your time is shown, but it does not change how many answers are correct.</p>
            <button type="button" disabled={!operations.length} onClick={startRace} className="mt-5 min-h-12 w-full rounded-xl bg-[#087F68] px-4 font-bold text-white hover:bg-[#066B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] focus-visible:ring-offset-2 disabled:opacity-50">Start race</button>
          </section>
        )}

        {stage === 'racing' && currentCalculation && (
          <section className="rounded-3xl border border-[#D8EBE5] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="race-calculation">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#667085]">
              <span>Calculation {currentIndex + 1} of {calculations.length}</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums"><Clock3 className="h-4 w-4" aria-hidden="true" />{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6F0ED]" role="progressbar" aria-label="Race progress" aria-valuemin={0} aria-valuemax={calculations.length} aria-valuenow={currentIndex}>
              <div className="h-full rounded-full bg-[#12C6A0] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(currentIndex / calculations.length) * 100}%` }} />
            </div>
            <div className="mt-6 flex min-h-36 items-center justify-center rounded-2xl bg-[#F2F8F6] px-4 py-7 text-center">
              <h2 id="race-calculation" className="text-4xl font-extrabold tracking-wide tabular-nums sm:text-5xl">{formatMentalCalculation(currentCalculation)}</h2>
            </div>
            <label htmlFor="race-answer" className="mt-5 block text-sm font-semibold">Your answer
              <input id="race-answer" type="number" inputMode="numeric" autoComplete="off" value={answer} onChange={(event) => { setAnswer(event.target.value); setEntryError(null); }} onKeyDown={(event) => { if (event.key !== 'Enter') return; if (answerResult) continueRace(); else checkAnswer(); }} disabled={answerResult !== null} className="mt-2 min-h-12 w-full rounded-xl border border-[#D0D5DD] px-4 text-lg font-bold focus:border-[#087F68] focus:outline-none focus:ring-2 focus:ring-[#087F68]/25 disabled:bg-[#F7F8FC]" />
            </label>
            {entryError && <p role="alert" className="mt-2 text-sm font-semibold text-[#A12B2B]">{entryError}</p>}
            {answerResult === 'correct' && <div className="mt-4"><PracticeFeedback status="correct" language="en" points={1} /><button type="button" onClick={continueRace} className="min-h-11 w-full rounded-xl bg-[#087F68] px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]">{currentIndex + 1 === calculations.length ? 'Finish race' : 'Next calculation'}</button></div>}
            {answerResult === 'incorrect' && <div className="mt-4 rounded-xl bg-[#FFF4E5] p-3 text-sm text-[#8A4B08]" role="status" aria-live="polite"><p className="font-bold">We’ll save this calculation for your review after the race.</p><button type="button" onClick={continueRace} className="mt-2 min-h-11 w-full rounded-lg font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]">{currentIndex + 1 === calculations.length ? 'Finish race' : 'Next calculation'}</button></div>}
            {answerResult === null && <button type="button" onClick={checkAnswer} disabled={!answer.trim()} className="mt-4 min-h-12 w-full rounded-xl bg-[#087F68] px-4 font-bold text-white hover:bg-[#066B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] focus-visible:ring-offset-2 disabled:opacity-50">Check answer</button>}
          </section>
        )}

        {stage === 'review' && (
          <section className="space-y-4" aria-labelledby="race-review-title">
            <div className="rounded-3xl border border-[#D8EBE5] bg-white p-5 text-center shadow-sm sm:p-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087F68]"><Check className="h-7 w-7" aria-hidden="true" /></div>
              <h2 id="race-review-title" className="mt-3 text-2xl font-extrabold">Race complete</h2>
              <p className="mt-2 text-[#475467]">{correctCount} of {calculations.length} correct · {formatTime(elapsedSeconds)}</p>
              <p className="mt-1 text-sm text-[#667085]">Review any missed calculations below. Your time does not affect the result.</p>
              <button type="button" onClick={restart} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D0D5DD] px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><RotateCcw className="h-4 w-4" aria-hidden="true" /> New race</button>
            </div>
            {missedCalculations.length === 0 ? (
              <div className="rounded-2xl border border-[#BCEFE3] bg-[#E8F8F3] p-4 text-center font-semibold text-[#075B4B]">You got every calculation right!</div>
            ) : (
              <div className="space-y-3">
                <h3 className="px-1 text-lg font-extrabold">Let’s review these calculations</h3>
                {calculations.map((calculation, index) => {
                  if (results[index] !== false) return null;
                  const isOpen = openHints.includes(calculation.id);
                  const lesson = lessonByOperation[calculation.operation];
                  const relatedFacts = getRelatedMultiplicationFacts(calculation);
                  return <article key={calculation.id} className="rounded-2xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-[#667085]">{MENTAL_OPERATION_LABELS[calculation.operation]}</p><h4 className="mt-1 text-xl font-extrabold tabular-nums">{formatMentalCalculation(calculation).replace(' = ?', '')} = {calculation.answer}</h4><p className="mt-1 text-sm text-[#667085]">Your answer: {responses[index] ?? '—'}</p></div>
                      <X className="h-5 w-5 shrink-0 text-[#D04444]" aria-label="Missed" />
                    </div>
                    <button type="button" aria-expanded={isOpen} onClick={() => toggleHint(calculation.id)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-[#087F68] hover:bg-[#F2F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]"><Lightbulb className="h-4 w-4" aria-hidden="true" />{isOpen ? 'Hide explanation' : 'Show explanation'}</button>
                    {isOpen && <div className="mt-2 space-y-3 rounded-xl bg-[#F2F8F6] p-3 text-sm text-[#075B4B]">
                      <p><strong>Hint:</strong> {getCalculationHint(calculation)}</p>
                      <p><strong>How it works:</strong> {getCalculationExplanation(calculation)}</p>
                      {relatedFacts.length > 0 && <div><p className="font-bold">The {calculation.right} times table</p><div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">{relatedFacts.map(({ multiplier, product, isRelevant }) => <span key={multiplier} className={isRelevant ? 'rounded bg-white px-1 font-bold' : ''}>{calculation.right} × {multiplier} = {product}</span>)}</div><p className="mt-2">For division, use the matching multiplication fact to find how many equal groups fit.</p></div>}
                      {lesson ? <Link to={`/learning/${lesson.subjectSlug}/${lesson.topicSlug}`} className="inline-flex min-h-11 items-center font-bold text-[#087F68] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]">Open the {MENTAL_OPERATION_LABELS[calculation.operation].toLowerCase()} lesson</Link> : <Link to="/learning/mathematiques" className="inline-flex min-h-11 items-center font-bold text-[#087F68] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68]">Browse maths lessons</Link>}
                    </div>}
                  </article>;
                })}
              </div>
            )}
            <p className="px-1 text-center text-xs text-[#667085]">Your race is saved on this device. Practice does not mark a lesson as mastered.</p>
          </section>
        )}
      </div>
    </main>
  );
}
