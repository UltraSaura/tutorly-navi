import { useState } from 'react';
import { LineGraph } from './LineGraph';

/**
 * Original, reusable, manually paced mathematical demonstration.
 * This is teaching content, not a graded activity: no attempts, scores or persistence.
 */
export type MathDemonstrationStep = {
  title: string;
  explanation: string;
  equation: string;
  takeaway: string;
  visual:
    | { kind: 'graph'; slope: number; intercept: number }
    | { kind: 'fractions'; top: { n: number; d: number }; bottom: { n: number; d: number }; total?: { n: number; d: number } };
};

type Props = {
  title: string;
  steps: readonly MathDemonstrationStep[];
  onPractice: () => void;
  practiceLabel?: string;
};

function FractionStrip({ n, d, label }: { n: number; d: number; label: string }) {
  const rows = Math.max(1, Math.ceil(n / d));
  return <div className="space-y-1.5">
    <p className="text-sm font-semibold">{label} : {n}/{d}</p>
    {Array.from({ length: rows }, (_, row) => <div key={row} className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + d + ', minmax(0, 1fr))' }}>
      {Array.from({ length: d }, (_, i) => <div key={i}
        className={'h-10 rounded-md border border-teal-700 motion-safe:transition-colors motion-safe:duration-300 ' + (row * d + i < n ? 'bg-teal-400' : 'bg-white')}
        aria-hidden="true" />)}
    </div>)}
  </div>;
}

export function MathDemonstration({ title, steps, onPractice, practiceLabel = 'À toi de jouer' }: Props) {
  const [index, setIndex] = useState(0);
  if (steps.length === 0) return null;
  const current = steps[Math.min(index, steps.length - 1)];
  const finalStep = index === steps.length - 1;
  return <section data-testid="math-demonstration" aria-label={title} className="space-y-4 rounded-2xl border border-teal-200 bg-white p-3 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <span data-testid="demo-progress" className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
        Étape {index + 1} sur {steps.length}
      </span>
    </div>
    <div className="flex gap-1.5" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Progression de la démonstration">
      {steps.map((_, i) => <div key={i} className={'h-2 flex-1 rounded-full ' + (i <= index ? 'bg-teal-600' : 'bg-slate-200')} />)}
    </div>
    <div className="space-y-3" aria-live="polite" aria-atomic="true">
      <h4 data-testid="demo-step-title" className="font-bold text-teal-900">{current.title}</h4>
      <p className="leading-7 text-slate-800">{current.explanation}</p>
      <p data-testid="demo-equation" className="rounded-xl bg-slate-100 p-3 text-center text-xl font-bold text-slate-900">{current.equation}</p>
      {current.visual.kind === 'graph'
        ? <LineGraph slope={current.visual.slope} intercept={current.visual.intercept} onChange={() => {}} disabled showSteps={current.visual.slope !== 0} />
        : <div data-testid="demo-fractions" className="space-y-3 rounded-xl bg-slate-50 p-3">
          <FractionStrip n={current.visual.top.n} d={current.visual.top.d} label="Première quantité" />
          <FractionStrip n={current.visual.bottom.n} d={current.visual.bottom.d} label="Deuxième quantité" />
          {current.visual.total && <FractionStrip n={current.visual.total.n} d={current.visual.total.d} label="Résultat" />}
        </div>}
      <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">{current.takeaway}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}
        className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-40">Précédent</button>
      {!finalStep
        ? <button type="button" onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))}
            className="min-h-11 rounded-xl bg-teal-600 px-5 py-2 font-bold text-white">Voir l’étape suivante</button>
        : <button type="button" onClick={onPractice}
            className="min-h-11 rounded-xl bg-teal-600 px-5 py-2 font-bold text-white">{practiceLabel}</button>}
      <button type="button" onClick={() => setIndex(0)}
        className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold">Revoir depuis le début</button>
    </div>
    <p className="text-xs text-slate-600">Tu avances à ton rythme. Cette démonstration ne donne pas de note et ne valide pas l’exercice.</p>
  </section>;
}
