import { useState } from 'react';
import { InteractiveActivityHost } from '@/features/explanation-v2/InteractiveActivityHost';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from '@/features/explanation-v2/activityContract';

const activities: InteractiveActivitySpec[] = [
  {
    schemaVersion: 1, id: 'cm2-fractions-001', kind: 'fraction-bar',
    title: 'Additionner des fractions', prompt: 'Observe 3/4 et 1/2. Transforme les moitiés en quarts, puis trouve le total.',
    left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4,
  },
  {
    schemaVersion: 1, id: '4e-coordinates-001', kind: 'coordinate-plane',
    title: 'Placer un point dans un repère', prompt: 'Place le point A(2 ; 3). Commence par l’abscisse, puis l’ordonnée.',
    target: { x: 2, y: 3 },
  },
];
export default function ExplanationV2MathLab() {
  const [selected, setSelected] = useState(0);
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
      {activities.map((activity, index) => <button type="button" key={activity.id} onClick={() => setSelected(index)}
        className={'min-h-11 rounded-xl px-4 py-2 font-semibold ' + (selected === index ? 'bg-teal-600 text-white' : 'border border-slate-300 bg-white text-slate-800')}>
        {index === 0 ? 'CM2 · Fractions' : '4e · Coordonnées'}
      </button>)}
      <button type="button" onClick={() => { setProgress((current) => ({ ...current, [spec.id]: initialActivityProgress() })); setResults((current) => ({ ...current, [spec.id]: '' })); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold">Recommencer</button>
    </div>
    <InteractiveActivityHost spec={spec} progress={progress[spec.id]}
      onProgressChange={(next) => setProgress((current) => ({ ...current, [spec.id]: next }))}
      onComplete={(result) => setResults((current) => ({ ...current, [spec.id]: result.independent ? 'Réussi sans aide' : 'Réussi avec entraînement ou indice' }))} />
    {results[spec.id] && <p role="status" className="rounded-xl bg-teal-50 p-3 font-semibold text-teal-900">{results[spec.id]}</p>}
    <p className="text-xs text-slate-500">Parcours de démonstration uniquement. La validation des leçons réelles reste contrôlée par LessonV2Player.</p>
  </main>;
}
