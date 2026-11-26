import { useState } from 'react';
import { Cm2LessonPreview } from '@/features/explanation-v2/Cm2LessonPreview';
import { InteractiveActivityHost } from '@/features/explanation-v2/InteractiveActivityHost';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from '@/features/explanation-v2/activityContract';

const activities: InteractiveActivitySpec[] = [
  {
    schemaVersion: 1, id: 'cm2-select-quarters-001', kind: 'fraction-select', schoolLevel: 'CM2',
    title: 'Construire la fraction 3/4', prompt: 'Sélectionne trois des quatre parts égales.',
    target: { n: 3, d: 4 }, transfer: { n: 2, d: 5 },
  },
  {
    schemaVersion: 1, id: 'cm2-fractions-001', kind: 'fraction-bar', schoolLevel: 'CM2',
    title: 'Additionner des fractions', prompt: 'Observe 3/4 et 1/2. Transforme les moitiés en quarts, puis trouve le total.',
    left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
    transfer: { left: { n: 1, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 },
  },
  {
    schemaVersion: 1, id: '4e-coordinates-001', kind: 'coordinate-plane', schoolLevel: '4e',
    title: 'Placer un point dans un repère', prompt: 'Place le point A(2 ; 3). Commence par l’abscisse, puis l’ordonnée.',
    target: { x: 2, y: 3 }, transfer: { x: -2, y: 1 },
  },
  {
    schemaVersion: 1, id: '5e-algebra-tiles-001', kind: 'algebra-tiles', schoolLevel: '5e',
    title: 'Construire une expression', prompt: 'Représente 2x + 3 avec des tuiles.',
    target: { x: 2, units: 3 }, transfer: { x: 3, units: 2 },
  },
  {
    schemaVersion: 1, id: '3e-function-001', kind: 'linear-function', schoolLevel: '3e',
      title: 'Fonction affine : f(x) = ax + b', prompt: 'Construis la droite de la fonction affine f(x) = 2x + 1.',
    target: { m: 2, b: 1 }, transfer: { m: -2, b: 3 },
  },
  {
    schemaVersion: 1, id: '5e-equation-001', kind: 'equation-decomposition', schoolLevel: '5e',
    title: 'Résoudre une équation, pas à pas', prompt: 'Comment trouver x dans 3x + 5 = 20 ? Observe, puis essaie.', a: 3, b: 5, c: 20,
    transfer: { a: 2, b: 4, c: 18 },
  },
  {
    schemaVersion: 1, id: '4e-equation-both-001', kind: 'equation-decomposition', schoolLevel: '4e',
    title: 'Les x des deux côtés', prompt: 'Résous 5x − 4 = 2x + 8 en conservant l’égalité.', a: 5, b: -4, d: 2, c: 8,
    transfer: { a: 4, b: 1, d: 2, c: 9 },
  },
  {
    schemaVersion: 1, id: '3e-equation-fraction-001', kind: 'equation-decomposition', schoolLevel: '3e',
    title: 'Une solution fractionnaire', prompt: 'Résous −2x + 3 = 8. La solution peut être une fraction.', a: -2, b: 3, c: 8,
    transfer: { a: -3, b: 2, c: 7 },
  },
  {
    schemaVersion: 1, id: '2nde-line-fit-001', kind: 'line-fit', schoolLevel: '2nde',
    title: 'Ajuster une droite à des données', prompt: 'Ajuste la pente et le départ pour réduire les écarts.',
    points: [{ x: -2, y: -2 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }],
    interpretation: { examplePointIndex: 1, questionPointIndex: 2 },
  },
];
export default function ExplanationV2MathLab() {
  const [selected, setSelected] = useState(0);
  const [showLesson, setShowLesson] = useState(false);
  const [progress, setProgress] = useState<Record<string, ActivityProgress>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const spec = activities[selected];
  return <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-slate-50 p-3 sm:p-8">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Stuwy · Explanation V2 · laboratoire local</p>
      <h1 className="text-2xl font-extrabold text-slate-900">Mathématiques interactives</h1>
      <p className="text-sm text-slate-600">Données simulées. Aucun accès à Supabase, aucune note enregistrée.</p>
    </header>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setShowLesson(true)} className="min-h-11 rounded-xl bg-slate-900 px-5 py-2 font-bold text-white">Parcours complet CM2 · 5 étapes</button>
    </div>
    {showLesson ? <Cm2LessonPreview onExit={() => setShowLesson(false)} /> : <>
    <div className="flex flex-wrap gap-2">
      {activities.map((activity, index) => <button type="button" key={activity.id} onClick={() => setSelected(index)}
        className={'min-h-11 rounded-xl px-4 py-2 font-semibold ' + (selected === index ? 'bg-teal-600 text-white' : 'border border-slate-300 bg-white text-slate-800')}>
        {activity.kind === 'fraction-select' ? 'CM2 · Sélectionner 3/4' : activity.kind === 'fraction-bar' ? 'CM2 · Additionner' : activity.kind === 'coordinate-plane' ? '4e · Coordonnées' : activity.kind === 'algebra-tiles' ? '5e · Tuiles'  : activity.kind === 'linear-function' ? '3e · Fonction affine' : activity.kind === 'equation-decomposition' ? activity.schoolLevel + ' · Équations (' + (activity.d ? 'deux côtés' : activity.a < 0 ? 'fraction' : 'simple') + ')' : '2nde · Ajustement'}
      </button>)}
      <button type="button" onClick={() => { setProgress((current) => ({ ...current, [spec.id]: initialActivityProgress() })); setResults((current) => ({ ...current, [spec.id]: '' })); }} className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">Réinitialiser l’exercice</button>
    </div>
    <InteractiveActivityHost spec={spec} progress={progress[spec.id]}
      onProgressChange={(next) => setProgress((current) => ({ ...current, [spec.id]: next }))}
      onComplete={(result) => setResults((current) => ({ ...current, [spec.id]: result.independent ? 'Réussi sans aide' : 'Réussi avec entraînement ou indice' }))} />
    {results[spec.id] && <p role="status" className="rounded-xl bg-teal-50 p-3 font-semibold text-teal-900">{results[spec.id]}</p>}
    <p className="text-xs text-slate-500">Parcours de démonstration uniquement. La validation des leçons réelles reste contrôlée par LessonV2Player.</p>
    </>}
  </main>;
}
