import { LineGraph } from './LineGraph';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
type Spec = Extract<InteractiveActivitySpec, { kind: 'linear-function' }>;
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (p: ActivityProgress) => void; onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void };
const control = 'min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50';
const signed = (n: number) => n < 0 ? '− ' + Math.abs(n) : '+ ' + n;
export function LinearFunctionActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const m = p.slope ?? 0, b = p.intercept ?? 0;
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const change = (slope: number, intercept: number) => {
    if (p.completed) return;
    update({ slope: Math.max(-3, Math.min(3, Math.round(slope))), intercept: Math.max(-3, Math.min(3, Math.round(intercept))), correct: null, feedback: '' });
  };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (m === spec.target.m && b === spec.target.b) {
      update({ completed: true, correct: true, attempts, feedback: 'Bravo ! La droite a la bonne pente et coupe l’axe vertical au bon endroit.' });
      onComplete({ independent: attempts === 1 && p.hintsUsed === 0, attempts, hintsUsed: p.hintsUsed });
    } else update({ attempts, correct: false, feedback: b !== spec.target.b
      ? 'La droite ne coupe pas encore l’axe vertical à la bonne hauteur. Ajuste le point vert.'
      : 'Le point de départ est bon. Vérifie la pente : pour 1 pas vers la droite, de combien faut-il monter ou descendre ?' });
  };
  const hints = [
    'Dans y = mx + b, b est l’endroit où la droite coupe l’axe vertical.',
    'm est la pente : quand x augmente de 1, y change de m.',
    'Essaie b = ' + spec.target.b + ' et m = ' + spec.target.m + '.',
  ];
  const hint = () => { if (p.phaseHints < 3 && !p.completed) update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, feedback: hints[p.phaseHints] }); };
  return <div className="space-y-4" data-testid="linear-function-activity">
    <p className="rounded-xl bg-teal-50 p-3 leading-7">{spec.prompt} Dans l’équation y = mx + b, <b>m</b> indique la pente et <b>b</b> le point de départ sur l’axe vertical.</p>
    <p className="text-lg font-bold">Objectif : y = {spec.target.m}x {signed(spec.target.b)}</p>
    <LineGraph slope={m} intercept={b} onChange={change} disabled={p.completed} />
    <p data-testid="live-equation" className="rounded-xl bg-slate-50 p-3 text-center text-xl font-bold" aria-live="polite">Ta droite : y = {m}x {signed(b)}</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {([['Pente m', m, 'm'], ['Départ b', b, 'b']] as const).map(([label, value, key]) => <div key={key} className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-center font-semibold">{label} : {value}</p>
        <div className="flex justify-center gap-2">
          <button type="button" className={control} disabled={p.completed || value <= -3} onClick={() => change(key === 'm' ? m-1 : m, key === 'b' ? b-1 : b)} aria-label={'Diminuer ' + label}>−</button>
          <button type="button" className={control} disabled={p.completed || value >= 3} onClick={() => change(key === 'm' ? m+1 : m, key === 'b' ? b+1 : b)} aria-label={'Augmenter ' + label}>+</button>
        </div>
      </div>)}
    </div>
    {!p.completed && <div className="flex flex-wrap gap-2">
      <button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold">Valider la droite</button>
      <button type="button" onClick={hint} disabled={p.phaseHints >= 3} className={control}>Indice {p.phaseHints}/3</button>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
  </div>;
}
