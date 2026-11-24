import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { namedParts } from './pedagogicalQuestions';

type Spec = Extract<InteractiveActivitySpec, { kind: 'fraction-select' }>;
type Completion = { independent: boolean; attempts: number; hintsUsed: number };
type Props = {
  spec: Spec;
  progress?: ActivityProgress;
  onProgressChange: (progress: ActivityProgress) => void;
  onComplete: (result: Completion) => void;
};
const action = 'min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-50';
const control = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50';

/** Reusable tactile/keyboard fraction construction; no Supabase writes or generated answer grading. */
export function FractionSelectActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const selected = (p.selectedParts ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < spec.target.d);
  const { n, d } = spec.target;
  const parts = namedParts(d);
  const isYoung = !spec.schoolLevel || ['CE1', 'CE2', 'CM1', 'CM2', '6e'].includes(spec.schoolLevel);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const toggle = (index: number) => {
    if (p.completed) return;
    const next = selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index];
    update({ selectedParts: next, correct: null, feedback: '' });
  };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (selected.length === n) {
      update({ attempts, completed: true, correct: true, feedback: 'Bravo ! Tu as sélectionné ' + n + ' ' + parts + ' sur ' + d + ' : c’est bien ' + n + '/' + d + '.' });
      onComplete({ independent: attempts === 1 && p.hintsUsed === 0, attempts, hintsUsed: p.hintsUsed });
    } else {
      update({
        attempts, correct: false,
        feedback: 'Tu as sélectionné ' + selected.length + ' ' + parts + '. Regarde le nombre du haut dans ' + n + '/' + d + ' : combien de parts faut-il colorier ? Tu peux toucher une part pour l’ajouter ou la retirer.',
      });
    }
  };
  const hints = [
    'Le nombre du bas (' + d + ') indique en combien de parts égales la barre est partagée.',
    'Le nombre du haut indique combien de parts il faut sélectionner. Tu peux toucher une case pour changer sa couleur.',
    'Pour ' + n + '/' + d + ', sélectionne exactement ' + n + ' ' + parts + ' parmi les ' + d + '.',
  ];
  const hint = () => {
    if (p.completed || p.phaseHints >= hints.length) return;
    update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, feedback: hints[p.phaseHints] });
  };
  return <div className="space-y-4" data-testid="fraction-select-activity">
    <div className="space-y-2 rounded-xl bg-teal-50 p-3">
      <p className="text-sm font-bold text-teal-800">Construis une fraction</p>
      <p className="text-base leading-7 text-slate-800">
        {isYoung
          ? 'Cette barre est partagée en ' + d + ' parts égales. Chaque case représente un ' + (d === 4 ? 'quart' : 'morceau') + ' de la barre.'
          : 'Le dénominateur ' + d + ' donne le nombre de parts égales ; le numérateur ' + n + ' donne le nombre de parts à sélectionner.'}
      </p>
      <p className="text-base font-bold leading-7 text-slate-900" data-testid="fraction-select-question">
        Sélectionne {n} {parts} sur les {d} parts de la barre pour représenter la fraction {n}/{d}.
      </p>
      <p className="text-sm text-slate-700">Touche les cases pour les colorier ou les effacer, puis appuie sur « Valider ».</p>
    </div>
    <div className="overflow-x-auto rounded-xl bg-slate-50 p-3" aria-label={'Barre de fraction divisée en ' + d + ' parts'}>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + d + ', minmax(44px, 1fr))', minWidth: d * 48 }}>
        {Array.from({ length: d }, (_, i) => {
          const active = selected.includes(i);
          return <button key={i} type="button" data-testid={'fraction-part-' + i}
            aria-pressed={active} aria-label={'Part ' + (i + 1) + ' sur ' + d + (active ? ', sélectionnée' : ', non sélectionnée')}
            disabled={p.completed} onClick={() => toggle(i)}
            className={'min-h-16 rounded-lg border-2 border-teal-700 transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ' + (active ? 'bg-teal-400' : 'bg-white hover:bg-teal-50')}
          ><span aria-hidden="true" className="font-bold text-slate-900">{active ? '✓' : ''}</span></button>;
        })}
      </div>
    </div>
    <p className="font-semibold text-slate-800" aria-live="polite" data-testid="fraction-selected-count">
      Parts sélectionnées : {selected.length} sur {d}
    </p>
    {!p.completed && <div className="flex flex-wrap gap-2">
      <button type="button" className={action} onClick={check}>Valider</button>
      <button type="button" className={control} onClick={hint} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
      <button type="button" className={control} onClick={() => update({ selectedParts: [], correct: null, feedback: '' })} disabled={selected.length === 0}>Effacer ma sélection</button>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && <p className="font-semibold text-teal-800">Activité réussie. Tu peux continuer la leçon.</p>}
  </div>;
}
