import { useEffect, useRef, useState } from 'react';
import { discloseLearningItem, initialActivityProgress, learningEvidence, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { equationSteps, parseRational, rationalText, satisfiesEquation, solutionOf, type EquationTransformation } from './equationSolver';
import { equationTermVisual, type EquationTermToken } from './equationTermVisual';
import { equationStepInstruction } from './equationStepInstruction';
import { MathTextTree } from '@/components/math/MathText';
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

function TermTokens({ tokens, side }: { tokens: EquationTermToken[]; side: 'left' | 'right' }) {
  return <MathTextTree><div data-testid={'equation-terms-' + side} className="flex min-h-12 flex-wrap items-center justify-center gap-1.5">
    {tokens.map(item => <span key={item.key}
      data-testid={item.role === 'cancel' ? 'equation-cancel-token' : item.role === 'combine' ? 'equation-combine-token' : undefined}
      data-math-source={item.text}
      aria-label={item.role === 'cancel' ? 'Terme annulé : ' + item.text : item.role === 'combine' ? 'Terme à regrouper : ' + item.text : undefined}
      className={'equation-term equation-term--' + item.role + ' inline-flex min-h-10 items-center rounded-md border px-2 py-1 text-base font-bold sm:text-lg'}>
      {item.text}
    </span>)}
  </div></MathTextTree>;
}

function TransformationVisual({ step, stage }: { step: EquationTransformation; stage: 0 | 1 | 2 }) {
  const visual = equationTermVisual(step);
  return <MathTextTree><div data-testid="equation-transform" aria-live="polite"
    className="flex min-h-[240px] flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center sm:min-h-[230px] sm:px-6">
    {stage === 0 && <div className="equation-focus space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Équation à transformer</p>
      <p className="break-words text-2xl font-extrabold leading-relaxed tracking-tight text-slate-900 sm:text-3xl">{step.before}</p>
    </div>}
    {stage === 1 && <>
      <div data-testid="equation-operation" className="equation-operation mx-auto flex flex-wrap items-center justify-center gap-2 text-sm">
        <div className="rounded-full bg-amber-100 px-3 py-1.5 font-bold text-amber-950">{step.leftOperation}</div>
        <span className="text-xs font-medium text-slate-600">{step.id === 'verify' ? 'dans chaque membre' : 'des deux côtés'}</span>
        <div className="rounded-full bg-amber-100 px-3 py-1.5 font-bold text-amber-950">{step.rightOperation}</div>
      </div>
      <div data-testid="equation-term-animation" className="equation-term-panel w-full space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <TermTokens tokens={visual.left} side="left" />
          <span aria-hidden="true" className="text-xl font-black text-teal-800">=</span>
          <TermTokens tokens={visual.right} side="right" />
        </div>
        <p data-testid="equation-cancellation-explanation" className="mx-auto max-w-2xl text-sm leading-6 text-slate-700">{visual.caption}</p>
      </div>
    </>}
    {stage === 2 && <div data-testid="equation-after" className="equation-after space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">{step.id === 'verify' ? 'Égalité vérifiée' : 'Équation simplifiée'}</p>
      <p className="break-words text-2xl font-extrabold leading-relaxed tracking-tight text-teal-900 sm:text-3xl">{step.after}</p>
    </div>}
  </div></MathTextTree>;
}

export function EquationDecompositionActivity({ spec, progress, onProgressChange, onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('understand');
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoStage, setDemoStage] = useState<0 | 1 | 2>(0);
  const [guidedStage, setGuidedStage] = useState<0 | 1 | 2>(0);
  const p = progress ?? initialActivityProgress();
  const modes = { guidedCompleted: false, soloCompleted: false, soloAttempts: 0, soloHintsUsed: 0, independentEvidence: false, assistedEvidence: false, soloFeedback: '', soloCorrect: null, guidedFeedback: '', guidedCorrect: null, soloPhase: 'original' as const, soloBaseCompleted: false, soloTransferAttempts: 0, soloTransferHintsUsed: 0, ...p.equationModes };
  const evidence = learningEvidence(p);
  const coefficients = { a: spec.a, b: spec.b, c: spec.c, d: spec.d ?? 0 };
  const steps = equationSteps(coefficients);
  const solution = solutionOf(coefficients);
  const transferCoefficients = spec.transfer ? { a: spec.transfer.a, b: spec.transfer.b, c: spec.transfer.c, d: spec.transfer.d ?? 0 } : null;
  const transferSolution = transferCoefficients ? solutionOf(transferCoefficients) : null;
  const transferSteps = transferCoefficients ? equationSteps(transferCoefficients) : null;
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const exposureRecorded = useRef(false);
  useEffect(() => {
    if (mode === 'understand' && !exposureRecorded.current) {
      exposureRecorded.current = true;
      onProgressChange({ ...p, learningEvidence: { ...evidence, exposure: true } });
    }
  }, [mode, p, evidence, onProgressChange]);
  const demoStep = steps[demoIndex];
  const instruction = equationStepInstruction(demoStep, demoStage);
  const guidedIndex = Math.min(p.phase, steps.length - 1);
  const guidedStep = steps[guidedIndex];
  const chooseMode = (next: Mode) => {
    setMode(next);
    if (next === 'together' && !modes.assistedEvidence) update({ assisted: true, learningEvidence: { ...evidence, assisted: true }, equationModes: { ...modes, assistedEvidence: true } });
    if (next === 'solo' && spec.transfer && (modes.guidedCompleted || evidence.disclosedItems.includes('equation-original'))) update({ input: '', phaseHints: 0, equationModes: { ...modes, soloPhase: 'transfer' } });
  };
  const demoForward = () => {
    update({ assisted: true, learningEvidence: { ...evidence, exposure: true, assisted: true, ...(demoStage === 2 ? { disclosedItems: discloseLearningItem(p, 'equation-original').disclosedItems } : {}) }, equationModes: { ...modes, assistedEvidence: true } });
    if (demoStage < 2) setDemoStage((demoStage + 1) as 0 | 1 | 2);
    else if (demoIndex < steps.length - 1) { setDemoIndex(i => i + 1); setDemoStage(0); }
    else chooseMode('together');
  };
  const guidedChoose = (answer: string) => {
    if (modes.guidedCompleted || guidedStage !== 0) return;
    const attempts = p.attempts + 1;
    if (answer !== guidedStep.choice) {
      update({ attempts, assisted: true, learningEvidence: { ...evidence, assisted: true }, equationModes: { ...modes, guidedCorrect: false, guidedFeedback: guidedStep.wrongFeedback, assistedEvidence: true } });
      return;
    }
    update({ attempts, assisted: true, learningEvidence: { ...evidence, assisted: true }, equationModes: { ...modes, guidedCorrect: true, guidedFeedback: '', assistedEvidence: true } });
    setGuidedStage(1);
  };
  const guidedNext = () => {
    if (guidedStage === 1) {
      setGuidedStage(2);
      update({ learningEvidence: { ...evidence, assisted: true, disclosedItems: discloseLearningItem(p, 'equation-original').disclosedItems } });
      return;
    }
    if (guidedStage !== 2 || modes.guidedCompleted) return;
    setGuidedStage(0);
    if (guidedIndex === steps.length - 1) {
      const wasComplete = p.completed;
      update({ completed: spec.transfer ? p.completed : true, correct: true, feedback: '', assisted: true, learningEvidence: { ...evidence, guidedCompleted: true, assisted: true }, equationModes: { ...modes, guidedCompleted: true, assistedEvidence: true, guidedCorrect: true, guidedFeedback: 'Bravo ! Tu as justifié chaque transformation et vérifié la solution.' } });
      if (!spec.transfer && !wasComplete) onComplete({ independent: false, attempts: p.attempts, hintsUsed: p.hintsUsed });
    } else update({ phase: guidedIndex + 1, correct: null, feedback: '', phaseHints: 0, equationModes: { ...modes, guidedCorrect: null, guidedFeedback: '' } });
  };
  const checkSolo = () => {
    if (modes.soloCompleted) return;
    const isTransfer = modes.soloPhase === 'transfer' && !!transferCoefficients && !!transferSolution;
    const activeCoefficients = isTransfer ? transferCoefficients! : coefficients;
    const activeSolution = isTransfer ? transferSolution! : solution;
    const answer = parseRational(p.input);
    if (!answer) {
      const isZeroDenominator = /^\s*[+-]?\d+\s*\/\s*0+\s*$/.test(p.input);
      update({ equationModes: { ...modes, soloCorrect: false, soloFeedback: isZeroDenominator
        ? 'Le dénominateur ne peut pas être zéro. Écris une fraction avec un dénominateur non nul.'
        : 'Écris un entier ou une fraction, par exemple −5/2. Vérifie le format de ta réponse.' } });
      return;
    }
    const attempts = p.attempts + 1;
    if (answer.n === activeSolution.n && answer.d === activeSolution.d && satisfiesEquation(activeCoefficients, answer)) {
      const soloAttempts = modes.soloAttempts + 1;
      if (!isTransfer && spec.transfer) {
        update({ attempts, input: '', phaseHints: 0, correct: null, equationModes: { ...modes, soloAttempts, soloBaseCompleted: true, soloPhase: 'transfer', soloCorrect: true, soloFeedback: 'Équation résolue. Maintenant, résous une autre équation sans aide.' }, learningEvidence: { ...evidence, assisted: evidence.assisted || modes.soloHintsUsed > 0 } });
        return;
      }
      const transferAttempts = isTransfer ? modes.soloTransferAttempts + 1 : 0;
      const independent = isTransfer ? modes.soloTransferAttempts === 0 && modes.soloTransferHintsUsed === 0 && !evidence.disclosedItems.includes('equation-transfer') : soloAttempts === 1 && modes.soloHintsUsed === 0 && !modes.assistedEvidence;
      update({ attempts, completed: true, correct: true, equationModes: { ...modes, soloAttempts, soloTransferAttempts: transferAttempts, soloCompleted: true, soloCorrect: true, soloFeedback: 'Bravo ! x = ' + rationalText(activeSolution) + '. La substitution confirme l’égalité.', independentEvidence: modes.independentEvidence || independent }, learningEvidence: { ...evidence, independent: evidence.independent || independent, transfer: isTransfer, transferAttempts: isTransfer ? evidence.transferAttempts + 1 : evidence.transferAttempts, assisted: evidence.assisted || modes.soloHintsUsed > 0 } });
      if (!p.completed) onComplete({ independent, attempts, hintsUsed: p.hintsUsed });
      return;
    }
    const opposite = answer.n === -activeSolution.n && answer.d === activeSolution.d;
    update({ attempts, learningEvidence: { ...evidence, assisted: true, ...(isTransfer ? { transferAttempts: evidence.transferAttempts + 1 } : {}) }, equationModes: { ...modes, soloAttempts: modes.soloAttempts + 1, ...(isTransfer ? { soloTransferAttempts: modes.soloTransferAttempts + 1 } : {}), soloCorrect: false, soloFeedback: opposite && activeSolution.n !== 0
      ? 'Tu as peut-être inversé un signe. Vérifie ce que devient chaque terme quand tu changes de membre.'
      : 'En remplaçant x par ta réponse, les deux membres ne sont pas égaux. Vérifie la soustraction puis la division.' } });
  };
  const hintSolo = () => {
    if (p.phaseHints >= 3 || modes.soloCompleted) return;
    const isTransfer = modes.soloPhase === 'transfer' && !!transferCoefficients && !!transferSolution;
    const activeCoefficients = isTransfer ? transferCoefficients! : coefficients;
    const activeSolution = isTransfer ? transferSolution! : solution;
    const hints = [
      'Pour isoler x, effectue la même opération sur les deux membres de l’égalité.',
      'Après regroupement, on obtient ' + (activeCoefficients.a - activeCoefficients.d) + 'x = ' + (activeCoefficients.c - activeCoefficients.b) + '.',
      'Divise par le coefficient de x. La solution est x = ' + rationalText(activeSolution) + '.',
    ];
    const next = p.phaseHints + 1;
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, assisted: true, learningEvidence: { ...evidence, assisted: true, ...(isTransfer ? { transferHintsUsed: evidence.transferHintsUsed + 1 } : {}), ...(isTransfer && next === 3 ? { disclosedItems: discloseLearningItem(p, 'equation-transfer').disclosedItems } : {}) }, equationModes: { ...modes, assistedEvidence: true, soloHintsUsed: modes.soloHintsUsed + 1, ...(isTransfer ? { soloTransferHintsUsed: modes.soloTransferHintsUsed + 1 } : {}), soloCorrect: null, soloFeedback: hints[p.phaseHints] } });
  };
  const alternativeChoices: Record<EquationTransformation['id'], [string, string]> = {
    'subtract-variable': ['Faire l’opération inverse sur les deux membres', 'Déplacer les x sans modifier l’autre membre'],
    'subtract-constant': ['Faire l’opération inverse sur les deux membres', 'Diviser immédiatement par le coefficient de x'],
    divide: ['Multiplier les deux membres par le coefficient de x', 'Diviser un seul membre'],
    verify: ['S’arrêter sans vérifier', 'Vérifier seulement la dernière ligne'],
  };
  const options = [...alternativeChoices[guidedStep.id], guidedStep.choice];
  // Rotate the correct choice by step so the learner cannot pass by always tapping the same position.
  const offset = (guidedIndex + 2) % options.length;
  const choices = [...options.slice(offset), ...options.slice(0, offset)];
  return <MathTextTree><div data-testid="equation-decomposition-activity" className="mx-auto max-w-3xl space-y-4">
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Mode d’apprentissage">
      <button type="button" className={'min-h-11 rounded-lg px-1 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 ' + (mode === 'understand' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600')} aria-label="Comprendre" aria-pressed={mode === 'understand'} onClick={() => chooseMode('understand')}>Comprendre</button>
      <button type="button" className={'min-h-11 rounded-lg px-1 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 ' + (mode === 'together' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600')} aria-label="Résoudre ensemble" aria-pressed={mode === 'together'} onClick={() => chooseMode('together')}>Ensemble</button>
      <button type="button" className={'min-h-11 rounded-lg px-1 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 ' + (mode === 'solo' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600')} aria-label="M’entraîner seul" aria-pressed={mode === 'solo'} onClick={() => chooseMode('solo')}>À toi</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="font-medium text-slate-700">Objectif : trouver la valeur de x</span>
      <details className="text-slate-600">
        <summary className="cursor-pointer rounded-md px-2 py-1 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">Consigne complète</summary>
        <p className="mt-2 max-w-md rounded-lg bg-slate-50 p-3 leading-6 text-slate-800">{spec.prompt}</p>
      </details>
    </div>
    {mode === 'understand' && <section className="space-y-3" aria-label="Démonstration de l’équation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold text-teal-900 sm:text-lg">{demoStep.title}</h4>
        <span data-testid="equation-demo-progress" className="shrink-0 text-sm font-semibold text-slate-600">Étape {demoIndex + 1} sur {steps.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progression de la démonstration" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={demoIndex + 1}>
        <div className="h-full rounded-full bg-teal-600 transition-[width] duration-200" style={{ width: ((demoIndex + 1) / steps.length * 100) + '%' }} />
      </div>
      <div data-testid="equation-step-instruction" role="note" className="rounded-xl bg-teal-50 px-3 py-3 text-left text-sm leading-6 text-slate-900 sm:px-4">
        <span data-testid="equation-step-instruction-label" className="mr-2 font-bold text-teal-900">{instruction.label} :</span>
        <span data-testid="equation-step-instruction-text">{instruction.text}</span>
      </div>
      <TransformationVisual key={demoIndex} step={demoStep} stage={demoStage} />
      <details className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
        <summary className="min-h-7 cursor-pointer font-semibold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">Pourquoi cette étape ?</summary>
        <p className="mt-2 leading-6">{demoStep.explanation}</p>
        <p className="mt-2 leading-6">{demoStep.rule}</p>
      </details>
      <div className="flex items-center gap-2 pt-1">
        <button type="button" className={control + ' shrink-0 px-3 sm:px-4'} disabled={demoIndex === 0 && demoStage === 0} onClick={() => {
          update({ assisted: true, learningEvidence: { ...evidence, exposure: true, assisted: true, disclosedItems: discloseLearningItem(p, 'equation-original').disclosedItems }, equationModes: { ...modes, assistedEvidence: true } });
          if (demoStage > 0) setDemoStage((demoStage - 1) as 0 | 1 | 2);
          else { setDemoIndex(i => i - 1); setDemoStage(2); }
        }}>Précédent</button>
        <button type="button" className={action + ' min-w-0 flex-1 px-2 sm:px-5'} onClick={demoForward}>{demoStage === 0 ? 'Animer l’opération' : demoStage === 1 ? 'Voir le résultat' : demoIndex < steps.length - 1 ? 'Étape suivante' : 'Résoudre ensemble'}</button>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Démonstration sans note</span>
        <button type="button" className="min-h-11 rounded-md px-2 font-medium text-slate-600 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => { update({ assisted: true, equationModes: { ...modes, assistedEvidence: true } }); setDemoIndex(0); setDemoStage(0); }}>Revoir depuis le début</button>
      </div>
    </section>}
    {mode === 'together' && <section className="space-y-3" aria-label="Résolution accompagnée">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold text-teal-900">Résolvons ensemble</h4>
        <span className="text-sm font-semibold text-slate-600">Étape {guidedIndex + 1} sur {steps.length}</span>
      </div>
      <div data-testid="equation-guided-instruction" role="note" className="rounded-xl bg-teal-50 px-3 py-3 text-sm leading-6 text-slate-900 sm:px-4">
        {guidedStage === 0
          ? 'Quelle opération peut-on effectuer sur les deux membres pour avancer ?'
          : <><strong className="mr-2 text-teal-900">{equationStepInstruction(guidedStep, guidedStage).label} :</strong>{equationStepInstruction(guidedStep, guidedStage).text}</>}
      </div>
      <TransformationVisual key={guidedIndex + '-' + guidedStage} step={guidedStep} stage={guidedStage} />
      {guidedStage === 0 && !modes.guidedCompleted && <div className="grid gap-2">
        {choices.map((option, i) => <button key={i} type="button" data-testid={'equation-choice-' + i} className={control + ' text-left'} onClick={() => guidedChoose(option)}>{option}</button>)}
      </div>}
      {guidedStage > 0 && <div className="space-y-3">
        <details className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <summary className="min-h-7 cursor-pointer font-semibold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">Pourquoi cette étape ?</summary>
          <p className="mt-2 leading-6">{guidedStep.explanation}</p>
          <p className="mt-2 leading-6">{guidedStep.rule}</p>
        </details>
        {!modes.guidedCompleted && <button type="button" className={action + ' w-full'} onClick={guidedNext}>
          {guidedStage === 1 ? 'Voir le résultat' : guidedIndex === steps.length - 1 ? 'Terminer la résolution' : 'Étape suivante'}
        </button>}
      </div>}
      {modes.guidedFeedback && <p role="status" aria-live="polite" className={'text-sm font-semibold ' + (modes.guidedCorrect === false ? 'text-amber-800' : 'text-teal-800')}>{modes.guidedFeedback}</p>}
    </section>}
    {mode === 'solo' && <section className="space-y-3" aria-label="Résolution autonome">
      <p className="font-bold">{modes.soloPhase === 'transfer' ? 'Transfert indépendant : résous cette nouvelle équation sans aide.' : 'Trouve la valeur de x sans regarder les étapes.'}</p>
      <p className="rounded-xl bg-slate-100 p-4 text-center text-2xl font-bold">{modes.soloPhase === 'transfer' && transferSteps ? transferSteps[0].before : steps[0].before}</p>
      {!modes.soloCompleted && <div className="space-y-2">
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
      {modes.soloCompleted && <p className="rounded-xl bg-teal-50 p-4 font-bold text-teal-900">Solution vérifiée : x = {rationalText(modes.soloPhase === 'transfer' && transferSolution ? transferSolution : solution)}</p>}
      <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (modes.soloCorrect === false ? 'text-amber-800' : 'text-teal-800')}>{modes.soloFeedback}</p>
    </section>}
    {p.completed && (mode !== 'together' || modes.guidedCompleted) && <p className="font-semibold text-teal-800">Activité terminée. Tu peux continuer la leçon.</p>}
  </div></MathTextTree>;
}
