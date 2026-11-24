import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { InteractiveActivitySchema, initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import { clampGrid, expectedFractionSteps, gradePartCount, graphToPixel, isPointCorrect, pixelToGraph } from './math';
import { coordinateGuidedQuestion, fractionGuidedQuestion, namedParts } from './pedagogicalQuestions';

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
  const p = progress ?? initialActivityProgress();
  const steps = expectedFractionSteps(spec.left, spec.right, spec.targetDenominator);
  const guidance = fractionGuidedQuestion(spec, p.phase);
  const update = (patch: Partial<ActivityProgress>) => onProgressChange({ ...p, ...patch });
  const check = () => {
    if (p.completed) return;
    const answer = p.input.trim();
    if (gradePartCount(answer, p.phase === 0 ? steps.rightParts : steps.totalParts) === 'invalid') {
      update({ feedback: 'Écris un nombre entier de parts.', correct: false });
      return;
    }
    const expected = p.phase === 0 ? steps.rightParts : steps.totalParts;
    const attempts = p.attempts + 1;
    if (gradePartCount(answer, expected) !== 'correct') {
      update({ attempts, correct: false, feedback: p.phase === 0
        ? 'Pour additionner, les parts doivent être de même taille. Regarde la barre du bas : combien de ' + namedParts(spec.targetDenominator) + ' seront coloriés après le partage ?'
        : 'Les dénominateurs sont identiques : additionne seulement les parts coloriées des deux barres.' });
      return;
    }
    if (p.phase === 0) {
      update({ phase: 1, phaseHints: 0, input: '', attempts, correct: null, feedback: 'Exact ! ' + spec.right.n + '/' + spec.right.d + ' = ' + steps.rightParts + '/' + spec.targetDenominator + '.' });
    } else {
      update({ attempts, completed: true, correct: true, feedback: 'Bravo ! Le total est ' + steps.totalParts + '/' + spec.targetDenominator + '.' });
      onComplete({ independent: p.hintsUsed === 0 && attempts === 2, attempts, hintsUsed: p.hintsUsed });
    }
  };
  const hints = p.phase === 0
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
    update({ phaseHints: next, hintsUsed: p.hintsUsed + 1, feedback: hints[next - 1] });
  };
  return <div className="space-y-4" data-testid="fraction-bar-activity">
    <div className="space-y-2 rounded-xl bg-teal-50 p-3" data-testid="fraction-step-instructions">
      <p className="text-sm font-bold text-teal-800">{guidance.step}</p>
      <p className="text-base leading-7 text-slate-800">{guidance.context}</p>
    </div>
    <div className="rounded-xl bg-slate-50 p-3 space-y-4">
      <Tiles denominator={spec.left.d} filled={spec.left.n} label={'Barre du haut : ' + spec.left.n + '/' + spec.left.d} />
      <Tiles denominator={p.phase === 0 ? spec.right.d : spec.targetDenominator} filled={p.phase === 0 ? spec.right.n : steps.rightParts} label={'Barre du bas : ' + (p.phase === 0 ? spec.right.n + '/' + spec.right.d : steps.rightParts + '/' + spec.targetDenominator)} />
      {p.completed && <Tiles denominator={spec.targetDenominator} filled={steps.totalParts} label={'Total : ' + steps.totalParts + '/' + spec.targetDenominator} />}
    </div>
    {!p.completed && <div className="space-y-2">
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
    <p role="status" aria-live="polite" className={'min-h-7 text-sm font-semibold ' + (p.correct === false ? 'text-amber-800' : 'text-teal-800')}>{p.feedback}</p>
    {p.completed && <p className="font-semibold text-teal-800">Activité réussie. Tu peux continuer la leçon.</p>}
  </div>;
}
function CoordinateActivity({ spec, progress, onProgressChange, onComplete }: Props & { spec: Extract<InteractiveActivitySpec, { kind: 'coordinate-plane' }> }) {
  const p = progress ?? initialActivityProgress();
  const guidance = coordinateGuidedQuestion(spec);
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
    if (isPointCorrect(p.x, p.y, spec.target)) {
      update({ completed: true, correct: true, attempts, feedback: 'Bravo ! Le point est bien placé en (' + p.x + ' ; ' + p.y + ').' });
      onComplete({ independent: p.hintsUsed === 0 && attempts === 1, attempts, hintsUsed: p.hintsUsed });
    } else {
      const feedback = p.x !== spec.target.x
        ? 'Vérifie l’abscisse : avance vers la droite si elle est positive, vers la gauche si elle est négative.'
        : 'L’abscisse est correcte. Vérifie l’ordonnée : monte si elle est positive, descends si elle est négative.';
      update({ attempts, correct: false, feedback });
    }
  };
  const hint = () => {
    const count = Math.min(3, p.phaseHints + 1);
    const messages = ['Lis d’abord l’abscisse sur l’axe horizontal.', 'L’ordonnée se lit sur l’axe vertical.', 'Le point attendu est (' + spec.target.x + ' ; ' + spec.target.y + ').'];
    update({ phaseHints: count, hintsUsed: p.hintsUsed + 1, feedback: messages[count - 1] });
  };
  const dot = graphToPixel(p.x, p.y);
  return <div className="space-y-3" data-testid="coordinate-plane-activity">
    <div className="space-y-2 rounded-xl bg-teal-50 p-3" data-testid="coordinate-instructions">
      <p className="text-sm font-bold text-teal-800">{guidance.step}</p>
      <p className="text-base leading-7 text-slate-800">{guidance.context}</p>
      <p className="text-base font-bold leading-7 text-slate-900">{guidance.question}</p>
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
      <text x={Math.min(298, dot.x + 13)} y={Math.max(24, dot.y - 15)} fontSize="13" fontWeight="bold" fill="#0f766e">A</text>
    </svg>
    <p className="text-center text-sm font-semibold">A = ({p.x} ; {p.y})</p>
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
      : <CoordinateActivity {...props} spec={spec} />}
  </section>;
}
