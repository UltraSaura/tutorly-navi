import { useState } from 'react';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { equationSteps, parseRational, rationalText, satisfiesEquation, solutionOf, type EquationTransformation } from './equationSolver';
import './equationAnimations.css';

type Spec = Extract<InteractiveActivitySpec, { kind: 'equation-decomposition' }>;
type Props = {
  spec: Spec;
  progress?: ActivityProgress;
  onProgressChange: (p: ActivityProgress) => void;
  onComplete: (result: { independent: boolean; attempts: number; hintsUsed: number }) => void;
};
type Mode = 'understand' | 'together' | 'solo';
const control = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50';
const action = 'min-h-11 rounded-xl bg-teal-600 px-5 py-2 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-50';

function TransformationVisual({ step, stage }: { step: EquationTransformation; stage: 0 | 1 | 2 }) {
  const [left, right] = step.before.split(' = ');
  return <div data-testid="equation-transform" className="space-y-3 rounded-xl bg-slate-50 p-3 sm:p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Équation avant l’opération</p>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
      <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-4">
        <p className="mb-2 text-xs font-semibold text-slate-600">Membre gauche</p>
        <p className="break-words text-lg font-bold text-slate-900 sm:text-xl">{left}</p>
      </div>
      <span className="text-xl font-black text-teal-800">=</span>
      <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-4">
        <p className="mb-2 text-xs font-semibold text-slate-600">Membre droit</p>
        <p className="break-words text-lg font-bold text-slate-900 sm:text-xl">{right}</p>
      </div>
    </div>
    {stage >= 1 && <div data-testid="equation-operation" className="equation-operation grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
      <div className="rounded-lg border border-amber-300 bg-amber-100 px-2 py-3 font-bold text-amber-950">{step.leftOperation}</div>
      <span aria-hidden="true" className="text-teal-800">↔</span>
      <div className="rounded-lg border border-amber-300 bg-amber-100 px-2 py-3 font-bold text-amber-950">{step.rightOperation}</div>
      <p className="col-span-3 text-xs font-semibold text-amber-900">La même opération est appliquée aux deux membres.</p>
    </div>}
    {stage === 2 && <div data-testid="equation-after" className="equation-after space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
      <p className="text-xs font-bold uppercase text-teal-900">Résultat de cette étape</p>
      <p className="break-words text-xl font-extrabold text-teal-950 sm:text-2xl">{step.after}</p>
    </div>}
  </div>;
}

export function EquationDecompositionActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('understand');
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoStage, setDemoStage] = useState<0 | 1 | 2>(0);
  const [guidedRevealed, setGuidedRevealed] = useState(false);
  const p = progress ?? initialActivityProgress();
  const coefficients = { a: spec.a, b: spec.b, c: spec.c, d: spec.d ?? 0 };
  const steps = equationSteps(coefficients);
  const solution = solutionOf(coefficients);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const demoStep = steps[demoIndex];
  const guidedIndex = Math.min(p.phase, steps.length - 1);
  const guidedStep = steps[guidedIndex];
  const chooseMode = (next: Mode) => {
    setMode(next);
    if (next === 'together' && !p.assisted) update({ assisted: true });
  };
  const demoForward = () => {
    update({ assisted: true });
    if (demoStage < 2) setDemoStage((demoStage + 1) as 0 | 1 | 2);
    else if (demoIndex < steps.length - 1) { setDemoIndex(i => i + 1); setDemoStage(0); }
    else chooseMode('together');
  };
  const guidedChoose = (answer: string) => {
    if (p.completed || guidedRevealed) return;
    const attempts = p.attempts + 1;
    if (answer !== guidedStep.choice) {
      update({ attempts, correct: false, feedback: guidedStep.wrongFeedback, assisted: true });
      return;
    }
    update({ attempts, correct: true, feedback: 'Exact ! ' + guidedStep.rule, assisted: true });
    setGuidedRevealed(true);
  };
  const guidedNext = () => {
    if (!guidedRevealed || p.completed) return;
    setGuidedRevealed(false);
    if (guidedIndex === steps.length - 1) {
      update({ completed: true, correct: true, feedback: 'Bravo ! Tu as justifié chaque transformation et vérifié la solution.', assisted: true });
      onComplete({ independent: false, attempts: p.attempts, hintsUsed: p.hintsUsed });
    } else update({ phase: guidedIndex + 1, correct: null, feedback: '', phaseHints: 0 });
  };
  const checkSolo = () => {
    if (p.completed) return;
    const answer = parseRational(p.input);
    if (!answer) {
      update({ correct: false, feedback: 'Écris un entier ou une fraction, par exemple −5/2. Le dénominateur ne peut pas être zéro.' });
      return;
    }
    const attempts = p.attempts + 1;
    if (answer.n === solution.n && answer.d === solution.d && satisfiesEquation(coefficients, answer)) {
      update({ attempts, correct: true, completed: true, feedback: 'Bravo ! x = ' + rationalText(solution) + '. La substitution confirme l’égalité.' });
      onComplete({ independent: attempts === 1 && p.hintsUsed === 0 && !p.assisted, attempts, hintsUsed: p.hintsUsed });
      return;
    }
    const opposite = answer.n === -solution.n && answer.d === solution.d;
    update({ attempts, correct: false, feedback: opposite && solution.n !== 0
      ? 'Tu as peut-être inversé un signe. Vérifie ce que devient chaque terme quand tu changes de membre.'
      : 'En remplaçant x par ta réponse, les deux membres ne sont pas égaux. Vérifie la soustraction puis la division.' });
  };
  const hintSolo = () => {
    if (p.phaseHints >= 3 || p.completed) return;
    const hints = [
      'Pour isoler x, effectue la même opération sur les deux membres de l’égalité.',
      'Après regroupement, on obtient ' + (spec.a - (spec.d ?? 0)) + 'x = ' + (spec.c - spec.b) + '.',
      'Divise par le coefficient de x. La solution est x = ' + rationalText(solution) + '.',
    ];
    update({ phaseHints: p.phaseHints + 1, hintsUsed: p.hintsUsed + 1, assisted: true, feedback: hints[p.phaseHints] });
  };
  const options = [
    guidedStep.choice,
    'Modifier uniquement le membre gauche',
    'Changer les signes sans faire la même opération des deux côtés',
  ];
  return <div data-testid="equation-decomposition-activity" className="space-y-4">
    <div className="flex flex-wrap gap-2" aria-label="Mode d’apprentissage">
      <button type="button" className={control + (mode === 'understand' ? ' border-teal-700 bg-teal-50' : '')} aria-pressed={mode === 'understand'} onClick={() => chooseMode('understand')}>Comprendre</button>
      <button type="button" className={control + (mode === 'together' ? ' border-teal-700 bg-teal-50' : '')} aria-pressed={mode === 'together'} onClick={() => chooseMode('together')}>Résoudre ensemble</button>
      <button type="button" className={control + (mode === 'solo' ? ' border-teal-700 bg-teal-50' : '')} aria-pressed={mode === 'solo'} onClick={() => chooseMode('solo')}>M’entraîner seul</button>
    </div>
    <p className="rounded-xl bg-teal-50 p-3 text-base leading-7 text-slate-900">{spec.prompt}</p>
    {mode === 'understand' && <section className="space-y-3" aria-label="Démonstration de l’équation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-teal-900">{demoStep.title}</h4>
        <span data-testid="equation-demo-progress" className="text-sm font-semibold text-teal-800">Étape {demoIndex + 1} sur {steps.length}</span>
      </div>
      <TransformationVisual key={demoIndex} step={demoStep} stage={demoStage} />
      <p className="leading-7 text-slate-800">{demoStep.explanation}</p>
      {demoStage === 2 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{demoStep.rule}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} disabled={demoIndex === 0 && demoStage === 0} onClick={() => {
          update({ assisted: true });
          if (demoStage > 0) setDemoStage((demoStage - 1) as 0 | 1 | 2);
          else { setDemoIndex(i => i - 1); setDemoStage(2); }
        }}>Précédent</button>
        <button type="button" className={action} onClick={demoForward}>{demoStage === 0 ? 'Animer l’opération' : demoStage === 1 ? 'Voir le résultat' : demoIndex < steps.length - 1 ? 'Étape suivante' : 'Résoudre ensemble'}</button>
        <button type="button" className={control} onClick={() => { update({ assisted: true }); setDemoIndex(0); setDemoStage(0); }}>Recommencer</button>
      </div>
      <p className="text-xs text-slate-600">Démonstration non notée. Les opérations et leurs résultats proviennent du calcul exact, pas d’un texte généré par IA.</p>
    </section>}
    {mode === 'together' && <section className="space-y-3" aria-label="Résolution accompagnée">
      <p className="text-sm font-bold text-teal-900">Étape {guidedIndex + 1} sur {steps.length} — Choisis la prochaine opération</p>
      <p className="rounded-xl bg-slate-100 p-4 text-center text-xl font-bold">{guidedStep.before}</p>
      {!guidedRevealed && !p.completed && <div className="grid gap-2">
        {options.map((option, i) => <button key={i} type="button" data-testid={'equation-choice-' + i} className={control + ' text-left'} onClick={() => guidedChoose(option)}>{option}</button>)}
      </div>}
      {guidedRevealed && <><TransformationVisual step={guidedStep} stage={2} />
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{guidedStep.rule}</p>
        <button type="button" className={action} onClick={guidedNext}>{guidedIndex === steps.length - 1 ? 'Terminer la résolution' : 'Étape suivante'}</button>
      </>}
      <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    </section>}
    {mode === 'solo' && <section className="space-y-3" aria-label="Résolution autonome">
      <p className="font-bold">Trouve la valeur de x sans regarder les étapes.</p>
      <p className="rounded-xl bg-slate-100 p-4 text-center text-2xl font-bold">{steps[0].before}</p>
      {!p.completed && <div className="space-y-2">
        <label htmlFor={'equation-answer-' + spec.id} className="block font-semibold">x = ?</label>
        <p id={'equation-help-' + spec.id} className="text-sm text-slate-600">Écris un entier ou une fraction (ex. : -5/2). Pas de nombre décimal.</p>
        <div className="flex flex-wrap gap-2">
          <input id={'equation-answer-' + spec.id} aria-describedby={'equation-help-' + spec.id} inputMode="text"
            className="min-h-11 w-36 rounded-xl border border-slate-300 px-3 text-lg"
            value={p.input} onChange={e => update({ input: e.target.value, correct: null })}
            onKeyDown={e => { if (e.key === 'Enter') checkSolo(); }} />
          <button type="button" className={action} onClick={checkSolo}>Valider</button>
          <button type="button" className={control} onClick={hintSolo} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
        </div>
      </div>}
      {p.completed && <p className="rounded-xl bg-teal-50 p-4 font-bold text-teal-900">Solution vérifiée : x = {rationalText(solution)}</p>}
      <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    </section>}
    {p.completed && <p className="font-semibold text-teal-800">Activité terminée. Tu peux continuer la leçon.</p>}
  </div>;
}
