import { LineGraph } from './LineGraph';
import { bestDiscreteLineFit, linearRegression, parseRationalAnswer, residuals, sumSquaredError } from './math';
import { initialActivityProgress, learningEvidence, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
type Spec = Extract<InteractiveActivitySpec, { kind: 'line-fit' }>;
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (p: ActivityProgress) => void; onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void };
const round = (n: number) => Math.round(n * 10) / 10;
const format = (n: number) => round(n).toFixed(1);
const clamp = (n: number) => Math.max(-3, Math.min(3, round(n)));
export function LineFitActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const evidence = learningEvidence(p);
  const slope = p.slope ?? 0, intercept = p.intercept ?? 0;
  const optimum = linearRegression(spec.points);
  const reachable = bestDiscreteLineFit(spec.points);
  const error = sumSquaredError(spec.points, slope, intercept);
  const rows = residuals(spec.points, slope, intercept);
  const sample = spec.interpretation?.examplePointIndex ?? 0;
  const question = spec.interpretation?.questionPointIndex ?? Math.min(1, spec.points.length - 1);
  const exampleResidual = rows[sample];
  const questionResidual = rows[question];
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const change = (m: number, b: number) => { if (!p.completed && p.phase === 0) update({ slope: clamp(m), intercept: clamp(b), correct: null, feedback: '' }); };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (p.phase === 0) {
      const tolerance = 1e-9 * Math.max(1, Math.abs(reachable.error));
      if (Math.abs(error - reachable.error) <= tolerance) {
        update({ phase: 1, slope: reachable.slope, intercept: reachable.intercept, input: '', attempts, phaseHints: 0, correct: null, feedback: 'Ajustement terminé. Les pointillés violets montrent les résidus. Vérifions comment les interpréter.', learningEvidence: { ...evidence, guidedCompleted: true, assisted: true } });
      } else {
        const gapM = Math.abs(slope - reachable.slope), gapB = Math.abs(intercept - reachable.intercept);
        update({ attempts, correct: false, feedback: gapM > gapB
          ? 'La pente ne suit pas encore la tendance des points. Regarde comment les écarts changent quand x varie.'
          : 'La pente se rapproche. Déplace la droite vers le haut ou le bas pour réduire les écarts.', learningEvidence: { ...evidence, assisted: true } });
      }
      return;
    }
    if (p.phase === 1) {
      if (p.input === 'avoid-cancel') update({ phase: 2, input: '', attempts, phaseHints: 0, correct: null, feedback: 'Exact. Lis maintenant un résidu sur un autre point.' });
      else update({ attempts, correct: false, feedback: 'Un résidu peut être positif ou négatif. Pense à ce qui se passe si on les additionne directement.', learningEvidence: { ...evidence, assisted: true, transferAttempts: evidence.transferAttempts + 1 } });
      return;
    }
    const answer = parseRationalAnswer(p.input);
    const expected = Math.round(questionResidual.residual * 10) / 10;
    const numericAnswer = answer ? Number(answer.numerator) / Number(answer.denominator) : Number.NaN;
    const transferAttempts = evidence.transferAttempts + 1;
    if (Number.isFinite(numericAnswer) && Math.abs(numericAnswer - expected) <= 0.050000001) {
      const independent = transferAttempts === 1 && evidence.transferHintsUsed === 0;
      update({ completed: true, correct: true, attempts, feedback: 'Exact. Le résidu est observé − prévu = ' + format(expected) + '. Un résidu positif signifie que le point est au-dessus de la valeur prévue.', learningEvidence: { ...evidence, independent, transfer: true, transferAttempts, assisted: evidence.assisted || !independent } });
      onComplete({ independent, attempts, hintsUsed: p.hintsUsed });
    } else update({ attempts, correct: false, feedback: answer ? 'Soustrais la valeur prévue de la valeur observée, puis arrondis au dixième.' : 'Écris un nombre, par exemple 0,3 ou −0,4.', learningEvidence: { ...evidence, assisted: true, transferAttempts } });
  };
  const hints = p.phase === 1
    ? ['Les résidus sont des écarts signés entre la mesure et la valeur prévue.', 'Un résidu positif et un résidu négatif peuvent s’annuler si on les additionne.', 'Les mettre au carré les rend tous positifs : aucun ne peut annuler l’autre.']
    : ['Le résidu vaut valeur observée moins valeur prévue.', 'Lis l’ordonnée du point orange et celle de la droite au même x, puis soustrais.', 'Le résidu demandé vaut ' + format(questionResidual.residual) + '.'];
  const hint = () => {
    if (p.completed || p.phase === 0 || p.phaseHints >= 3) return;
    const next = p.phaseHints + 1;
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, feedback: hints[next - 1], learningEvidence: { ...evidence, assisted: true, transferHintsUsed: evidence.transferHintsUsed + 1, ...(next === 3 ? { disclosedItems: evidence.disclosedItems.includes('linefit-residual-check') ? evidence.disclosedItems : [...evidence.disclosedItems, 'linefit-residual-check'] } : {}) } });
  };
  const concept = <div className="rounded-xl bg-indigo-50 p-3 text-sm leading-6" data-testid="residual-explanation">
    <p><b>Résidu = valeur observée − valeur prévue.</b> Le pointillé violet relie le point orange à la hauteur prévue par la droite.</p>
    <p>Au point x = {exampleResidual.x}, la droite prévoit {format(exampleResidual.predicted)} et la mesure vaut {format(exampleResidual.y)} : le résidu est {format(exampleResidual.residual)}.</p>
    <p>Des résidus positifs et négatifs peuvent s’annuler si on les additionne. Leur carré est toujours positif ou nul : les écarts ne se cachent plus les uns les autres.</p>
  </div>;
  const multipleChoice = p.phase === 1 && <div className="space-y-2" role="group" aria-label="Pourquoi comparer les carrés des résidus ?">
    <p className="font-semibold">Pourquoi utilise-t-on les carrés des résidus ?</p>
    <button type="button" className="min-h-11 w-full rounded-xl border p-3 text-left" onClick={() => update({ input: 'avoid-cancel' })} aria-pressed={p.input === 'avoid-cancel'}>Parce que des écarts positifs et négatifs pourraient s’annuler; les carrés évitent cette annulation.</button>
    <button type="button" className="min-h-11 w-full rounded-xl border p-3 text-left" onClick={() => update({ input: 'positive-slope' })} aria-pressed={p.input === 'positive-slope'}>Pour rendre automatiquement la pente positive.</button>
    <button type="button" className="min-h-11 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white" onClick={check}>Vérifier mon explication</button>
  </div>;
  return <div className="space-y-4" data-testid="line-fit-activity">
    <p className="rounded-xl bg-teal-50 p-3 leading-7">{spec.prompt} Les points orange sont des observations. La droite verte est un modèle; ajuste-la pour réduire la somme des carrés des écarts.</p>
    {concept}
    <LineGraph slope={slope} intercept={intercept} onChange={change} points={spec.points} step={0.1} disabled={p.completed || p.phase !== 0} showResiduals />
    <p className="text-sm text-slate-700">Résidu = observé − prévu. Les pointillés violets montrent chaque écart vertical. Un résidu au-dessus de zéro est positif; sous zéro, il est négatif. Leur somme peut s’annuler, alors que la somme de leurs carrés mesure l’écart sans annulation.</p>
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="font-semibold" data-testid="fit-equation">Ta droite : y = {format(slope)}x {intercept < 0 ? '− ' + format(-intercept) : '+ ' + format(intercept)}</p>
      <p className="mt-2 text-sm" data-testid="fit-error">Somme des carrés des résidus : <b>{format(error)}</b></p>
      <p className="text-xs text-slate-600">Le calcul utilise les valeurs non arrondies; l’affichage est arrondi au dixième.</p>
    </div>
    {p.phase === 0 && <div className="space-y-3">
      <label className="block font-semibold" htmlFor={'fit-slope-'+spec.id}>Pente m : {format(slope)}</label>
      <input id={'fit-slope-'+spec.id} aria-label="Pente m" className="w-full accent-teal-600" type="range" min="-3" max="3" step="0.1" value={slope} disabled={p.completed} onChange={e => change(Number(e.target.value), intercept)} />
      <label className="block font-semibold" htmlFor={'fit-intercept-'+spec.id}>Départ b : {format(intercept)}</label>
      <input id={'fit-intercept-'+spec.id} aria-label="Départ b" className="w-full accent-teal-600" type="range" min="-3" max="3" step="0.1" value={intercept} disabled={p.completed} onChange={e => change(slope, Number(e.target.value))} />
      <button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold">Valider l’ajustement</button>
    </div>}
    {multipleChoice}
    {p.phase === 2 && <div className="space-y-2 rounded-xl border p-3" data-testid="residual-transfer-question">
      <p className="font-bold">Question indépendante</p>
      <p>Pour le point orange x = {questionResidual.x}, la valeur observée est {format(questionResidual.y)} et la droite prévoit {format(questionResidual.predicted)}. Quel est le résidu (observé − prévu), arrondi au dixième ?</p>
      <label className="block font-semibold" htmlFor={'residual-answer-'+spec.id}>Résidu</label>
      <div className="flex flex-wrap gap-2"><input id={'residual-answer-'+spec.id} aria-label="Résidu au dixième" inputMode="decimal" className="min-h-11 w-32 rounded-xl border px-3" value={p.input} onChange={e => update({ input: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') check(); }} /><button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-600 px-4 font-bold text-white">Valider le résidu</button><button type="button" onClick={hint} disabled={p.phaseHints >= 3} className="min-h-11 rounded-xl border px-4">Indice {p.phaseHints}/3</button></div>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && <p className="font-semibold text-teal-800">Interprétation et transfert réussis.</p>}
    <output className="hidden" data-testid="line-fit-best-discrete">{JSON.stringify(reachable)}</output>
    <output className="hidden" data-testid="line-fit-theoretical">{JSON.stringify(optimum)}</output>
  </div>;
}
