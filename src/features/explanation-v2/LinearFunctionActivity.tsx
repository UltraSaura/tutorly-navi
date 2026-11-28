import { useState } from 'react';
import { LineGraph } from './LineGraph';
import { MathDemonstration, type MathDemonstrationStep } from './MathDemonstration';
import { initialActivityProgress, learningEvidence, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { MathTextTree } from '@/components/math/MathText';

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
      title: 'Une fonction affine peut être constante',
      explanation: 'Regarde la ligne verte. Quand tu avances vers la droite, elle reste à la même hauteur : ici, f(x) vaut toujours 0.',
      equation: 'f(x) = 0',
      takeaway: 'On commence avec une droite simple. Tu n’as rien à calculer pour le moment.',
      visual: { kind: 'graph', slope: 0, intercept: 0 },
    },
    {
      title: 'L’ordonnée à l’origine b donne le point de départ',
      explanation: 'Regarde le point vert sur l’axe vertical. On place ce point à la hauteur ' + b + '. La droite se déplace vers le haut ou vers le bas, mais reste horizontale.',
      equation: 'f(x) = ' + b,
      takeaway: 'b = ' + b + ' signifie que la droite passe par (0 ; ' + b + ').',
      visual: { kind: 'graph', slope: 0, intercept: b },
    },
    {
      title: 'Le coefficient directeur a fait pencher la droite',
      explanation: 'Depuis le point vert, avance d’une case vers la droite. Avec a = ' + m + ', la droite ' + signedWord(m) + '.' + ' Observe les pointillés : orange = 1 case à droite, violet = changement de hauteur.',
      equation: 'f(x) = ' + m + 'x ' + signed(b),
      takeaway: 'Le point violet est en (1 ; ' + (m + b) + '). Les deux points déterminent la droite.',
      visual: { kind: 'graph', slope: m, intercept: b },
    },
    {
      title: 'Le coefficient directeur a et l’ordonnée à l’origine b',
      explanation: 'Le nombre b indique où commencer. Le nombre a indique de combien monter ou descendre à chaque pas vers la droite. Tu peux maintenant construire une droite toi-même.',
      equation: 'f(x) = ' + m + 'x ' + signed(b),
      takeaway: 'Retiens : a donne le coefficient directeur et b l’ordonnée à l’origine. Essaie les commandes : tu peux recommencer.',
      visual: { kind: 'graph', slope: m, intercept: b },
    },
  ];
}

export function LinearFunctionActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('demonstration');
  const p = progress ?? initialActivityProgress();
  const evidence = learningEvidence(p);
  const a = p.slope ?? 0, b = p.intercept ?? 0;
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const change = (slope: number, intercept: number) => {
    if (p.completed) return;
    update({ slope: Math.max(-3, Math.min(3, Math.round(slope))), intercept: Math.max(-3, Math.min(3, Math.round(intercept))), correct: null, feedback: '' });
  };
  const check = () => {
    if (p.completed || mode !== 'challenge') return;
    const attempts = p.attempts + 1;
    if (spec.transfer && p.phase === 1) {
      const value = Number(p.input.trim());
      if (p.input.trim() !== '' && Number.isInteger(value) && value === spec.transfer.b) update({ phase: 2, input: '', attempts, phaseHints: 0, correct: null, feedback: 'Exact : f(0) = b. Que devient f(x) quand x augmente de 1 ?' });
      else update({ attempts, correct: false, feedback: 'Quand x = 0, le terme ax vaut zéro. Relis la valeur de la fonction en 0.', learningEvidence: { ...evidence, assisted: true, transferAttempts: evidence.transferAttempts + 1 } });
      return;
    }
    if (spec.transfer && p.phase === 2) {
      const value = Number(p.input.trim());
      if (p.input.trim() !== '' && Number.isInteger(value) && value === spec.transfer.m) update({ phase: 3, input: '', slope: 0, intercept: 0, attempts, phaseHints: 0, correct: null, feedback: 'Oui : pour un pas vers la droite, la variation verticale est a. Construis maintenant la droite.' });
      else update({ attempts, correct: false, feedback: 'Le coefficient directeur indique la variation de f(x) pour un pas vers la droite. Vérifie son signe et sa valeur.', learningEvidence: { ...evidence, assisted: true, transferAttempts: evidence.transferAttempts + 1 } });
      return;
    }
    const transferPhase = p.phase === 3 && !!spec.transfer;
    const target = transferPhase ? spec.transfer! : spec.target;
    if (a === target.m && b === target.b) {
      if (!transferPhase && spec.transfer) {
        update({ phase: 1, input: '', slope: 0, intercept: 0, attempts, phaseHints: 0, correct: null, feedback: 'Exemple construit. Passons à une autre fonction : prédis d’abord sa valeur en zéro.', learningEvidence: { ...evidence, guidedCompleted: true, assisted: true, disclosedItems: evidence.disclosedItems.includes('affine-base') ? evidence.disclosedItems : [...evidence.disclosedItems, 'affine-base'] } });
        return;
      }
      const independent = transferPhase && evidence.transferAttempts === 0 && evidence.transferHintsUsed === 0;
      update({ completed: true, correct: true, attempts, feedback: transferPhase ? 'Bravo ! Tu as interprété puis construit une autre fonction affine.' : 'Bravo ! La fonction affine a le bon coefficient directeur et la bonne ordonnée à l’origine.', learningEvidence: { ...evidence, independent, transfer: transferPhase, transferAttempts: transferPhase ? evidence.transferAttempts + 1 : evidence.transferAttempts, assisted: evidence.assisted || p.hintsUsed > 0 } });
      onComplete({ independent, attempts, hintsUsed: p.hintsUsed });
    } else update({ attempts, correct: false, feedback: b !== target.b
      ? 'La droite ne coupe pas encore l’axe vertical à la bonne hauteur. Ajuste le point vert.'
      : 'Le point de départ est bon. Vérifie la pente : pour 1 pas vers la droite, de combien faut-il monter ou descendre ?', learningEvidence: { ...evidence, assisted: true, ...(transferPhase ? { transferAttempts: evidence.transferAttempts + 1 } : {}) } });
  };
  const hints = p.phase === 1 && spec.transfer
    ? ['Remplace x par zéro dans f(x) = ax + b.', 'Le terme a × 0 vaut zéro; il reste b.', 'f(0) = ' + spec.transfer.b + '.']
    : p.phase === 2 && spec.transfer
      ? ['Repère le coefficient devant x.', 'Quand x augmente de 1, le terme ax augmente de a.', 'La variation est ' + spec.transfer.m + '.']
      : p.phase === 3 && spec.transfer
        ? ['Place d’abord le point de la droite lorsque x = 0.', 'Pour un pas à droite, applique la variation que tu viens de trouver.', 'Utilise le point de départ et la variation pour régler la droite.']
        : ['Dans f(x) = ax + b, b est l’endroit où la droite coupe l’axe vertical.', 'a est le coefficient directeur : quand x augmente de 1, f(x) change de a.', 'Relis la fonction cible et compare son point de départ et sa variation.'];
  const hint = () => {
    if (p.phaseHints >= 3 || p.completed || mode !== 'challenge') return;
    const next = p.phaseHints + 1;
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, feedback: hints[next - 1], learningEvidence: { ...evidence, assisted: true, ...(p.phase >= 1 ? { transferHintsUsed: evidence.transferHintsUsed + 1 } : {}), ...(p.phase >= 1 && next === 3 ? { disclosedItems: evidence.disclosedItems.includes('affine-transfer') ? evidence.disclosedItems : [...evidence.disclosedItems, 'affine-transfer'] } : {}) } });
  };
  const enterChallenge = () => {
    setMode('challenge');
    if (!evidence.disclosedItems.includes('affine-base')) update({ learningEvidence: { ...evidence, disclosedItems: [...evidence.disclosedItems, 'affine-base'] } });
  };
  const controls = <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {([['Coefficient directeur a', a, 'a'], ['Ordonnée à l’origine b', b, 'b']] as const).map(([label, value, key]) => <div key={key} className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 text-center font-semibold">{label} : {value}</p>
      <div className="flex justify-center gap-2">
        <button type="button" className={control} disabled={p.completed || value <= -3} onClick={() => change(key === 'a' ? a - 1 : a, key === 'b' ? b - 1 : b)} aria-label={'Diminuer ' + label}>−</button>
        <button type="button" className={control} disabled={p.completed || value >= 3} onClick={() => change(key === 'a' ? a + 1 : a, key === 'b' ? b + 1 : b)} aria-label={'Augmenter ' + label}>+</button>
      </div>
    </div>)}
  </div>;
  return <MathTextTree><div className="space-y-4" data-testid="linear-function-activity">
    <div className="flex flex-wrap gap-2" aria-label="Mode d’apprentissage">
      <button type="button" onClick={() => setMode('demonstration')} aria-pressed={mode === 'demonstration'}
        className={control + (mode === 'demonstration' ? ' border-teal-700 bg-teal-50' : '')}>Comprendre</button>
      <button type="button" onClick={() => setMode('exploration')} aria-pressed={mode === 'exploration'}
        className={control + (mode === 'exploration' ? ' border-teal-700 bg-teal-50' : '')}>Explorer</button>
      <button type="button" onClick={enterChallenge} aria-pressed={mode === 'challenge'}
        className={control + (mode === 'challenge' ? ' border-teal-700 bg-teal-50' : '')}>M’entraîner</button>
    </div>
    {mode === 'demonstration' ? <div className="space-y-2">
      <MathDemonstration title="Comprendre une fonction, pas à pas"
        steps={functionDemonstrationSteps(spec.target)} onPractice={() => setMode('exploration')}
        onExposure={() => update({ learningEvidence: { ...evidence, exposure: true, disclosedItems: evidence.disclosedItems.includes('affine-base') ? evidence.disclosedItems : [...evidence.disclosedItems, 'affine-base'] } })}
        practiceLabel="Manipuler la droite" />
      <button type="button" className="min-h-11 rounded-md px-2 text-sm font-semibold text-teal-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700" onClick={enterChallenge}>Je connais déjà : passer directement à l’exercice</button>
    </div> : <>
      {mode === 'exploration' ? <div className="rounded-xl bg-teal-50 p-3 leading-7">
        <p className="font-bold">Exploration libre — sans note</p>
        <p>Déplace les points ou utilise les boutons. Observe comment la droite et l’équation changent. Quand tu es prêt, passe au défi.</p>
      </div> : <div className="rounded-xl bg-teal-50 p-3 leading-7">
        <p className="font-bold">{p.phase >= 1 && spec.transfer ? 'Transfert · Interprète puis construis une autre fonction' : 'À toi de construire la droite !'}</p>
        <p>{p.phase === 1 && spec.transfer ? 'Pour f(x) = ' + spec.transfer.m + 'x ' + signed(spec.transfer.b) + ', prédis f(0).' : p.phase === 2 && spec.transfer ? 'Pour cette fonction, quelle variation observe-t-on quand x augmente de 1 ?' : p.phase === 3 && spec.transfer ? 'Construis une droite qui coupe l’axe vertical en ' + spec.transfer.b + ' et varie de ' + spec.transfer.m + ' pour +1 en x. Ajuste les contrôles puis valide.' : spec.prompt}</p>
      </div>}
      {mode === 'challenge' && p.phase === 0 && <p className="text-lg font-bold">Fonction à représenter : f(x) = {spec.target.m}x {signed(spec.target.b)}</p>}
      {mode === 'challenge' && p.phase === 1 && <label className="block font-semibold" htmlFor={'affine-transfer-' + spec.id}>f(0) = ? <input id={'affine-transfer-' + spec.id} aria-label="Valeur de f(0)" className="ml-2 min-h-11 w-24 rounded border px-3" inputMode="numeric" value={p.input} onChange={e => update({ input: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') check(); }} /><button type="button" className="ml-2 min-h-11 rounded bg-teal-600 px-3 font-bold text-white" onClick={check}>Vérifier f(0)</button></label>}
      {mode === 'challenge' && p.phase === 2 && <label className="block font-semibold" htmlFor={'affine-change-' + spec.id}>Variation pour +1 en x = ? <input id={'affine-change-' + spec.id} aria-label="Variation de f lorsque x augmente de 1" className="ml-2 min-h-11 w-24 rounded border px-3" inputMode="numeric" value={p.input} onChange={e => update({ input: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') check(); }} /><button type="button" className="ml-2 min-h-11 rounded bg-teal-600 px-3 font-bold text-white" onClick={check}>Vérifier la variation</button></label>}
      <LineGraph slope={a} intercept={b} onChange={change} disabled={p.completed} affineNotation />
      <p data-testid="live-equation" className="rounded-xl bg-slate-50 p-3 text-center text-xl font-bold" aria-live="polite">Ta fonction affine : f(x) = {a}x {signed(b)}</p>
      {controls}
      {mode === 'exploration' && <button type="button" className="min-h-11 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white" onClick={enterChallenge}>Passer au défi</button>}
      {mode === 'challenge' && !p.completed && (p.phase === 0 || p.phase === 3) && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={check} className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold">{p.phase === 3 ? 'Valider le transfert' : 'Valider la droite'}</button>
        <button type="button" onClick={hint} disabled={p.phaseHints >= 3} className={control}>Indice {p.phaseHints}/3</button>
      </div>}
      <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    </>}
  </div></MathTextTree>;
}
