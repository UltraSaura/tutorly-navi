import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { InteractiveActivitySchema, initialActivityProgress, learningEvidence, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { clampGrid, expectedFractionSteps, gradePartCount, graphToPixel, isPointCorrect, parseRationalAnswer, pixelToGraph } from './math';
import { coordinateGuidedQuestion, fractionGuidedQuestion, namedParts } from './pedagogicalQuestions';
import { FractionSelectActivity } from './FractionSelectActivity';
import { AlgebraTilesActivity } from './AlgebraTilesActivity';
import { LinearFunctionActivity } from './LinearFunctionActivity';
import { LineFitActivity } from './LineFitActivity';
import { EquationDecompositionActivity } from './EquationDecompositionActivity';
import { MathDemonstration, fractionDemonstrationSteps } from './MathDemonstration';

type Completion = { independent: boolean; attempts: number; hintsUsed: number };
type Props = {
  spec: InteractiveActivitySpec;
  progress?: ActivityProgress;
  onProgressChange: (progress: ActivityProgress) => void;
  onComplete: (result: Completion) => void;
};
const control = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50';
const action = 'min-h-11 rounded-xl bg-teal-500 px-5 py-3 font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-50';
function Tiles({ denominator, filled, label }: { denominator: number; filled: number; label: string }) {
  const rows = Math.max(1, Math.ceil(filled / denominator));
  return <div className="space-y-1.5" role="img" aria-label={label}>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="grid gap-1" style={{ gridTemplateColumns: 'repeat(' + denominator + ', minmax(0,1fr))' }}>
        {Array.from({ length: denominator }, (_, col) => {
          const active = row * denominator + col < filled;
          return <div key={col} className={'h-10 rounded-md border border-teal-700 motion-safe:transition-colors motion-safe:duration-300 ' + (active ? 'bg-teal-400' : 'bg-teal-50')} />;
        })}
      </div>
    ))}
    <p className="text-sm font-medium text-slate-700">{label}</p>
  </div>;
}
function FractionActivity({ spec, progress, onProgressChange, onComplete }: Props & { spec: Extract<InteractiveActivitySpec, { kind: 'fraction-bar' }> }) {
  const [showDemo, setShowDemo] = useState(false);
  const p = progress ?? initialActivityProgress();
  const transferPhase = p.phase >= 2 && !!spec.transfer;
  const conversionPhase = p.phase === 0;
  const active = transferPhase ? { ...spec, ...spec.transfer } : spec;
  const steps = expectedFractionSteps(active.left, active.right, active.targetDenominator);
  const guidance = fractionGuidedQuestion(active, transferPhase ? 1 : p.phase);
  const evidence = learningEvidence(p);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const toggleDemo = () => {
    if (!showDemo) update({ learningEvidence: { ...evidence, exposure: true, disclosedItems: evidence.disclosedItems.includes('fraction-addition-base') ? evidence.disclosedItems : [...evidence.disclosedItems, 'fraction-addition-base'] } });
    setShowDemo(value => !value);
  };
  const check = () => {
    if (p.completed) return;
    const answer = p.input.trim();
    if (p.phase === 2 && spec.transfer) {
      const expected = steps.total;
      const parsed = parseRationalAnswer(answer);
      const transferAttempts = evidence.transferAttempts + 1;
      if (parsed?.numerator === expected.numerator && parsed.denominator === expected.denominator) {
        update({ attempts: p.attempts + 1, completed: true, correct: true, feedback: 'Exact ! ' + active.left.n + '/' + active.left.d + ' + ' + active.right.n + '/' + active.right.d + ' = ' + expected.numerator + '/' + expected.denominator + '. Les fractions équivalentes sont acceptées.', learningEvidence: { ...evidence, independent: evidence.independent || (transferAttempts === 1 && evidence.transferHintsUsed === 0), transfer: true, transferAttempts } });
        onComplete({ independent: transferAttempts === 1 && evidence.transferHintsUsed === 0, attempts: p.attempts + 1, hintsUsed: p.hintsUsed });
      } else {
        update({ attempts: p.attempts + 1, correct: false, feedback: parsed ? 'La somme ne correspond pas encore. Réécris les deux fractions avec des parts de même taille avant de les additionner.' : 'Écris le résultat sous forme de fraction, par exemple 3/4.', learningEvidence: { ...evidence, assisted: true, transferAttempts } });
      }
      return;
    }
    const expectedParts = conversionPhase ? steps.rightParts : steps.totalParts;
    if (gradePartCount(answer, expectedParts) === 'invalid') {
      update({ feedback: 'Écris un nombre entier de parts.', correct: false });
      return;
    }
    const expected = expectedParts;
    const attempts = p.attempts + 1;
    if (gradePartCount(answer, expected) !== 'correct') {
      update({ attempts, correct: false, feedback: p.phase === 0
        ? 'Pour additionner, les parts doivent être de même taille. Regarde la barre du bas : combien de ' + namedParts(spec.targetDenominator) + ' seront coloriés après le partage ?'
        : transferPhase
          ? 'Vérifie que les deux fractions représentent des parts de même taille avant de calculer. Tu peux corriger ta réponse.'
          : 'Les dénominateurs sont identiques : additionne seulement les parts coloriées des deux barres.', learningEvidence: { ...evidence, assisted: true, ...(transferPhase ? { transferAttempts: evidence.transferAttempts + 1 } : {}) } });
      return;
    }
    if (conversionPhase) {
      update({ phase: p.phase === 0 ? 1 : 3, phaseHints: 0, input: '', attempts, correct: null, feedback: p.phase === 0 ? 'Exact ! ' + spec.right.n + '/' + spec.right.d + ' = ' + steps.rightParts + '/' + spec.targetDenominator + '.' : '' });
    } else {
      if (p.phase === 1 && spec.transfer) {
        update({ phase: 2, phaseHints: 0, input: '', attempts, correct: null, feedback: 'Exemple guidé terminé. Essaie maintenant un autre calcul sans aide.', learningEvidence: { ...evidence, guidedCompleted: true, assisted: true } });
      } else {
        const transferAttempts = evidence.transferAttempts + 1;
        update({ attempts, completed: true, correct: true, feedback: 'Bravo ! Le total est ' + steps.totalParts + '/' + active.targetDenominator + '.', learningEvidence: { ...evidence, independent: p.phase === 3 && transferAttempts === 1 && evidence.transferHintsUsed === 0, assisted: evidence.assisted || p.hintsUsed > 0 || p.phase === 1, transfer: p.phase === 3, transferAttempts } });
        onComplete({ independent: p.phase === 3 && transferAttempts === 1 && evidence.transferHintsUsed === 0, attempts, hintsUsed: p.hintsUsed });
      }
    }
  };
  const hints = conversionPhase
    ? [
        'Pour additionner, on choisit des parts de même taille.',
        'Dans la barre du bas, chaque morceau est partagé en ' + (spec.targetDenominator / spec.right.d) + ' morceaux égaux.',
        'Regarde les morceaux coloriés : ' + spec.right.n + '/' + spec.right.d + ' représente ' + steps.rightParts + '/' + spec.targetDenominator + '.',
      ]
    : [
        'Les parts ont maintenant la même taille : les dénominateurs sont identiques.',
        'Compte ' + steps.leftParts + ' ' + namedParts(spec.targetDenominator) + ' en haut et ' + steps.rightParts + ' en bas.',
        'Additionne les deux nombres de morceaux : ' + steps.leftParts + ' + ' + steps.rightParts + '.',
      ];
  const hint = () => {
    const next = Math.min(3, p.phaseHints + 1);
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, feedback: p.phase === 2 ? ['Choisis une taille de part commune aux deux fractions.', 'Réécris les deux fractions avec des parts de même taille, puis additionne les numérateurs.', 'Le résultat exact est ' + steps.total.numerator + '/' + steps.total.denominator + '.'][next - 1] : hints[next - 1], learningEvidence: { ...evidence, assisted: true, ...(p.phase >= 2 ? { transferHintsUsed: evidence.transferHintsUsed + 1 } : {}), ...(next === 3 && p.phase >= 2 ? { disclosedItems: evidence.disclosedItems.includes('fraction-transfer') ? evidence.disclosedItems : [...evidence.disclosedItems, 'fraction-transfer'] } : {}) } });
  };
  return <div className="space-y-4" data-testid="fraction-bar-activity">
    <button type="button" className={control} onClick={toggleDemo}>
      {showDemo ? 'Revenir à l’exercice' : 'Voir la démonstration pas à pas'}
    </button>
    {showDemo ? <MathDemonstration
      title="Comprendre l’addition de fractions"
      steps={fractionDemonstrationSteps(spec)}
      onExposure={() => update({ learningEvidence: { ...evidence, exposure: true, disclosedItems: evidence.disclosedItems.includes('fraction-addition-base') ? evidence.disclosedItems : [...evidence.disclosedItems, 'fraction-addition-base'] } })}
      onPractice={() => setShowDemo(false)}
      practiceLabel="Revenir à l’exercice" /> : <>
    <div className="space-y-2 rounded-xl bg-teal-50 p-3" data-testid="fraction-step-instructions">
      <p className="text-sm font-bold text-teal-800">{transferPhase ? 'Transfert indépendant · Autres valeurs' : guidance.step}</p>
      <p className="text-base leading-7 text-slate-800">{p.phase === 2 ? 'Résous ' + active.left.n + '/' + active.left.d + ' + ' + active.right.n + '/' + active.right.d + '. Les deux barres représentent des quantités de même longueur. Écris le résultat exact sous forme de fraction.' : guidance.context}</p>
    </div>
    <div className="rounded-xl bg-slate-50 p-3 space-y-4">
      <Tiles denominator={active.left.d} filled={active.left.n} label={'Barre du haut : ' + active.left.n + '/' + active.left.d} />
      <Tiles denominator={p.phase === 0 || p.phase === 2 ? active.right.d : active.targetDenominator} filled={p.phase === 0 || p.phase === 2 ? active.right.n : steps.rightParts} label={'Barre du bas : ' + (p.phase === 0 || p.phase === 2 ? active.right.n + '/' + active.right.d : steps.rightParts + '/' + active.targetDenominator)} />
      {p.completed && <Tiles denominator={active.targetDenominator} filled={steps.totalParts} label={'Total : ' + steps.totalParts + '/' + active.targetDenominator} />}
    </div>
    {!p.completed && p.phase !== 2 && <div className="space-y-2">
      <label htmlFor={'fraction-answer-' + spec.id} className="block font-semibold">
        {guidance.question}
      </label>
      <p id={'fraction-help-' + spec.id} className="text-sm text-slate-600">{guidance.answerHelp}</p>
      <div className="flex flex-wrap gap-2">
        <input aria-describedby={'fraction-help-' + spec.id} id={'fraction-answer-' + spec.id} className="min-h-11 w-28 rounded-xl border border-slate-300 px-3 text-lg" inputMode="numeric" pattern="[0-9]*" value={p.input} onChange={e => update({ input: e.target.value, correct: null })} onKeyDown={e => { if (e.key === 'Enter') check(); }} />
        <button type="button" className={action} onClick={check}>Valider</button>
        <button type="button" className={control} onClick={hint} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
      </div>
    </div>}
    {!p.completed && p.phase === 2 && <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor={'fraction-transfer-answer-' + spec.id}>Résultat exact</label>
      <input id={'fraction-transfer-answer-' + spec.id} aria-label="Résultat exact sous forme de fraction" className="min-h-11 w-40 rounded-xl border border-slate-300 px-3 text-lg" inputMode="text" value={p.input} onChange={e => update({ input: e.target.value, correct: null })} onKeyDown={e => { if (e.key === 'Enter') check(); }} />
      <button type="button" className={action} onClick={check}>Valider le transfert</button>
      <button type="button" className={control} onClick={hint} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
    </div>}
    {!p.completed && p.phase === 1 && <div className="rounded-xl bg-indigo-50 p-3 text-sm">Pour parler d’une fraction, le dénominateur indique le nombre de parts égales du tout; le numérateur indique combien de ces parts on prend.</div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && <p className="font-semibold text-teal-800">{spec.transfer ? 'Transfert réussi sans aide.' : 'Activité réussie. Tu peux continuer la leçon.'}</p>}
    </>}
  </div>;
}
function CoordinateActivity({ spec, progress, onProgressChange, onComplete }: Props & { spec: Extract<InteractiveActivitySpec, { kind: 'coordinate-plane' }> }) {
  const p = progress ?? initialActivityProgress();
  const evidence = learningEvidence(p);
  const transferPhase = p.phase === 1 && !!spec.transfer;
  const target = transferPhase ? spec.transfer! : spec.target;
  const guidance = coordinateGuidedQuestion({ ...spec, target });
  const svgRef = useRef<SVGSVGElement>(null);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const moveTo = (x: number, y: number) => {
    if (!p.completed) update({ x: clampGrid(x, -5, 5), y: clampGrid(y, -5, 5), correct: null });
  };
  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;
    const px = (event.clientX - box.left) * 360 / box.width;
    const py = (event.clientY - box.top) * 360 / box.height;
    const point = pixelToGraph(px, py);
    moveTo(point.x, point.y);
  };
  const check = () => {
    if (p.completed) return;
    const attempts = p.attempts + 1;
    if (isPointCorrect(p.x, p.y, target)) {
      if (!transferPhase && spec.transfer) {
        update({ phase: 1, x: 0, y: 0, attempts, correct: null, feedback: 'Point guidé correctement placé. Essaie maintenant un autre point sans indication de déplacement.', learningEvidence: { ...evidence, guidedCompleted: true, assisted: true } });
      } else {
        const independent = transferPhase && evidence.transferAttempts === 0 && evidence.transferHintsUsed === 0;
        update({ completed: true, correct: true, attempts, feedback: transferPhase ? 'Bravo ! Tu as placé B sans indication de déplacement.' : 'Bravo ! Le point est bien placé en (' + p.x + ' ; ' + p.y + ').', learningEvidence: { ...evidence, independent, transfer: transferPhase, transferAttempts: transferPhase ? evidence.transferAttempts + 1 : evidence.transferAttempts, assisted: evidence.assisted || p.hintsUsed > 0 } });
        onComplete({ independent, attempts, hintsUsed: p.hintsUsed });
      }
    } else {
      const swapped = target.x !== target.y && p.x === target.y && p.y === target.x;
      const feedback = swapped ? 'Vérifie l’ordre des coordonnées : l’abscisse vient avant l’ordonnée.'
        : p.x === target.x ? 'L’abscisse est correcte. Vérifie la position verticale du point.'
          : p.x === -target.x && target.x !== 0 ? 'Vérifie le signe de l’abscisse : le sens horizontal dépend de son signe.'
            : 'Vérifie l’abscisse sur l’axe horizontal, puis contrôle l’ordonnée sur l’axe vertical.';
      update({ attempts, correct: false, feedback, learningEvidence: { ...evidence, assisted: true, ...(transferPhase ? { transferAttempts: evidence.transferAttempts + 1 } : {}) } });
    }
  };
  const hint = () => {
    const count = Math.min(3, p.phaseHints + 1);
    const messages = ['Lis d’abord l’abscisse sur l’axe horizontal.', 'L’ordonnée se lit sur l’axe vertical.', 'Le point attendu est (' + target.x + ' ; ' + target.y + ').'];
    update({ phaseHints: count, hintsUsed: p.hintsUsed + 1, feedback: messages[count - 1], learningEvidence: { ...evidence, assisted: true, ...(transferPhase ? { transferHintsUsed: evidence.transferHintsUsed + 1 } : {}), ...(transferPhase && count === 3 && !evidence.disclosedItems.includes('coordinate-transfer') ? { disclosedItems: [...evidence.disclosedItems, 'coordinate-transfer'] } : {}) } });
  };
  const dot = graphToPixel(p.x, p.y);
  return <div className="space-y-3" data-testid="coordinate-plane-activity">
    <div className="space-y-2 rounded-xl bg-teal-50 p-3" data-testid="coordinate-instructions">
      <p className="text-sm font-bold text-teal-800">{transferPhase ? 'Transfert indépendant · Nouveau point' : guidance.step}</p>
      <p className="text-base leading-7 text-slate-800">{transferPhase ? 'Place le point B aux coordonnées (' + target.x + ' ; ' + target.y + '). Les coordonnées sont écrites dans l’ordre (abscisse ; ordonnée).' : guidance.context}</p>
      {!transferPhase && <p className="text-base font-bold leading-7 text-slate-900" data-testid="coordinate-question">{guidance.question}</p>}
    </div>
    <svg ref={svgRef} viewBox="0 0 360 360" className="mx-auto block aspect-square w-full max-w-[360px] rounded-xl bg-white" style={{ touchAction: 'none' }} role="img" aria-label={'Repère cartésien de -5 à 5. Point actuellement en (' + p.x + ' ; ' + p.y + ').'} onPointerDown={e => { if (!p.completed) { e.currentTarget.setPointerCapture(e.pointerId); movePointer(e); } }} onPointerMove={e => { if (e.buttons === 1 && !p.completed) movePointer(e); }}>
      {Array.from({ length: 11 }, (_, i) => {
        const pos = 55 + i * 25;
        return <g key={i}><line x1={pos} y1="55" x2={pos} y2="305" stroke="#e2e8f0" /><line x1="55" y1={pos} x2="305" y2={pos} stroke="#e2e8f0" /></g>;
      })}
      <line x1="55" y1="180" x2="310" y2="180" stroke="#334155" strokeWidth="2.5" />
      <line x1="180" y1="310" x2="180" y2="50" stroke="#334155" strokeWidth="2.5" />
      <path d="M310 180l-8 -5v10z M180 50l-5 8h10z" fill="#334155" />
      {Array.from({ length: 11 }, (_, i) => {
        const v = i - 5, pos = 180 + v * 25;
        return <g key={v}>{v !== 0 && <><text x={pos} y="197" fontSize="10" textAnchor="middle" fill="#475569">{v}</text><text x="168" y={180 - v * 25 + 4} fontSize="10" textAnchor="end" fill="#475569">{v}</text></>}</g>;
      })}
      <text x="320" y="174" fontSize="13" fontWeight="bold">x</text><text x="189" y="45" fontSize="13" fontWeight="bold">y</text>
      <rect x="55" y="55" width="250" height="250" fill="transparent" pointerEvents="all" />
      <circle cx={dot.x} cy={dot.y} r="12" fill="#14b8a6" stroke="#0f766e" strokeWidth="3" className="motion-safe:transition-all motion-safe:duration-100" />
      <text x={Math.min(298, dot.x + 13)} y={Math.max(24, dot.y - 15)} fontSize="13" fontWeight="bold" fill="#0f766e">{transferPhase ? 'B' : 'A'}</text>
    </svg>
    <p className="text-center text-sm font-semibold">{transferPhase ? 'B' : 'A'} = ({p.x} ; {p.y})</p>
    <p className="text-sm text-slate-600">{guidance.answerHelp}</p>
    <div className="flex flex-wrap justify-center gap-2" aria-label="Déplacer le point">
      <button type="button" className={control} disabled={p.completed} onClick={() => moveTo(p.x - 1, p.y)} aria-label="Déplacer à gauche">←</button>
      <button type="button" className={control} disabled={p.completed} onClick={() => moveTo(p.x, p.y + 1)} aria-label="Déplacer vers le haut">↑</button>
      <button type="button" className={control} disabled={p.completed} onClick={() => moveTo(p.x, p.y - 1)} aria-label="Déplacer vers le bas">↓</button>
      <button type="button" className={control} disabled={p.completed} onClick={() => moveTo(p.x + 1, p.y)} aria-label="Déplacer à droite">→</button>
    </div>
    {!p.completed && <div className="flex flex-wrap justify-center gap-2">
      <button type="button" className={action} onClick={check}>Valider la position</button>
      <button type="button" className={control} onClick={hint} disabled={p.phaseHints >= 3}>Indice {p.phaseHints}/3</button>
    </div>}
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && spec.transfer && <p className="font-semibold text-teal-800">Transfert réussi sans aide.</p>}
  </div>;
}
export function InteractiveActivityHost(props: Props) {
  const parsed = InteractiveActivitySchema.safeParse(props.spec);
  if (!parsed.success) return <p role="alert">Cette activité interactive est indisponible : données mathématiques invalides.</p>;
  const spec = parsed.data;
  return <section className="rounded-2xl border border-teal-200 bg-white p-3 sm:p-5" aria-label={spec.title}>
    <h3 className="mb-1 text-lg font-bold text-slate-900">{spec.title}</h3>
    {spec.schoolLevel && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-800">Niveau {spec.schoolLevel}</p>}
    {spec.kind === 'fraction-bar'
      ? <FractionActivity {...props} spec={spec} />
      : spec.kind === 'fraction-select'
        ? <FractionSelectActivity {...props} spec={spec} />
        : spec.kind === 'coordinate-plane'
          ? <CoordinateActivity {...props} spec={spec} />
          : spec.kind === 'algebra-tiles'
            ? <AlgebraTilesActivity {...props} spec={spec} />
            : spec.kind === 'linear-function'
              ? <LinearFunctionActivity {...props} spec={spec} />
              : spec.kind === 'line-fit'
                ? <LineFitActivity {...props} spec={spec} />
                : <EquationDecompositionActivity key={spec.id} {...props} spec={spec} />}
  </section>;
}
