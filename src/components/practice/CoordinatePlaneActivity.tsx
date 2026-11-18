import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { PracticeFeedback } from './PracticeFeedback';
import {
  coordinateParts, isCoordinateExercise,
  type CoordinateAnswer, type CoordinatePlaneExercise,
} from '@/features/practice/coordinatePlane';

export type CoordinatePlaneActivityProps = {
  exercise: CoordinatePlaneExercise;
  language?: string;
  disabled?: boolean;
  onChange?: (state: CoordinateAnswer) => void;
  onComplete?: (state: CoordinateAnswer) => void;
};

type Pair = Pick<CoordinateAnswer, 'x' | 'y'>;
type Axis = 'x' | 'y';
const control = 'min-h-11 rounded-xl border-2 px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50';

/** Positive-quadrant coordinate tool. Authored targets are never copied into answers. */
export function CoordinatePlaneActivity(props: CoordinatePlaneActivityProps) {
  if (!isCoordinateExercise(props.exercise)) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{props.language?.startsWith('en') ? 'This coordinate activity is not configured correctly.' : 'Cette activité de repérage est mal configurée.'}</p>;
  return <CoordinateSession key={JSON.stringify(props.exercise)} {...props} />;
}

function CoordinateSession({ exercise, language = 'fr', disabled = false, onChange, onComplete }: CoordinatePlaneActivityProps) {
  const fr = language.startsWith('fr');
  const [pair, setPair] = useState<Pair>({ x: null, y: null });
  const [attempts, setAttempts] = useState(0);
  const [supported, setSupported] = useState(false);
  const [complete, setComplete] = useState(false);
  const [checked, setChecked] = useState<Pair | null>(null);
  const [feedback, setFeedback] = useState<'neutral' | 'guided' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [confirmed, setConfirmed] = useState({ x: false, y: false });
  const completedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.({ x: pair.x, y: pair.y, attempts, supported, complete });
  }, [pair.x, pair.y, attempts, supported, complete]);

  const validAxis = (axis: Axis, value: number | null) => value !== null && Number.isInteger(value) && value >= 0 && value <= (axis === 'x' ? exercise.maxX : exercise.maxY);
  const ready = validAxis('x', pair.x) && validAxis('y', pair.y);
  const frozen = disabled || complete || feedback !== null;
  const setAxis = (axis: Axis, value: number | null) => {
    if (frozen || confirmed[axis]) return;
    setPair(current => ({ ...current, [axis]: value }));
  };
  const applyGuide = () => {
    if (disabled || complete) return;
    setSupported(true);
    setHintOpen(true);
    // Only checked, frozen work can earn a confirmation. Unchecked edits cannot.
    if (feedback && checked) {
      const parts = coordinateParts(exercise, checked);
      setConfirmed(previous => ({ x: previous.x || parts.x, y: previous.y || parts.y }));
      setFeedback('guided');
    }
  };
  const check = () => {
    if (frozen || !ready || completedRef.current) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const snapshot = { x: pair.x, y: pair.y };
    const parts = coordinateParts(exercise, snapshot);
    setChecked(snapshot);
    if (parts.x && parts.y) {
      completedRef.current = true;
      setComplete(true);
      setHintOpen(false);
      onComplete?.({ ...snapshot, attempts: nextAttempts, supported, complete: true });
    } else {
      // The default response never reveals which axis is correct or locks it.
      if (supported) setConfirmed(previous => ({ x: previous.x || parts.x, y: previous.y || parts.y }));
      setFeedback(supported ? 'guided' : 'neutral');
    }
  };
  const retry = () => {
    if (disabled || complete) return;
    setFeedback(null);
    // Retain the entered pair, confirmed axes, attempt count and support evidence.
  };
  const reset = () => {
    if (disabled || complete) return;
    setPair({ x: null, y: null });
    setChecked(null);
    setConfirmed({ x: false, y: false });
    setFeedback(null);
    setHintOpen(false);
  };

  const left = 44, right = 326, top = 28, bottom = 268;
  const px = (value: number) => left + value / exercise.maxX * (right - left);
  const py = (value: number) => bottom - value / exercise.maxY * (bottom - top);
  const onPlotClick = (event: MouseEvent<SVGSVGElement>) => {
    if (exercise.mode !== 'plot' || frozen) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (point.x < left - 8 || point.x > right + 8 || point.y < top - 8 || point.y > bottom + 8) return;
    const x = Math.max(0, Math.min(exercise.maxX, Math.round((point.x - left) / (right - left) * exercise.maxX)));
    const y = Math.max(0, Math.min(exercise.maxY, Math.round((bottom - point.y) / (bottom - top) * exercise.maxY)));
    setPair(previous => ({ x: confirmed.x ? previous.x : x, y: confirmed.y ? previous.y : y }));
  };
  const marker = exercise.mode === 'read' ? exercise.target : ready ? pair as { x: number; y: number } : null;
  const focusAxis = !confirmed.x ? 'x' : !confirmed.y ? 'y' : null;
  const method = focusAxis === 'y'
    ? (fr ? 'Garde ton déplacement horizontal. Pour l’ordonnée, pars de l’axe horizontal et compte les graduations vers le haut.' : 'Keep your horizontal movement. For the y-coordinate, start at the horizontal axis and count the grid steps upward.')
    : confirmed.y
      ? (fr ? 'Garde ton déplacement vertical. Pour l’abscisse, pars de l’origine O et compte les graduations vers la droite.' : 'Keep your vertical movement. For the x-coordinate, start at the origin O and count the grid steps to the right.')
      : (fr ? 'Repère d’abord l’origine O. Pour l’abscisse, compte les graduations vers la droite ; pour l’ordonnée, compte-les vers le haut.' : 'Find the origin O first. For x, count grid steps to the right; for y, count them upward.');

  return <section className="space-y-4" data-testid="coordinate-activity" aria-label={fr ? 'Activité de repérage' : 'Coordinate activity'}>
    <p className="text-lg font-semibold leading-relaxed text-slate-900">{exercise.prompt}</p>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <svg viewBox="0 0 360 310" role="img" aria-label={exercise.mode === 'read' ? (fr ? 'Repère gradué avec le point A. Lis les graduations pour trouver son abscisse et son ordonnée.' : 'Graduated coordinate grid with point A. Read the axes to find its coordinates.') : (fr ? 'Repère gradué. Le point dessiné correspond uniquement aux valeurs que tu saisis.' : 'Graduated coordinate grid. The plotted point shows only the values you enter.')} className="mx-auto block h-auto w-full max-w-md select-none" onClick={onPlotClick}>
        {Array.from({ length: exercise.maxX + 1 }, (_, value) => <g key={`x-${value}`}><line x1={px(value)} y1={top} x2={px(value)} y2={bottom} stroke="#CBD5E1" strokeWidth="1" /><text x={px(value)} y={bottom + 20} textAnchor="middle" fontSize="13" fill="#334155">{value}</text></g>)}
        {Array.from({ length: exercise.maxY + 1 }, (_, value) => <g key={`y-${value}`}><line x1={left} y1={py(value)} x2={right} y2={py(value)} stroke="#CBD5E1" strokeWidth="1" />{value > 0 && <text x={left - 13} y={py(value) + 4} textAnchor="middle" fontSize="13" fill="#334155">{value}</text>}</g>)}
        <line x1={left} y1={bottom} x2={right + 13} y2={bottom} stroke="#334155" strokeWidth="2.5" /><polygon points={`${right + 15},${bottom} ${right + 6},${bottom - 4} ${right + 6},${bottom + 4}`} fill="#334155" />
        <line x1={left} y1={bottom} x2={left} y2={top - 13} stroke="#334155" strokeWidth="2.5" /><polygon points={`${left},${top - 15} ${left - 4},${top - 6} ${left + 4},${top - 6}`} fill="#334155" />
        <text x={left - 24} y={bottom + 20} fontSize="13" fontWeight="700" fill="#334155">O</text><text x={right + 20} y={bottom + 5} fontSize="14" fontWeight="700" fill="#334155">x</text><text x={left + 10} y={top - 12} fontSize="14" fontWeight="700" fill="#334155">y</text>
        {marker && <g><circle cx={px(marker.x)} cy={py(marker.y)} r="6" fill="#6D28D9" stroke="#FFFFFF" strokeWidth="2" /><text x={px(marker.x) + 10} y={py(marker.y) + (marker.y === exercise.maxY ? 18 : -9)} fontSize="15" fontWeight="700" fill="#5B21B6">A</text></g>}
      </svg>
    </div>
    {exercise.mode === 'plot' && <p className="text-sm text-slate-600">{fr ? 'Touche le quadrillage ou utilise les champs et les boutons ci-dessous.' : 'Tap the grid or use the inputs and buttons below.'}</p>}
    <div className="space-y-3">
      {(['x', 'y'] as const).map(axis => <div key={axis} className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${exercise.id}-${axis}`} className="w-24 text-sm font-semibold text-slate-800">{axis === 'x' ? (fr ? 'Abscisse (x)' : 'x-coordinate') : (fr ? 'Ordonnée (y)' : 'y-coordinate')}</label>
        <button type="button" className={`${control} w-11 px-0`} disabled={frozen || confirmed[axis] || pair[axis] === null || pair[axis] === 0} onClick={() => setAxis(axis, Math.max(0, (pair[axis] ?? 0) - 1))} aria-label={fr ? `Diminuer ${axis}` : `Decrease ${axis}`}>−</button>
        <input id={`${exercise.id}-${axis}`} type="number" inputMode="numeric" min="0" max={axis === 'x' ? exercise.maxX : exercise.maxY} step="1" value={pair[axis] ?? ''} disabled={frozen || confirmed[axis]} onChange={event => setAxis(axis, event.target.value === '' || !Number.isFinite(event.target.valueAsNumber) ? null : event.target.valueAsNumber)} className="h-11 min-w-0 w-20 rounded-xl border-2 border-slate-300 bg-white px-2 text-center text-base font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:bg-slate-100" />
        <button type="button" className={`${control} w-11 px-0`} disabled={frozen || confirmed[axis] || (pair[axis] !== null && pair[axis]! >= (axis === 'x' ? exercise.maxX : exercise.maxY))} onClick={() => setAxis(axis, pair[axis] === null ? 0 : Math.min(axis === 'x' ? exercise.maxX : exercise.maxY, pair[axis]! + 1))} aria-label={fr ? `Augmenter ${axis}` : `Increase ${axis}`}>+</button>
        {confirmed[axis] && !complete && <span className="text-sm font-semibold text-emerald-800">{fr ? 'Conservé' : 'Kept'}</span>}
      </div>)}
    </div>
    {complete ? <div data-testid="coordinate-complete" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4"><PracticeFeedback status="correct" language={fr ? 'fr' : 'en'} /><p className="font-semibold text-emerald-950">{supported ? (fr ? 'Réussi avec aide.' : 'Solved with help.') : (fr ? 'Réussi sans aide.' : 'Solved without help.')}</p></div> : <>
      {feedback && <div role="status" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p>{feedback === 'neutral' ? (fr ? 'Pas encore. Regarde de nouveau le point et les graduations.' : 'Not yet. Look again at the point and the grid steps.') : method}</p>
        {feedback === 'guided' && (confirmed.x || confirmed.y) && <p className="text-sm font-semibold">{confirmed.x ? (fr ? 'Ton abscisse est correcte et conservée.' : 'Your x-coordinate is correct and kept.') : (fr ? 'Ton ordonnée est correcte et conservée.' : 'Your y-coordinate is correct and kept.')}</p>}
        {attempts >= 2 && feedback === 'neutral' && <button type="button" data-testid="coordinate-support-offer" className={`${control} border-violet-300 bg-white text-violet-900`} disabled={disabled} onClick={applyGuide}>{fr ? 'Guide-moi' : 'Guide me'}</button>}
        <button type="button" className={`${control} border-slate-300 bg-white text-slate-900`} disabled={disabled} onClick={retry}>{fr ? 'Réessayer' : 'Try again'}</button>
      </div>}
      {!feedback && <button type="button" className={`${control} w-full border-violet-700 bg-violet-700 text-white`} disabled={disabled || !ready} onClick={check}>{fr ? 'Vérifier' : 'Check answer'}</button>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${control} flex items-center gap-2 border-transparent text-violet-900`} disabled={disabled} aria-expanded={hintOpen} onClick={hintOpen ? () => setHintOpen(false) : applyGuide}><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintOpen ? (fr ? 'Masquer l’indice' : 'Hide hint') : (fr ? 'Afficher un indice' : 'Show hint')}</button>
        <button type="button" className={`${control} flex items-center gap-2 border-transparent text-slate-700`} disabled={disabled} onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden="true" />{fr ? 'Recommencer' : 'Reset'}</button>
      </div>
      {hintOpen && <p data-testid="coordinate-hint" className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{method}</p>}
    </>}
  </section>;
}
