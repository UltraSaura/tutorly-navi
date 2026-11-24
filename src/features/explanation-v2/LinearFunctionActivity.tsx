import { useState } from 'react';
import { LineGraph } from './LineGraph';
import { MathDemonstration, type MathDemonstrationStep } from './MathDemonstration';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';

type Spec = Extract<InteractiveActivitySpec, { kind: 'linear-function' }>;
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (p: ActivityProgress) => void; onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void };
type Mode = 'demonstration' | 'exploration' | 'challenge';
const control = 'min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50';
const signed = (n: number) => n < 0 ? '− ' + Math.abs(n) : '+ ' + n;
const signedWord = (n: number) => n === 0 ? 'reste à la même hauteur' : (n < 0 ? 'descend de ' : 'monte de ') + Math.abs(n) + ' case' + (Math.abs(n) > 1 ? 's' : '');

export function functionDemonstrationSteps(target: { m: number; b: number }): MathDemonstrationStep[] {
  const { m, b } = target;
  return [
    {
      title: 'Une droite peut être horizontale',
      explanation: 'Regarde la ligne verte. Quand tu avances vers la droite, elle reste à la même hauteur : ici, y vaut toujours 0.',
      equation: 'y = 0',
      takeaway: 'On commence avec une droite simple. Tu n’as rien à calculer pour le moment.',
      visual: { kind: 'graph', slope: 0, intercept: 0 },
    },
    {
      title: 'Le nombre b donne le point de départ',
      explanation: 'Regarde le point vert sur l’axe vertical. On place ce point à la hauteur ' + b + '. La droite se déplace vers le haut ou vers le bas, mais reste horizontale.',
      equation: 'y = ' + b,
      takeaway: 'b = ' + b + ' signifie que la droite passe par (0 ; ' + b + ').',
      visual: { kind: 'graph', slope: 0, intercept: b },
    },
    {
      title: 'Le nombre m fait pencher la droite',
      explanation: 'Depuis le point vert, avance d’une case vers la droite. Avec m = ' + m + ', la droite ' + signedWord(m) + (m === 0 ? '.' : '.') + ' Observe les pointillés : orange = 1 case à droite, violet = changement de hauteur.',
      equation: 'y = ' + m + 'x ' + signed(b),
      takeaway: 'Le point violet est en (1 ; ' + (m + b) + '). Les deux points déterminent la droite.',
      visual: { kind: 'graph', slope: m, intercept: b },
    },
    {
      title: 'Les deux nombres travaillent ensemble',
      explanation: 'Le nombre b indique où commencer. Le nombre m indique de combien monter ou descendre à chaque pas vers la droite. Tu peux maintenant construire une droite toi-même.',
      equation: 'y = ' + m + 'x ' + signed(b),
      takeaway: 'Retiens : b = départ, m = pente. Essaie les commandes sans crainte : tu peux recommencer.',
      visual: { kind: 'graph', slope: m, intercept: b },
    },
  ];
}

export function LinearFunctionActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('demonstration');
  const p = progress ?? initialActivityProgress();
  const m = p.slope ?? 0, b = p.intercept ?? 0;
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const change = (slope: number, intercept: number) => {
    if (p.completed) return;
    update({ slope: Math.max(-3, Math.min(3, Math.round(slope))), intercept: Math.max(-3, Math.min(3, Math.round(intercept))), correct: null, feedback: '' });
  };
  const check = () => {
    if (p.completed || mode !== 'challenge') return;
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
  const hint = () => { if (p.phaseHints < 3 && !p.completed && mode === 'challenge') update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, feedback: hints[p.phaseHints] }); };
  const controls = <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {([['Pente m', m, 'm'], ['Départ b', b, 'b']] as const).map(([label, value, key]) => <div key={key} className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 text-center font-semibold">{label} : {value}</p>
      <div className="flex justify-center gap-2">
        <button type="button" className={control} disabled={p.completed || value <= -3} onClick={() => change(key === 'm' ? m - 1 : m, key === 'b' ? b - 1 : b)} aria-label={'Diminuer ' + label}>−</button>
        <button type="button" className={control} disabled={p.completed || value >= 3} onClick={() => change(key === 'm' ? m + 1 : m, key === 'b' ? b + 1 : b)} aria-label={'Augmenter ' + label}>+</button>
      </div>
    </div>)}
  </div>;
  return <div className="space-y-4" data-testid="linear-function-activity">
    <div className="flex flex-wrap gap-2" aria-label="Mode d’apprentissage">
      <button type="button" onClick={() => setMode('demonstration')} aria-pressed={mode === 'demonstration'}
        className={control + (mode === 'demonstration' ? ' border-teal-700 bg-teal-50' : '')}>Comprendre</button>
      <button type="button" onClick={() => setMode('exploration')} aria-pressed={mode === 'exploration'}
        className={control + (mode === 'exploration' ? ' border-teal-700 bg-teal-50' : '')}>Explorer</button>
      <button type="button" onClick={() => setMode('challenge')} aria-pressed={mode === 'challenge'}
        className={control + (mode === 'challenge' ? ' border-teal-700 bg-teal-50' : '')}>M’entraîner</button>
    </div>
    {mode === 'demonstration' ? <div className="space-y-2">
      <MathDemonstration title="Comprendre une fonction, pas à pas"
        steps={functionDemonstrationSteps(spec.target)} onPractice={() => setMode('exploration')}
        practiceLabel="Manipuler la droite" />
      <button type="button" className="text-sm font-semibold text-teal-800 underline" onClick={() => setMode('challenge')}>Je connais déjà : passer directement à l’exercice</button>
    </div> : <>
      {mode === 'exploration' ? <div className="rounded-xl bg-teal-50 p-3 leading-7">
        <p className="font-bold">Exploration libre — sans note</p>
        <p>Déplace les points ou utilise les boutons. Observe comment la droite et l’équation changent. Quand tu es prêt, passe au défi.</p>
      </div> : <div className="rounded-xl bg-teal-50 p-3 leading-7">
        <p className="font-bold">À toi de construire la droite !</p>
        <p>{spec.prompt} Règle d’abord le point vert (b), puis la pente avec le point violet (m).</p>
      </div>}
      {mode === 'challenge' && <p className="text-lg font-bold">Objectif : y = {spec.target.m}x {signed(spec.target.b)}</p>}
      <LineGraph slope={m} intercept={b} onChange={change} disabled={p.completed} />
      <p data-testid="live-equation" className="rounded-xl bg-slate-50 p-3 text-center text-xl font-bold" aria-live="polite">Ta droite : y = {m}x {signed(b)}</p>
      {controls}
      {mode === 'exploration' && <button type="button" className="min-h-11 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white" onClick={() => setMode('challenge')}>Passer au défi</button>}
      {mode === 'challenge' && !p.completed && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold">Valider la droite</button>
        <button type="button" onClick={hint} disabled={p.phaseHints >= 3} className={control}>Indice {p.phaseHints}/3</button>
      </div>}
      <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    </>}
  </div>;
}
