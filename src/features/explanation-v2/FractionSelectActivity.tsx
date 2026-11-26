import { initialActivityProgress, learningEvidence, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { namedParts } from './pedagogicalQuestions';

type Spec = Extract<InteractiveActivitySpec, { kind: 'fraction-select' }>;
type Completion = { independent: boolean; attempts: number; hintsUsed: number };
type Props = { spec: Spec; progress?: ActivityProgress; onProgressChange: (progress: ActivityProgress) => void; onComplete: (result: Completion) => void };
const action = 'min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-50';
const control = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50';

/** Reusable tactile/keyboard fraction construction with a changed-value transfer check. */
export function FractionSelectActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const p = progress ?? initialActivityProgress();
  const evidence = learningEvidence(p);
  const target = p.phase >= 2 && spec.transfer ? spec.transfer : spec.target;
  const isTransfer = p.phase === 2 && !!spec.transfer;
  const selected = (p.selectedParts ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < target.d);
  const parts = namedParts(target.d);
  const isYoung = !spec.schoolLevel || ['CE1', 'CE2', 'CM1', 'CM2', '6e'].includes(spec.schoolLevel);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const toggle = (index: number) => {
    if (p.completed || p.phase === 1) return;
    const next = selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index];
    update({ selectedParts: next, correct: null, feedback: '' });
  };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (p.phase === 1) {
      const answeredCorrectly = p.input === 'meaning';
      if (answeredCorrectly) {
        update({ phase: 2, input: '', selectedParts: [], attempts, phaseHints: 0, correct: null, feedback: 'Exact : le dénominateur partage le tout en parts égales; le numérateur indique combien de parts on prend.', learningEvidence: { ...evidence, guidedCompleted: true, assisted: true } });
      } else {
        update({ attempts, correct: false, feedback: 'Relie le nombre du haut à ce qu’on prend, et le nombre du bas au découpage égal du tout.', learningEvidence: { ...evidence, assisted: true } });
      }
      return;
    }
    if (selected.length !== target.n) {
      update({ attempts, correct: false, feedback: isTransfer
        ? 'Compare ta sélection au numérateur de la fraction. Tu peux modifier les cases avant de valider à nouveau.'
        : 'Tu peux vérifier le nombre du haut et ajuster les parts colorées.', learningEvidence: { ...evidence, assisted: true, ...(isTransfer ? { transferAttempts: evidence.transferAttempts + 1 } : {}) } });
      return;
    }
    if (!isTransfer && spec.transfer) {
      update({ phase: 1, selectedParts: [], input: '', attempts, phaseHints: 0, correct: null, feedback: 'La barre représente bien 3/4. Vérifions maintenant le rôle du numérateur et du dénominateur.', learningEvidence: { ...evidence, assisted: true } });
      return;
    }
    const independent = isTransfer && evidence.transferAttempts === 0 && evidence.transferHintsUsed === 0;
    update({ attempts, completed: true, correct: true,
      feedback: isTransfer ? 'Bravo ! Tu as représenté 2/5 avec cinq parts égales.' : 'Bravo ! Tu as sélectionné ' + target.n + ' ' + parts + ' sur ' + target.d + ' : c’est bien ' + target.n + '/' + target.d + '.',
      learningEvidence: { ...evidence, independent, transfer: isTransfer, transferAttempts: isTransfer ? evidence.transferAttempts + 1 : evidence.transferAttempts, assisted: evidence.assisted || p.hintsUsed > 0 } });
    onComplete({ independent, attempts, hintsUsed: p.hintsUsed });
  };
  const hints = isTransfer
    ? ['Le dénominateur indique combien de parts égales forment le tout.', 'Le numérateur indique combien de ces parts représentent la quantité.', 'Pour 2/5, choisis deux des cinq parts égales.']
    : ['Le nombre du bas (' + target.d + ') indique en combien de parts égales la barre est partagée.', 'Le nombre du haut indique combien de parts il faut sélectionner.', 'Pour ' + target.n + '/' + target.d + ', sélectionne exactement ' + target.n + ' ' + parts + ' parmi les ' + target.d + '.'];
  const hint = () => {
    if (p.completed || p.phaseHints >= hints.length || p.phase === 1) return;
    const next = p.phaseHints + 1;
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, feedback: hints[next - 1], learningEvidence: { ...evidence, assisted: true, ...(isTransfer ? { transferHintsUsed: evidence.transferHintsUsed + 1 } : {}), ...(isTransfer && next === hints.length && !evidence.disclosedItems.includes('fraction-selection-transfer') ? { disclosedItems: [...evidence.disclosedItems, 'fraction-selection-transfer'] } : {}) } });
  };
  return <div className="space-y-4" data-testid="fraction-select-activity">
    <div className="space-y-2 rounded-xl bg-teal-50 p-3">
      <p className="text-sm font-bold text-teal-800">{isTransfer ? 'Transfert indépendant · Une autre fraction' : p.phase === 1 ? 'Vérifions ce que signifient les deux nombres' : 'Construis une fraction'}</p>
      <p className="text-base leading-7 text-slate-800">{p.phase === 1
        ? 'Dans 3/4, le dénominateur décrit le partage égal du tout; le numérateur décrit le nombre de parts prises.'
        : isTransfer
          ? 'Représente 2/5. Pourquoi le tout doit-il être partagé en cinq parts de même taille ?'
          : isYoung
            ? 'Cette barre est partagée en ' + target.d + ' parts égales. Chaque case représente un ' + (target.d === 4 ? 'quart' : 'morceau') + ' de la barre. Une fraction décrit une quantité de parts égales.'
            : 'Le dénominateur ' + target.d + ' donne le nombre de parts égales ; le numérateur ' + target.n + ' donne le nombre de parts à sélectionner.'}</p>
      {p.phase !== 1 && <p className="text-base font-bold leading-7 text-slate-900" data-testid="fraction-select-question">Sélectionne {target.n} {parts} sur les {target.d} parts de la barre pour représenter la fraction {target.n}/{target.d}.</p>}
      <p className="text-sm text-slate-700">{p.phase === 1 ? 'Choisis l’explication correcte.' : 'Touche les cases pour les colorier ou les effacer, puis appuie sur « Valider ».'}</p>
    </div>
    {p.phase === 1 ? <div className="grid gap-2" role="group" aria-label="Sens du numérateur et du dénominateur">
      <button type="button" className={control + ' text-left'} aria-pressed={p.input === 'meaning'} onClick={() => update({ input: 'meaning', correct: null })}>Le dénominateur partage le tout en parts égales; le numérateur indique combien de parts on prend.</button>
      <button type="button" className={control + ' text-left'} aria-pressed={p.input === 'reversed'} onClick={() => update({ input: 'reversed', correct: null })}>Le numérateur partage le tout; le dénominateur indique combien de parts on prend.</button>
      <button type="button" className={action} onClick={check} disabled={!p.input}>Vérifier mon explication</button>
    </div> : <>
      <div className="overflow-x-auto rounded-xl bg-slate-50 p-3" aria-label={'Barre de fraction divisée en ' + target.d + ' parts'}>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + target.d + ', minmax(44px, 1fr))', minWidth: target.d * 48 }}>
          {Array.from({ length: target.d }, (_, i) => {
            const active = selected.includes(i);
            return <button key={i} type="button" data-testid={'fraction-part-' + i} aria-pressed={active}
              aria-label={'Part ' + (i + 1) + ' sur ' + target.d + (active ? ', sélectionnée' : ', non sélectionnée')}
              disabled={p.completed} onClick={() => toggle(i)}
              className={'min-h-16 rounded-lg border-2 border-teal-700 transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ' + (active ? 'bg-teal-400' : 'bg-white hover:bg-teal-50')}>
              <span aria-hidden="true" className="font-bold text-slate-900">{active ? '✓' : ''}</span>
            </button>;
          })}
        </div>
      </div>
      <p className="font-semibold text-slate-800" aria-live="polite" data-testid="fraction-selected-count">
        {isTransfer && evidence.transferAttempts === 0 ? 'Ta sélection est prête à vérifier.' : 'Parts sélectionnées : ' + selected.length + ' sur ' + target.d}
      </p>
      {!p.completed && <div className="flex flex-wrap gap-2">
        <button type="button" className={action} onClick={check}>Valider</button>
        <button type="button" className={control} onClick={hint} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
        <button type="button" className={control} onClick={() => update({ selectedParts: [], correct: null, feedback: '' })} disabled={selected.length === 0}>Effacer ma sélection</button>
      </div>}
    </>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && <p className="font-semibold text-teal-800">{spec.transfer ? 'Transfert réussi sans aide.' : 'Activité réussie. Tu peux continuer la leçon.'}</p>}
  </div>;
}
