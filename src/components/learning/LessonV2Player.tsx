import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import type { LessonBlock, LessonV2 } from '@/types/lesson-generator';
import { PedagogicalVisual } from './PedagogicalVisual';
import { QuestionCard } from './QuestionCard';
import type { Question } from '@/types/quiz-bank';

type Props = { topicId: string; subjectId?: string | null; topicName: string; lesson: LessonV2; onMasteryResult?: (score: number, threshold: number) => void; onSequencePosition?: (position: number) => void };

function sameAnswer(expected: unknown, actual: string): boolean {
  if (typeof expected === 'number') return Number(actual) === expected;
  if (Array.isArray(expected)) return actual.trim() === expected.join(',');
  const expectedText = String(expected ?? '').trim().toLowerCase();
  const actualText = actual.trim().toLowerCase();
  const timeValue = (value: string) => {
    const colon = value.match(/^\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*$/);
    if (colon) return Number(colon[1]) * 3600 + Number(colon[2]) * 60 + Number(colon[3] ?? 0);
    const parts = value.match(/^\s*(\d{1,3})\s*(?:h|heures?)\s*(?:(\d{1,2})\s*(?:min|minutes?))?\s*(?:(\d{1,2})\s*(?:s|secondes?))?\s*$/i);
    return parts ? Number(parts[1]) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0) : null;
  };
  const expectedTime = timeValue(expectedText);
  const actualTime = timeValue(actualText);
  if (expectedTime !== null && actualTime !== null) return expectedTime === actualTime;
  if (expectedText === actualText) return true;
  const expectedNumber = expectedText.match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  const actualNumber = actualText.match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  return Boolean(expectedNumber && actualNumber && expectedNumber === actualNumber);
}

function responseGuidance(_prompt: string, answerType?: string): { hint?: string; placeholder: string; inputMode: 'text' | 'decimal' } {
  if (answerType === 'numeric') return { hint: 'Écris uniquement le résultat, sans unité (ex. 60).', placeholder: 'Ex. 60', inputMode: 'decimal' };
  if (answerType === 'time') return { hint: 'Écris l’heure au format heures et minutes (ex. 2 h 15 min).', placeholder: 'Ex. 2 h 15 min', inputMode: 'text' };
  if (answerType === 'ordering') return { hint: 'Indique l’ordre avec des virgules.', placeholder: 'Ex. 1, 2, 3', inputMode: 'text' };
  if (answerType === 'short_text' || answerType === 'text') return { placeholder: 'Ta réponse', inputMode: 'text' };
  return { placeholder: 'Choisis une réponse', inputMode: 'text' };
}

function responseChoices(question: { choices?: string[]; correct_answer?: unknown; answer_type?: string }): string[] {
  if (question.choices?.length) return question.choices;
  if (question.answer_type !== 'numeric' || typeof question.correct_answer !== 'number') return [];
  const correct = question.correct_answer;
  const candidates = [correct, correct + 5, Math.max(0, correct - 5), correct * 2].map(String);
  return [...new Set(candidates)];
}

function practiceQuestion(question: any): Question | null {
  const base = {
    id: String(question.id),
    prompt: String(question.question),
    // Preserve explicit semantic metadata when a generated question provides
    // it. QuestionCard also derives the target from the prompt as a fallback.
    ...(question.answerUnit || question.answer_unit || question.targetUnit || question.target_unit
      ? { answerUnit: question.answerUnit ?? question.answer_unit ?? question.targetUnit ?? question.target_unit }
      : {}),
  };
  if (Array.isArray(question.choices) && question.choices.length > 0) {
    const expected = String(question.correct_answer ?? '');
    return { ...base, kind: 'single', choices: question.choices.map((label: string, index: number) => ({ id: `choice-${index}`, label, correct: label === expected })) } as Question;
  }
  if (question.answer_type === 'numeric' && Number.isFinite(Number(question.correct_answer))) {
    return { ...base, kind: 'numeric', answer: Number(question.correct_answer), dragOptions: responseChoices(question).map(Number) } as Question;
  }
  if (question.answer_type === 'time') {
    const raw = String(question.correct_answer ?? '');
    const clock = raw.match(/^(\d{1,2}):(\d{2})$/);
    const days = Number(raw.match(/(\d+)\s*(?:j|jour|jours)/i)?.[1] ?? 0);
    const hours = Number(raw.match(/(\d{1,2})\s*(?:h|heure|heures)/i)?.[1] ?? clock?.[1] ?? 0);
    const minutes = Number(raw.match(/(\d{1,2})\s*(?:min|minute|minutes)/i)?.[1] ?? clock?.[2] ?? 0);
    const seconds = Number(raw.match(/(\d{1,2})\s*(?:s|seconde|secondes)/i)?.[1] ?? 0);
    if (/\d/.test(raw)) return { ...base, kind: 'numeric', answer: days * 86400 + hours * 3600 + minutes * 60 + seconds, answerFormat: 'time', timeAnswer: { days, hours, minutes, seconds } } as Question;
  }
  if (question.answer_type === 'ordering' && Array.isArray(question.correct_answer) && Array.isArray(question.choices)) {
    return { ...base, kind: 'ordering', items: question.choices, correctOrder: question.correct_answer.map(String) } as Question;
  }
  return null;
}

function Visual({ block }: { block: Extract<LessonBlock, { type: 'visual' }> }) {
  const data = block.visual.data && typeof block.visual.data === 'object' ? block.visual.data as Record<string, unknown> : {};
  const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
  const nodes = Array.isArray(data.nodes) ? data.nodes as Array<Record<string, unknown>> : [];
  const groups = Array.isArray(data.groups) ? data.groups as Array<Record<string, unknown>> : [];
  const rows = Array.isArray(data.rows) ? data.rows as Array<Record<string, unknown>> : [];
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const values = items.length > 0 ? items : nodes.length > 0 ? nodes : groups.length > 0 ? groups : rows.length > 0 ? rows : labels.map((label) => ({ label }));
  const nodeLabels = new Map(values.map((item) => [String(item.id ?? ''), String(item.label ?? item.value ?? '')]));
  return <PedagogicalVisual block={block} />; /* legacy data fallback is rendered by PedagogicalVisual */ return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-teal-800">{block.visual.kind.replace('_', ' ')}</p>
    <p className="mt-2 text-sm text-teal-950">{block.content}</p>
    {values.length > 0 ? (
      <div className={`mt-4 ${block.visual.kind === 'timeline' || block.visual.kind === 'sequence' ? 'flex items-stretch gap-2 overflow-x-auto pb-2' : 'space-y-2'}`}>
        {values.map((item, index) => <div key={index} className={`${block.visual.kind === 'timeline' || block.visual.kind === 'sequence' ? 'min-w-36 flex-1' : ''} flex items-center gap-3 rounded-lg bg-white/80 p-3`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">{index + 1}</span>
          <div><p className="font-semibold text-teal-950">{String(item.label ?? item.value ?? '')}{item.next ? ` = ${String(item.next)}` : ''}</p>{item.detail && <p className="text-xs text-teal-700">{String(item.detail)}</p>}</div>
        </div>)}
      </div>
    ) : (
      <div className="mt-4 rounded-lg bg-white/80 p-4 text-sm text-teal-900">{typeof data.text === 'string' ? data.text : 'Observe cette représentation pour repérer la relation entre les grandeurs.'}</div>
    )}
    {nodes.length === 0 && Array.isArray(data.arrows) && data.arrows.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{(data.arrows as Array<Record<string, unknown>>).map((arrow, index) => {
      const from = nodeLabels.get(String(arrow.from ?? '')) ?? String(arrow.from ?? '');
      const to = nodeLabels.get(String(arrow.to ?? '')) ?? String(arrow.to ?? '');
      return <span key={index} className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">{from} {String(arrow.label ?? '→')} {to}</span>;
    })}</div>}
  </div>;
}

function ConceptPresentation({ block }: { block: Extract<LessonBlock, { type: 'concept' }> }) {
  return (
    <div className="space-y-5">
      {block.visual && (
        <PedagogicalVisual block={{ ...block, visual: block.visual, showText: false }} />
      )}
      <p className="mx-auto max-w-2xl text-center text-lg leading-8 text-slate-700">{block.content}</p>
      {block.key_points && block.key_points.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Points clés">
          {block.key_points.map((point, index) => (
            <div key={`${point.label}-${index}`} className="rounded-xl border border-[#D8E1F0] bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-[#3448A5]">{point.label}</p>
              <p className="leading-6 text-[#111827]">{point.text}</p>
            </div>
          ))}
        </div>
      )}
      {block.takeaway && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-amber-800">À retenir</p>
          <p className="text-lg font-bold leading-7 text-amber-950">{block.takeaway}</p>
        </div>
      )}
    </div>
  );
}

export function LessonV2Player({ topicId, subjectId, topicName, lesson, onMasteryResult, onSequencePosition }: Props) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [hint, setHint] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [prerequisiteIndex, setPrerequisiteIndex] = useState(0);
  const [prerequisiteAnswer, setPrerequisiteAnswer] = useState('');
  const [timeParts, setTimeParts] = useState({ hours: '', minutes: '', seconds: '' });
  const [prerequisiteResult, setPrerequisiteResult] = useState<boolean | null>(null);
  const [prerequisitesPassed, setPrerequisitesPassed] = useState(false);
  const block = lesson.sequence[index];
  useEffect(() => { onSequencePosition?.(index); }, [index, onSequencePosition]);
  const required = block?.type === 'student_try' || block?.type === 'feedback_checkpoint' || block?.type === 'mastery_check' || block?.type === 'prediction';
  const question = block && (block.type === 'student_try' || block.type === 'feedback_checkpoint' ? block : block.type === 'prediction' ? block : null);
  const questionData = question && 'correct_answer' in question ? question : null;
  const practiceQuestionData = questionData ? practiceQuestion(questionData) : null;
  const masteryQuestions = block?.type === 'mastery_check' ? block.questions : [];
  const [masteryAnswers, setMasteryAnswers] = useState<Record<string, string>>({});
  const [masteryResults, setMasteryResults] = useState<Record<string, boolean>>({});
  const masteryPracticeQuestions = masteryQuestions.map((item) => practiceQuestion(item));
  const allMasteryPractice = masteryQuestions.length > 0 && masteryPracticeQuestions.every(Boolean);

  const progress = useMemo(() => Math.round(((index + (completed ? 1 : 0)) / lesson.sequence.length) * 100), [index, completed, lesson.sequence.length]);
  const record = (eventType: Parameters<typeof trackLearningInteraction>[0]['eventType'], data: Record<string, unknown> = {}) => trackLearningInteraction({ studentId: user?.id, eventType, topicId, metadata: { lessonVersion: '2.0', blockId: block?.id, ...data } });

  const next = async () => {
    if (index >= lesson.sequence.length - 1) {
      setCompleted(true);
      if (user?.id) await supabase.from('user_learning_progress').upsert({ user_id: user.id, topic_id: topicId, subject_id: subjectId ?? null, progress_type: 'lesson_completed', progress_percentage: 100, time_spent_seconds: 0 }, { onConflict: 'user_id,topic_id,progress_type' });
      record('lesson_completed');
      return;
    }
    setIndex((value) => value + 1); setAnswer(''); setSubmitted(false); setCorrect(null); setHint(0); setAttempts(0); setMasteryAnswers({}); setMasteryResults({});
  };

  const submit = () => {
    if (!questionData) return;
    const result = sameAnswer(questionData.correct_answer, answer);
    setAttempts((value) => value + 1); setSubmitted(true); setCorrect(result);
    record('quiz_answer_submitted', { wasCorrect: result, attemptNumber: attempts + 1 });
    record(result ? 'quiz_completed' : 'quiz_wrong_answer');
  };

  const submitMastery = () => {
    const results = masteryQuestions.map((item) => sameAnswer(item.correct_answer, masteryAnswers[item.id] ?? ''));
    const passed = results.length > 0 && results.every(Boolean);
    setAttempts((value) => value + 1); setSubmitted(true); setCorrect(passed);
    onMasteryResult?.(results.length ? results.filter(Boolean).length / results.length : 0, lesson.mastery.threshold);
    record('lesson_mastery_checked', { wasCorrect: passed, score: results.filter(Boolean).length, total: results.length });
  };

  const prerequisite = lesson.prerequisites[prerequisiteIndex];
  const prerequisiteAnswerType = String((prerequisite as Record<string, unknown>).answer_type ?? 'short_text');
  const prerequisiteChoices = Array.isArray((prerequisite as Record<string, unknown>).choices) ? (prerequisite as Record<string, unknown>).choices as string[] : [];
  const prerequisitePracticeQuestion = practiceQuestion({
    id: prerequisite.id,
    question: prerequisite.check_question,
    answer_type: prerequisiteAnswerType,
    choices: prerequisiteChoices,
    correct_answer: prerequisite.expected_answer,
  });
  const prerequisiteVisual = (prerequisite as Record<string, unknown>).visual && typeof (prerequisite as Record<string, unknown>).visual === 'object'
    ? { id: `${prerequisite.id}-visual`, type: 'visual' as const, title: 'Observe', content: prerequisite.description, visual: (prerequisite as Record<string, unknown>).visual as { kind: string; data: unknown; alt_text?: string; purpose?: string } }
    : null;
  const prerequisiteFormat = responseGuidance(prerequisite.check_question, prerequisiteAnswerType);
  const updateTimePart = (part: keyof typeof timeParts, value: string) => {
    const next = { ...timeParts, [part]: value.replace(/\D/g, '').slice(0, 2) };
    setTimeParts(next);
    setPrerequisiteAnswer(`${next.hours || 0} h ${next.minutes || 0} min ${next.seconds || 0} s`);
    setPrerequisiteResult(null);
  };
  const submitPrerequisite = () => {
    const passed = sameAnswer(prerequisite.expected_answer, prerequisiteAnswer);
    setPrerequisiteResult(passed);
    record('lesson_prerequisite_checked', { wasCorrect: passed, prerequisiteId: prerequisite.id });
    if (passed && prerequisiteIndex >= lesson.prerequisites.length - 1) setPrerequisitesPassed(true);
    else if (passed) { setPrerequisiteIndex((value) => value + 1); setPrerequisiteAnswer(''); setTimeParts({ hours: '', minutes: '', seconds: '' }); setPrerequisiteResult(null); }
  };

  if (completed) return <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><CheckCircle2 className="h-16 w-16 text-teal-500" /><h2 className="text-2xl font-bold">Leçon terminée</h2><p className="text-muted-foreground">{topicName}</p></div>;

  if (!prerequisitesPassed) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#12C6A0] transition-all"
                style={{ width: `${Math.max(10, Math.round(((prerequisiteIndex + 1) / lesson.prerequisites.length) * 100))}%` }}
              />
            </div>
          </div>
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-800">
              Prérequis
            </span>
            <h2 className="text-xl font-bold">Avant de commencer</h2>
            <p className="text-muted-foreground">{prerequisite.description}</p>
            {prerequisiteVisual && <PedagogicalVisual block={prerequisiteVisual} />}
            {prerequisitePracticeQuestion ? <QuestionCard
              question={prerequisitePracticeQuestion}
              allowRetry
              hideCorrect
              onFinish={(passed) => {
                setPrerequisiteResult(passed);
                record('lesson_prerequisite_checked', { wasCorrect: passed, prerequisiteId: prerequisite.id });
                if (passed && prerequisiteIndex >= lesson.prerequisites.length - 1) setPrerequisitesPassed(true);
                else if (passed) {
                  setPrerequisiteIndex((value) => value + 1);
                  setPrerequisiteAnswer('');
                  setTimeParts({ hours: '', minutes: '', seconds: '' });
                  setPrerequisiteResult(null);
                }
              }}
            /> : <>
            <p className="text-lg font-semibold">{prerequisite.check_question}</p>
            {prerequisiteFormat.hint && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{prerequisiteFormat.hint}</p>}
            {prerequisiteChoices.length > 0 || ['multiple_choice', 'selection'].includes(prerequisiteAnswerType)
              ? <div className="flex flex-wrap gap-2">{prerequisiteChoices.map((choice) => <button type="button" key={choice} onClick={() => { setPrerequisiteAnswer(choice); setPrerequisiteResult(null); }} className={`rounded-lg border px-4 py-3 text-left ${prerequisiteAnswer === choice ? 'border-[#12C6A0] bg-emerald-50' : 'bg-white'}`}>{choice}</button>)}</div>
              : prerequisiteAnswerType === 'time' ? <div className="grid grid-cols-3 gap-2" aria-label="Réponse en heures, minutes et secondes">
                {([['hours', 'heures'], ['minutes', 'minutes'], ['seconds', 'secondes']] as const).map(([part, label]) => (
                  <label key={part} className="text-center text-xs font-semibold text-slate-500">
                    <input
                      className="w-full rounded-xl border p-3 text-center text-lg focus:border-[#12C6A0] focus:outline-none focus:ring-1 focus:ring-[#12C6A0]"
                      value={timeParts[part]}
                      placeholder="0"
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(event) => updateTimePart(part, event.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && prerequisiteAnswer.trim()) submitPrerequisite(); }}
                      aria-label={label}
                      autoFocus={part === 'hours'}
                    />
                    <span className="mt-1 block">{label}</span>
                  </label>
                ))}
              </div> : <input
                className="w-full rounded-xl border p-3 text-base focus:border-[#12C6A0] focus:outline-none focus:ring-1 focus:ring-[#12C6A0]"
                value={prerequisiteAnswer}
                placeholder={prerequisiteFormat.placeholder}
                inputMode={prerequisiteFormat.inputMode}
                onChange={(event) => { setPrerequisiteAnswer(event.target.value); setPrerequisiteResult(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && prerequisiteAnswer.trim()) submitPrerequisite(); }}
                aria-label="Réponse au prérequis"
                autoFocus
              />}</>}
            {prerequisiteResult === false && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><XCircle className="mr-2 inline h-5 w-5" />{prerequisite.remediation_hint}</div>}
            {prerequisiteResult === true && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-5 w-5" />Bonne réponse. Continue.</div>}
          </div>
        </div>

        {/* Pinned bottom action bar */}
        {!prerequisitePracticeQuestion && <div className="flex-shrink-0 border-t border-[#EAECEF] bg-white p-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto w-full max-w-[680px]">
            <button
              onClick={submitPrerequisite}
              disabled={prerequisiteAnswerType === 'time' ? !Object.values(timeParts).some(Boolean) : !prerequisiteAnswer.trim()}
              className="w-full rounded-xl bg-[#12C6A0] p-3.5 text-sm font-bold text-[#0F172A] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Valider
            </button>
          </div>
        </div>}
      </div>
    );
  }

  if (!block) return <div className="p-6 text-center">Cette leçon ne contient aucun contenu valide.</div>;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[#12C6A0] transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{index + 1} / {lesson.sequence.length}</p>
        </div>
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase text-teal-800">{block.type.replace('_', ' ')}</span>
          {'title' in block && <h2 className="text-xl font-bold">{block.title}</h2>}
          {block.type === 'visual' && <PedagogicalVisual block={block} />}
          {block.type === 'concept' && <ConceptPresentation block={block} />}
          {block.type === 'hook' || block.type === 'rule' ? <p className="whitespace-pre-wrap rounded-xl bg-card p-4 leading-7">{block.content}</p> : null}
          {block.type === 'contrast' && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted p-4">{block.left}</div><div className="rounded-xl bg-muted p-4">{block.right}</div><p className="sm:col-span-2">{block.explanation}</p></div>}
          {block.type === 'guided_example' && <div className="space-y-3"><p>{block.context}</p>{block.steps.map((step, i) => <div className="rounded-xl bg-muted p-3" key={i}><b>{step.instruction}</b><p>{step.representation}</p><p className="text-sm text-muted-foreground">{step.reason}</p></div>)}</div>}
          {block.type === 'worked_example' && <div className="space-y-2"><p>{block.context}</p>{block.steps.map((step, i) => <p key={i}>{i + 1}. {typeof step === 'string' ? step : `${step.instruction}${step.representation ? ` — ${step.representation}` : ''}${step.reason ? ` (${step.reason})` : ''}`}</p>)}<b>{block.conclusion}</b></div>}
          {block.type === 'reflection' && <p className="rounded-xl bg-amber-50 p-4">{block.question}</p>}
          {block.type === 'mastery_check' && <div className="space-y-4">{masteryQuestions.map((item, itemIndex) => {
            const practice = masteryPracticeQuestions[itemIndex];
            if (practice) return <QuestionCard key={item.id} question={practice} allowRetry hideCorrect onChange={(value) => setMasteryAnswers((answers) => ({ ...answers, [item.id]: String(value ?? '') }))} onFinish={(result) => {
              setMasteryResults((results) => {
                const nextResults = { ...results, [item.id]: result };
                if (Object.keys(nextResults).length === masteryQuestions.length) {
                  const score = Object.values(nextResults).filter(Boolean).length;
                  const passed = score === masteryQuestions.length;
                  setSubmitted(true); setCorrect(passed);
                  onMasteryResult?.(score / masteryQuestions.length, lesson.mastery.threshold);
                  record('lesson_mastery_checked', { wasCorrect: passed, score, total: masteryQuestions.length });
                }
                return nextResults;
              });
            }} />;
            const format = responseGuidance(item.question, item.answer_type); const hasChoices = Boolean(item.choices?.length);
            return <div key={item.id} className="space-y-2"><p className="font-medium">{item.question}</p>{hasChoices && item.choices?.map((choice) => <button key={choice} onClick={() => setMasteryAnswers((a) => ({ ...a, [item.id]: choice }))} className={`mr-2 rounded-lg border px-3 py-2 ${masteryAnswers[item.id] === choice ? 'border-primary bg-primary/10' : ''}`}>{choice}</button>)}{!hasChoices && <><p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{format.hint}</p><input className="w-full rounded-lg border p-2" value={masteryAnswers[item.id] ?? ''} placeholder={format.placeholder} inputMode={format.inputMode} onChange={(e) => setMasteryAnswers((a) => ({ ...a, [item.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') submitMastery(); }} aria-label="Réponse" /></>}</div>;
          })}</div>}
          {questionData && <div className="space-y-3">{practiceQuestionData ? <QuestionCard question={practiceQuestionData} allowRetry={false} hideCorrect onFinish={(result) => { setSubmitted(true); setCorrect(result); record(result ? 'quiz_completed' : 'quiz_wrong_answer', { wasCorrect: result }); }} /> : <><p className="text-lg font-semibold">{questionData.question}</p>{(() => { const format = responseGuidance(questionData.question, questionData.answer_type); return <><p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{format.hint}</p><input className="w-full rounded-lg border p-3" value={answer} placeholder={format.placeholder} inputMode={format.inputMode} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && answer) submit(); }} aria-label="Réponse" /></>; })()}</>}</div>}
          {submitted && correct !== null && <div className={`rounded-xl p-3 ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{correct ? <CheckCircle2 className="mr-2 inline h-5 w-5" /> : <XCircle className="mr-2 inline h-5 w-5" />}{correct ? (questionData && 'success_feedback' in questionData ? questionData.success_feedback : 'Bonne réponse.') : (questionData && 'error_feedback' in questionData ? questionData.error_feedback : 'Relis la question et essaie encore.')}</div>}
          {questionData && !correct && questionData.hints?.[hint] && <p className="rounded-xl bg-blue-50 p-3 text-blue-900"><Lightbulb className="mr-2 inline h-4 w-4" />{questionData.hints[hint]}</p>}
        </div>
      </div>

      {/* Pinned bottom action bar */}
      <div className="flex-shrink-0 border-t border-[#EAECEF] bg-white p-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-2px_10px_rgba(15,23,42,0.05)]">
        <div className="mx-auto w-full max-w-[680px] space-y-2">
          {required && !submitted && !practiceQuestionData && !allMasteryPractice && (
            <button
              onClick={questionData ? submit : submitMastery}
              disabled={questionData ? !answer : Object.keys(masteryAnswers).length < masteryQuestions.length}
              className="w-full rounded-xl bg-[#12C6A0] p-3.5 text-sm font-bold text-[#0F172A] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Valider
            </button>
          )}
          {submitted && !correct && (questionData?.hints?.[hint + 1] || attempts > 1) && (
            <button
              onClick={() => { setHint((value) => value + 1); record('lesson_hint_used', { hintNumber: hint + 1 }); }}
              className="w-full rounded-xl border p-3 text-sm font-bold"
            >
              Indice
            </button>
          )}
          {(!required || (submitted && correct)) && (
            <button
              onClick={next}
              className="w-full rounded-xl bg-[#12C6A0] p-3.5 text-sm font-bold text-[#0F172A]"
            >
              {index === lesson.sequence.length - 1 ? 'Terminer' : 'Continuer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
