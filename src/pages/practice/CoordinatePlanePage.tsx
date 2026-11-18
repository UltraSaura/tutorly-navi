import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCoordinateEligibility } from '@/hooks/useCoordinateEligibility';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CoordinatePlaneActivity } from '@/components/practice/CoordinatePlaneActivity';
import { PageMeta } from '@/components/seo/PageMeta';
import { createCoordinateExercise, createCoordinateTransfer, type CoordinateAnswer, type CoordinatePlaneExercise } from '@/features/practice/coordinatePlane';
import { COORDINATE_CURRICULUM } from '@/features/practice/exerciseCurriculum';
import { scoreQuestionWithPenalty } from '@/utils/quizEvaluation';

function CoordinateSession() {
  const { language } = useLanguage();
  const [exercise, setExercise] = useState(() => createCoordinateExercise('read'));
  const [result, setResult] = useState<CoordinateAnswer | null>(null);
  const [original, setOriginal] = useState<{ exercise: CoordinatePlaneExercise; result: CoordinateAnswer } | null>(null);
  const choose = (mode: 'read' | 'plot') => { setExercise(createCoordinateExercise(mode)); setResult(null); setOriginal(null); };
  const controls = 'min-h-11 rounded-xl border-2 border-violet-600 px-4 py-2 font-semibold focus-visible:ring-4 focus-visible:ring-sky-300';
  return <div className="space-y-4 rounded-3xl border bg-white p-4 sm:p-6">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Compétence à travailler">
      <button className={controls} aria-pressed={exercise.mode === 'read'} onClick={() => choose('read')}>Lire des coordonnées</button>
      <button className={controls} aria-pressed={exercise.mode === 'plot'} onClick={() => choose('plot')}>Placer un point</button>
    </div>
    {original && <p className="text-sm text-slate-600">Exercice précédent terminé avec une aide. Score conservé : {scoreQuestionWithPenalty(original.exercise.points ?? 1, original.result.attempts, true).awardedPoints} / {original.exercise.points ?? 1}. Ce nouvel exemple est un essai séparé.</p>}
    <CoordinatePlaneActivity key={exercise.id} exercise={exercise} language={language} onComplete={setResult} />
    {result?.complete && <div className="space-y-3 border-t pt-4"><p>Score de cet exercice : {scoreQuestionWithPenalty(exercise.points ?? 1, result.attempts, true).awardedPoints} / {exercise.points ?? 1}</p>
      {result.supported && !original && <button className={controls} onClick={() => { setOriginal({ exercise, result }); setExercise(createCoordinateTransfer(exercise)); setResult(null); }}>Essayer un nouvel exemple sans aide</button>}
      <button className={`${controls} block`} onClick={() => choose(exercise.mode)}>Un autre exercice</button>
    </div>}
  </div>;
}

export default function CoordinatePlanePage() {
  const eligibility = useCoordinateEligibility();
  return <main className="min-h-screen bg-[#F7F8FC] px-4 pb-28 pt-5"><PageMeta title="Coordonnées dans le plan | Tutorly" description="Lire des coordonnées et placer un point dans un repère." /><div className="mx-auto max-w-xl space-y-4">
    <Link to="/practice" className="inline-flex min-h-11 items-center gap-2 font-semibold"><ArrowLeft className="h-4 w-4" />Retour aux exercices</Link>
    <header><p className="text-sm font-semibold text-primary">{COORDINATE_CURRICULUM.category}</p><h1 className="mt-1 text-2xl font-bold">Coordonnées dans le plan</h1><p className="mt-2 text-slate-600">{COORDINATE_CURRICULUM.label} · Lire et placer un point avec des coordonnées positives ou nulles.</p></header>
    {eligibility.pending ? <p role="status">Vérification du niveau scolaire…</p> : eligibility.allowed ? <CoordinateSession key={eligibility.sessionKey} /> : <p role="alert" className="rounded-xl border bg-white p-4">Cette activité est disponible uniquement pour le programme français de 5ème. Sélectionne le bon profil ou, si tu es administrateur, utilise l’aperçu élève de ce niveau.</p>}
  </div></main>;
}
