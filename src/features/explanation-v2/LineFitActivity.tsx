import { LineGraph } from './LineGraph';
import { linearRegression, sumSquaredError } from './math';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
type Spec = Extract<InteractiveActivitySpec, { kind: 'line-fit' }>;
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (p: ActivityProgress) => void; onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void };
const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.max(-3, Math.min(3, round(n)));
const format = (n: number) => n.toFixed(1);
export function LineFitActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const slope = p.slope ?? 0, intercept = p.intercept ?? 0;
  const optimum = linearRegression(spec.points);
  const minimum = sumSquaredError(spec.points, optimum.slope, optimum.intercept);
  const error = sumSquaredError(spec.points, slope, intercept);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const change = (m: number, b: number) => { if (!p.completed) update({ slope: clamp(m), intercept: clamp(b), correct: null, feedback: '' }); };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (error - minimum <= 0.051) {
      update({ completed: true, correct: true, attempts, feedback: 'Bravo ! Ta droite minimise presque exactement les écarts avec les points.' });
      onComplete({ independent: attempts === 1 && p.hintsUsed === 0, attempts, hintsUsed: p.hintsUsed });
    } else {
      const mGap = Math.abs(slope - optimum.slope), bGap = Math.abs(intercept - optimum.intercept);
      update({ attempts, correct: false, feedback: mGap > bGap
        ? 'La pente ne suit pas encore la tendance des points. Regarde combien y augmente lorsque x augmente.'
        : 'La pente se rapproche. Déplace la droite vers le haut ou le bas pour réduire les écarts.' });
    }
  };
  const hints = [
    'Les points orange sont des observations. La droite verte est ton modèle. Essaie de laisser de petits écarts de chaque côté.',
    'Commence par régler la pente (m), puis ajuste la hauteur de départ (b). Regarde si l’erreur totale diminue.',
    'Pour ces données, la meilleure pente est proche de ' + format(optimum.slope) + ' et le départ proche de ' + format(optimum.intercept) + '.',
  ];
  const hint = () => { if (!p.completed && p.phaseHints < 3) update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, feedback: hints[p.phaseHints] }); };
  return <div className="space-y-4" data-testid="line-fit-activity">
    <p className="rounded-xl bg-teal-50 p-3 leading-7">{spec.prompt} Les points orange représentent des mesures. Modifie la droite verte pour qu’elle passe au plus près de l’ensemble des points.</p>
    <LineGraph slope={slope} intercept={intercept} onChange={change} points={spec.points} step={0.1} disabled={p.completed} />
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="font-semibold" data-testid="fit-equation">Ta droite : y = {format(slope)}x {intercept < 0 ? '− ' + format(-intercept) : '+ ' + format(intercept)}</p>
      <p className="mt-2 text-sm" data-testid="fit-error">Erreur totale (carrés des écarts) : <b>{format(error)}</b></p>
      <p className="text-xs text-slate-600">Plus cette erreur est petite, plus la droite représente bien les données.</p>
    </div>
    <div className="space-y-3">
      <label className="block font-semibold" htmlFor={'fit-slope-'+spec.id}>Pente m : {format(slope)}</label>
      <input id={'fit-slope-'+spec.id} aria-label="Pente m" className="w-full accent-teal-600" type="range" min="-3" max="3" step="0.1" value={slope} disabled={p.completed} onChange={e => change(Number(e.target.value), intercept)} />
      <label className="block font-semibold" htmlFor={'fit-intercept-'+spec.id}>Départ b : {format(intercept)}</label>
      <input id={'fit-intercept-'+spec.id} aria-label="Départ b" className="w-full accent-teal-600" type="range" min="-3" max="3" step="0.1" value={intercept} disabled={p.completed} onChange={e => change(slope, Number(e.target.value))} />
    </div>
    {!p.completed && <div className="flex flex-wrap gap-2">
      <button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold">Valider l’ajustement</button>
      <button type="button" onClick={hint} disabled={p.phaseHints >= 3} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold disabled:opacity-50">Indice {p.phaseHints}/3</button>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
  </div>;
}
