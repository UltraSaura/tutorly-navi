import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { GuidedFamilyActivity } from '@/components/practice/GuidedFamilyActivity';
import { useLearner } from '@/context/FamilyProfileContext';
import { learnerStorageKey } from '@/features/family/profileRuntime';
import { createGuidedFamilyExercise, isGuidedFamilyExercise, isGuidedFamilyAnswerCorrect, type GuidedFamilyExercise, type GuidedFamilyKind, type GuidedFamilyState } from '@/features/practice/guidedFamilies';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

const GUIDED_PRACTICE_FAMILIES: Record<string, { kind: GuidedFamilyKind; title: string; category: string; description: string }> = {
  'word-problems': { kind: 'guided-word-problem', title: 'Petits problèmes guidés', category: 'Maths · Résolution de problèmes', description: 'Choisis l’opération, représente les objets, puis trouve le résultat.' },
  'equal-groups': { kind: 'equal-groups', title: 'Groupes égaux', category: 'Maths · Nombres et calcul · Multiplication', description: 'Construis des groupes égaux et relie-les à une multiplication.' },
  'colour-grid': { kind: 'colour-grid', title: 'Compter les couleurs', category: 'Maths · Nombres et dénombrement', description: 'Observe une grille et compte seulement la couleur demandée.' },
};

function FamilySession({ kind }: { kind: GuidedFamilyKind }) {
  const { learnerId } = useLearner();
  const storageKey = learnerStorageKey(`tutorly:practice:guided-family:v1:${kind}`, learnerId ?? undefined);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [exercise, setExercise] = useState<GuidedFamilyExercise | null>(null);
  const [answer, setAnswer] = useState<GuidedFamilyState | undefined>();
  const [restored, setRestored] = useState<GuidedFamilyState | undefined>();
  useEffect(() => {
    let nextExercise = createGuidedFamilyExercise(kind);
    let state: GuidedFamilyState | undefined;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (isGuidedFamilyExercise(saved?.exercise) && saved.exercise.kind === kind) {
        nextExercise = saved.exercise;
        if (saved.state && typeof saved.state === 'object') state = saved.state;
      }
    } catch { /* A corrupt or unavailable local store must not prevent practice. */ }
    setExercise(nextExercise);
    setRestored(state);
    setAnswer(undefined);
    setLoadedKey(storageKey);
  }, [kind, storageKey]);
  const save = useCallback((state: GuidedFamilyState) => {
    setAnswer(state);
    if (!exercise || loadedKey !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ exercise, state })); } catch { /* Practice also works without persistence. */ }
  }, [exercise, loadedKey, storageKey]);
  if (loadedKey !== storageKey || !exercise) return <p role="status">Chargement de ton activité…</p>;
  const complete = answer?.complete && Number.isInteger(answer.attempts) && answer.attempts >= 1 && isGuidedFamilyAnswerCorrect(exercise, answer);
  const score = complete ? scoreQuestionWithPenalty(exercise.points ?? 1, Math.max(1, answer.attempts), true).awardedPoints : 0;
  return <>
    <GuidedFamilyActivity key={`${storageKey}:${exercise.id}`} exercise={exercise} initialState={restored} onChange={save} language="fr" />
    {complete && <section className="mt-4 space-y-3 border-t pt-4" aria-label="Activité terminée">
      <p>Score de cet exercice : {score} / {exercise.points ?? 1}</p>
      {answer.supported && <p className="text-sm text-slate-700">Tu as utilisé une aide. Essaie un autre exercice pour t’entraîner à le résoudre seul.</p>}
      <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => { const next = createGuidedFamilyExercise(kind); setExercise(next); setRestored(undefined); setAnswer(undefined); try { localStorage.setItem(storageKey, JSON.stringify({ exercise: next })); } catch { /* optional persistence */ } }}><RotateCcw className="h-4 w-4" />Un autre exercice</button>
    </section>}
  </>;
}

export default function GuidedFamiliesPracticePage() {
  const { family = '' } = useParams();
  const config = GUIDED_PRACTICE_FAMILIES[family];
  return <main className="min-h-screen bg-[#F7F8FC] px-4 pb-28 pt-5"><PageMeta title={`${config?.title ?? 'Activité'} | Tutorly`} description={config?.description ?? ''} /><div className="mx-auto max-w-xl space-y-4">
    <Link to="/practice" className="inline-flex min-h-11 items-center gap-2 font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Retour aux exercices</Link>
    {config ? <><header><p className="text-sm font-semibold text-primary">{config.category}</p><h1 className="mt-1 text-2xl font-bold">{config.title}</h1><p className="mt-2 text-slate-600">{config.description}</p></header><div className="rounded-3xl border bg-white p-4 sm:p-6"><FamilySession key={config.kind} kind={config.kind} /></div></> : <p role="alert">Cette activité n’est pas disponible.</p>}
  </div></main>;
}
