import type { DragEvent } from 'react';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';

type Spec = Extract<InteractiveActivitySpec, { kind: 'algebra-tiles' }>;
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (p: ActivityProgress) => void; onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void };
const button = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50';
const tile = 'flex min-h-16 items-center justify-center rounded-xl border-2 font-bold shadow-sm transition-transform motion-safe:hover:scale-105';
const counted = (count: number, singular: string, plural = singular + 's') => `${count} ${count === 1 ? singular : plural}`;
export function AlgebraTilesActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const counts = p.tileCounts ?? { x: 0, units: 0 };
  const { x, units } = spec.target;
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const add = (kind: 'x' | 'units') => {
    if (p.completed) return;
    update({ tileCounts: { ...counts, [kind]: Math.min(12, counts[kind] + 1) }, feedback: '', correct: null });
  };
  const remove = (kind: 'x' | 'units') => {
    if (p.completed) return;
    update({ tileCounts: { ...counts, [kind]: Math.max(0, counts[kind] - 1) }, feedback: '', correct: null });
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData('text/plain');
    if (kind === 'x' || kind === 'units') add(kind);
  };
  const validate = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (counts.x === x && counts.units === units) {
      update({ attempts, completed: true, correct: true, feedback: 'Bravo ! ' + counted(counts.x, 'tuile x', 'tuiles x') + ' et ' + counted(counts.units, 'unité') + ' représentent ' + x + 'x + ' + units + '.' });
      onComplete({ independent: attempts === 1 && p.hintsUsed === 0, attempts, hintsUsed: p.hintsUsed });
    } else {
      const problem = counts.x !== x
        ? 'Regarde le nombre devant x : il indique combien de grandes tuiles x il faut.'
        : 'Le nombre sans x représente les petites unités. Compte-les une par une.';
      update({ attempts, correct: false, feedback: problem });
    }
  };
  const hints = [
    'La grande tuile représente une quantité inconnue, appelée x. La petite tuile vaut 1.',
    'Pour écrire ' + x + 'x, il faut ' + counted(x, 'grande tuile', 'grandes tuiles') + '. Le signe + sépare les unités.',
    'Construis exactement ' + counted(x, 'tuile x', 'tuiles x') + ' et ' + counted(units, 'unité') + '.',
  ];
  const hint = () => {
    if (p.completed || p.phaseHints >= hints.length) return;
    update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, feedback: hints[p.phaseHints] });
  };
  return <div className="space-y-4" data-testid="algebra-tiles-activity">
    <p className="rounded-xl bg-teal-50 p-3 leading-7">Une tuile longue représente <b>x</b>. Un petit carré représente <b>1</b>. Glisse les tuiles dans la zone de travail, ou touche les boutons pour les ajouter.</p>
    <p className="font-bold">Construis l’expression {x}x + {units}.</p>
    <div className="flex flex-wrap gap-3" aria-label="Réserve de tuiles">
      <button type="button" draggable={!p.completed} onDragStart={e => e.dataTransfer.setData('text/plain', 'x')} onClick={() => add('x')} disabled={p.completed} className={tile + ' h-20 w-32 border-indigo-700 bg-indigo-100 text-indigo-900'} aria-label="Ajouter une tuile x">x <span className="ml-2 text-xs">+ Ajouter</span></button>
      <button type="button" draggable={!p.completed} onDragStart={e => e.dataTransfer.setData('text/plain', 'units')} onClick={() => add('units')} disabled={p.completed} className={tile + ' h-16 w-20 border-amber-700 bg-amber-100 text-amber-900'} aria-label="Ajouter une unité">1 <span className="ml-1 text-xs">+</span></button>
    </div>
    <div data-testid="algebra-workspace" onDragOver={e => e.preventDefault()} onDrop={onDrop} className="min-h-36 space-y-3 rounded-2xl border-2 border-dashed border-teal-500 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-700">Ta construction : {counts.x}x + {counts.units}</p>
      <div className="flex flex-wrap items-end gap-2">
        {Array.from({ length: counts.x }, (_, i) => <button key={'x'+i} type="button" onClick={() => remove('x')} disabled={p.completed} className={tile + ' h-20 w-12 border-indigo-700 bg-indigo-200'} aria-label="Retirer une tuile x">x</button>)}
        {Array.from({ length: counts.units }, (_, i) => <button key={'u'+i} type="button" onClick={() => remove('units')} disabled={p.completed} className={tile + ' h-12 w-12 border-amber-700 bg-amber-200'} aria-label="Retirer une unité">1</button>)}
      </div>
      {counts.x + counts.units === 0 && <p className="text-sm text-slate-500">Ajoute tes premières tuiles ici.</p>}
      <p className="text-xs text-slate-600">Touche une tuile placée pour la retirer.</p>
    </div>
    {!p.completed && <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold text-slate-950" onClick={validate}>Valider</button>
      <button type="button" className={button} disabled={p.phaseHints >= 3} onClick={hint}>Indice {p.phaseHints}/3</button>
      <button type="button" className={button} onClick={() => update({ tileCounts: { x: 0, units: 0 }, correct: null, feedback: '' })}>Effacer</button>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
  </div>;
}
