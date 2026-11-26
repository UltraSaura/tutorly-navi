import { useEffect, useRef, useState } from 'react';
import { LineGraph } from './LineGraph';
import { expectedFractionSteps } from './math';
import type { InteractiveActivitySpec } from './activityContract';

/**
 * Original, reusable, manually paced mathematical demonstration.
 * It records exposure for evidence, but never a score or mastery completion.
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
  onExposure?: () => void;
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

export function MathDemonstration({ title, steps, onPractice, practiceLabel = 'À toi de jouer', onExposure }: Props) {
  const [index, setIndex] = useState(0);
  const exposureRecorded = useRef(false);
  useEffect(() => {
    if (!exposureRecorded.current && onExposure) { exposureRecorded.current = true; onExposure(); }
  }, [onExposure]);
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

/** Derive every displayed quantity from the validated exercise, never from generated prose. */
export function fractionDemonstrationSteps(spec: Extract<InteractiveActivitySpec, { kind: 'fraction-bar' }>): MathDemonstrationStep[] {
  const { left, right, targetDenominator: d } = spec;
  const { leftParts, rightParts, totalParts } = expectedFractionSteps(left, right, d);
  const quotient = Math.floor(totalParts / d);
  const remainder = totalParts % d;
  const mixed = quotient === 0 ? totalParts + '/' + d
    : remainder === 0 ? String(quotient)
      : quotient + ' + ' + remainder + '/' + d;
  return [
    {
      title: 'Observe les deux fractions',
      explanation: 'La première barre est partagée en ' + left.d + ' parts égales, la seconde en ' + right.d + '. On ne peut pas additionner directement des parts de tailles différentes.',
      equation: left.n + '/' + left.d + ' + ' + right.n + '/' + right.d,
      takeaway: 'Avant d’additionner, les deux barres doivent montrer des parts de même taille.',
      visual: { kind: 'fractions', top: left, bottom: right },
    },
    {
      title: 'Partage les barres en parts de même taille',
      explanation: 'On conserve la même quantité coloriée, mais on partage la deuxième barre en ' + d + ' parts égales. Elle contient maintenant ' + rightParts + ' parts coloriées.',
      equation: right.n + '/' + right.d + ' = ' + rightParts + '/' + d,
      takeaway: 'On change la façon de découper la barre, pas la quantité.',
      visual: { kind: 'fractions', top: { n: leftParts, d }, bottom: { n: rightParts, d } },
    },
    {
      title: 'Additionne les parts coloriées',
      explanation: 'Maintenant les parts ont la même taille. Compte les ' + leftParts + ' parts de la première barre et les ' + rightParts + ' de la seconde.',
      equation: leftParts + '/' + d + ' + ' + rightParts + '/' + d + ' = ' + totalParts + '/' + d,
      takeaway: 'On additionne les numérateurs : ' + leftParts + ' + ' + rightParts + ' = ' + totalParts + '. Le dénominateur reste ' + d + '.',
      visual: { kind: 'fractions', top: { n: leftParts, d }, bottom: { n: rightParts, d }, total: { n: totalParts, d } },
    },
    {
      title: 'Lis le résultat',
      explanation: totalParts >= d
        ? 'Une barre complète contient ' + d + ' parts. Avec ' + totalParts + ' parts, on peut aussi écrire le résultat comme un nombre entier et une fraction.'
        : 'Il reste moins d’une barre entière. Le résultat est donc une fraction de la barre.',
      equation: totalParts + '/' + d + ' = ' + mixed,
      takeaway: 'Tu sais pourquoi la réponse vaut ' + totalParts + '/' + d + '. À toi d’essayer sans regarder la solution !',
      visual: { kind: 'fractions', top: { n: leftParts, d }, bottom: { n: rightParts, d }, total: { n: totalParts, d } },
    },
  ];
}
