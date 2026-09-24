import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import type { LessonBlock, LessonV2 } from '@/types/lesson-generator';

type Props = { topicId: string; subjectId?: string | null; topicName: string; lesson: LessonV2; onMasteryResult?: (score: number, threshold: number) => void; onSequencePosition?: (position: number) => void };

function sameAnswer(expected: unknown, actual: string): boolean {
  if (typeof expected === 'number') return Number(actual) === expected;
  if (Array.isArray(expected)) return actual.trim() === expected.join(',');
  const expectedText = String(expected ?? '').trim().toLowerCase();
  const actualText = actual.trim().toLowerCase();
  if (expectedText === actualText) return true;
  const expectedNumber = expectedText.match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  const actualNumber = actualText.match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  return Boolean(expectedNumber && actualNumber && expectedNumber === actualNumber);
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
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
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
  const [prerequisiteChecked, setPrerequisiteChecked] = useState(false);
  const [prerequisitesPassed, setPrerequisitesPassed] = useState(false);
  const block = lesson.sequence[index];
  useEffect(() => { onSequencePosition?.(index); }, [index, onSequencePosition]);
  const required = block?.type === 'student_try' || block?.type === 'feedback_checkpoint' || block?.type === 'mastery_check' || block?.type === 'prediction';
  const question = block && (block.type === 'student_try' || block.type === 'feedback_checkpoint' ? block : block.type === 'prediction' ? block : null);
  const questionData = question && 'correct_answer' in question ? question : null;
  const masteryQuestions = block?.type === 'mastery_check' ? block.questions : [];
  const [masteryAnswers, setMasteryAnswers] = useState<Record<string, string>>({});

  const progress = useMemo(() => Math.round(((index + (completed ? 1 : 0)) / lesson.sequence.length) * 100), [index, completed, lesson.sequence.length]);
  const record = (eventType: Parameters<typeof trackLearningInteraction>[0]['eventType'], data: Record<string, unknown> = {}) => trackLearningInteraction({ studentId: user?.id, eventType, topicId, metadata: { lessonVersion: '2.0', blockId: block?.id, ...data } });

  const next = async () => {
    if (index >= lesson.sequence.length - 1) {
      setCompleted(true);
      if (user?.id) await supabase.from('user_learning_progress').upsert({ user_id: user.id, topic_id: topicId, subject_id: subjectId ?? null, progress_type: 'lesson_completed', progress_percentage: 100, time_spent_seconds: 0 }, { onConflict: 'user_id,topic_id,progress_type' });
      record('lesson_completed');
      return;
    }
    setIndex((value) => value + 1); setAnswer(''); setSubmitted(false); setCorrect(null); setHint(0); setAttempts(0); setMasteryAnswers({});
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
  const submitPrerequisite = () => {
    const passed = sameAnswer(prerequisite.expected_answer, prerequisiteAnswer);
    setPrerequisiteChecked(passed);
    record('lesson_prerequisite_checked', { wasCorrect: passed, prerequisiteId: prerequisite.id });
    if (passed && prerequisiteIndex >= lesson.prerequisites.length - 1) setPrerequisitesPassed(true);
    else if (passed) { setPrerequisiteIndex((value) => value + 1); setPrerequisiteAnswer(''); setPrerequisiteChecked(false); }
  };

  if (completed) return <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><CheckCircle2 className="h-16 w-16 text-teal-500" /><h2 className="text-2xl font-bold">Leçon terminée</h2><p className="text-muted-foreground">{topicName}</p></div>;
  if (!prerequisitesPassed) return <div className="flex h-full flex-col overflow-y-auto p-4"><div className="mb-6"><div className="h-2 rounded-full bg-muted"><div className="h-full w-1/12 rounded-full bg-primary" /></div></div><div className="flex-1 space-y-4"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-800">Prérequis</span><h2 className="text-xl font-bold">Avant de commencer</h2><p className="text-muted-foreground">{prerequisite.description}</p><p className="text-lg font-semibold">{prerequisite.check_question}</p><input className="w-full rounded-xl border p-3" value={prerequisiteAnswer} onChange={(event) => setPrerequisiteAnswer(event.target.value)} aria-label="Réponse au prérequis" />{prerequisiteChecked && <p className="rounded-xl bg-amber-50 p-3">{prerequisite.remediation_hint}</p>}</div><button onClick={submitPrerequisite} disabled={!prerequisiteAnswer.trim()} className="mt-4 w-full rounded-xl bg-primary p-3 font-bold disabled:opacity-50">{prerequisiteIndex === lesson.prerequisites.length - 1 ? 'Commencer la leçon' : 'Continuer'}</button></div>;
  if (!block) return <div className="p-6 text-center">Cette leçon ne contient aucun contenu valide.</div>;

  return <div className="flex h-full flex-col overflow-y-auto p-4">
    <div className="mb-4"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.max(5, progress)}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{index + 1} / {lesson.sequence.length}</p></div>
    <div className="flex-1 space-y-4">
      <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase text-teal-800">{block.type.replace('_', ' ')}</span>
      {'title' in block && <h2 className="text-xl font-bold">{block.title}</h2>}
      {block.type === 'visual' && <Visual block={block} />}
      {block.type === 'hook' || block.type === 'concept' || block.type === 'rule' ? <p className="whitespace-pre-wrap rounded-xl bg-card p-4 leading-7">{block.content}</p> : null}
      {block.type === 'contrast' && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted p-4">{block.left}</div><div className="rounded-xl bg-muted p-4">{block.right}</div><p className="sm:col-span-2">{block.explanation}</p></div>}
      {block.type === 'guided_example' && <div className="space-y-3"><p>{block.context}</p>{block.steps.map((step, i) => <div className="rounded-xl bg-muted p-3" key={i}><b>{step.instruction}</b><p>{step.representation}</p><p className="text-sm text-muted-foreground">{step.reason}</p></div>)}</div>}
      {block.type === 'worked_example' && <div className="space-y-2"><p>{block.context}</p>{block.steps.map((step, i) => <p key={i}>{i + 1}. {typeof step === 'string' ? step : `${step.instruction}${step.representation ? ` — ${step.representation}` : ''}${step.reason ? ` (${step.reason})` : ''}`}</p>)}<b>{block.conclusion}</b></div>}
      {block.type === 'reflection' && <p className="rounded-xl bg-amber-50 p-4">{block.question}</p>}
      {block.type === 'mastery_check' && <div className="space-y-4">{masteryQuestions.map((item) => <div key={item.id} className="space-y-2"><p className="font-medium">{item.question}</p>{item.choices?.map((choice) => <button key={choice} onClick={() => setMasteryAnswers((a) => ({ ...a, [item.id]: choice }))} className={`mr-2 rounded-lg border px-3 py-2 ${masteryAnswers[item.id] === choice ? 'border-primary bg-primary/10' : ''}`}>{choice}</button>)}{!item.choices && <input className="w-full rounded-lg border p-2" value={masteryAnswers[item.id] ?? ''} onChange={(e) => setMasteryAnswers((a) => ({ ...a, [item.id]: e.target.value }))} />}</div>)}</div>}
      {questionData && <div className="space-y-3"><p className="text-lg font-semibold">{questionData.question}</p>{questionData.choices?.map((choice) => <button key={choice} onClick={() => setAnswer(choice)} className={`mr-2 rounded-lg border px-3 py-2 ${answer === choice ? 'border-primary bg-primary/10' : ''}`}>{choice}</button>)}{!questionData.choices && <input className="w-full rounded-lg border p-3" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Réponse" />}</div>}
      {submitted && correct !== null && <div className={`rounded-xl p-3 ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{correct ? <CheckCircle2 className="mr-2 inline h-5 w-5" /> : <XCircle className="mr-2 inline h-5 w-5" />}{correct ? (questionData && 'success_feedback' in questionData ? questionData.success_feedback : 'Bonne réponse.') : (questionData && 'error_feedback' in questionData ? questionData.error_feedback : 'Relis la question et essaie encore.')}</div>}
      {questionData && !correct && questionData.hints?.[hint] && <p className="rounded-xl bg-blue-50 p-3 text-blue-900"><Lightbulb className="mr-2 inline h-4 w-4" />{questionData.hints[hint]}</p>}
    </div>
    <div className="mt-4 space-y-2">{required && !submitted && <button onClick={questionData ? submit : submitMastery} disabled={questionData ? !answer : Object.keys(masteryAnswers).length < masteryQuestions.length} className="w-full rounded-xl bg-primary p-3 font-bold disabled:opacity-50">Valider</button>}{submitted && !correct && (questionData?.hints?.[hint + 1] || attempts > 1) && <button onClick={() => { setHint((value) => value + 1); record('lesson_hint_used', { hintNumber: hint + 1 }); }} className="w-full rounded-xl border p-3 font-bold">Indice</button>}{(!required || (submitted && correct)) && <button onClick={next} className="w-full rounded-xl bg-primary p-3 font-bold">{index === lesson.sequence.length - 1 ? 'Terminer' : 'Continuer'}</button>}</div>
  </div>;
}
