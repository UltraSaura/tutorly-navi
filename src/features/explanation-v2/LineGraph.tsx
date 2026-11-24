import { useRef, type PointerEvent } from 'react';
import { graphToPixel, pixelToGraph } from './math';

type Point = { x: number; y: number };
type Props = { slope: number; intercept: number; onChange: (slope: number, intercept: number) => void; step?: number; points?: Point[]; disabled?: boolean };
const snap = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number) => Math.max(-3, Math.min(3, v));
/** Shared, original SVG graph with draggable y-intercept and slope handles. */
export function LineGraph({ slope, intercept, onChange, step = 1, points = [], disabled = false }: Props) {
  const active = useRef<'intercept' | 'slope' | null>(null);
  const drag = (event: PointerEvent<SVGCircleElement>, handle: 'intercept' | 'slope') => {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const coords = pixelToGraph((event.clientX - rect.left) * 360 / rect.width, (event.clientY - rect.top) * 360 / rect.height);
    const y = snap(coords.y, step);
    if (handle === 'intercept') {
      const b = clamp(y);
      onChange(slope, b);
    } else {
      const m = clamp(snap(y - intercept, step));
      onChange(m, intercept);
    }
  };
  const interceptDot = graphToPixel(0, intercept);
  const slopeDot = graphToPixel(1, intercept + slope);
  const start = graphToPixel(-5, -5 * slope + intercept);
  const end = graphToPixel(5, 5 * slope + intercept);
  return <div className="space-y-2">
    <svg data-testid="line-graph" viewBox="0 0 360 360" className="mx-auto block aspect-square w-full max-w-[360px] rounded-xl border border-slate-200 bg-white" style={{ touchAction: 'none' }}
      role="img" aria-label={'Graphique interactif de la droite y = ' + slope.toFixed(step < 1 ? 1 : 0) + 'x + ' + intercept.toFixed(step < 1 ? 1 : 0)}>
      <defs><clipPath id="explanation-v2-graph-clip"><rect x="55" y="55" width="250" height="250" /></clipPath></defs>
      {Array.from({ length: 11 }, (_, i) => <g key={i}>
        <line x1={55 + i * 25} y1="55" x2={55 + i * 25} y2="305" stroke="#e2e8f0" />
        <line x1="55" y1={55 + i * 25} x2="305" y2={55 + i * 25} stroke="#e2e8f0" />
        {i !== 5 && <><text x={55 + i * 25} y="195" fontSize="10" textAnchor="middle" fill="#475569">{i - 5}</text><text x="170" y={55 + i * 25 + 4} fontSize="10" textAnchor="end" fill="#475569">{5 - i}</text></>}
      </g>)}
      <line x1="55" y1="180" x2="310" y2="180" stroke="#334155" strokeWidth="2" />
      <line x1="180" y1="310" x2="180" y2="50" stroke="#334155" strokeWidth="2" />
      <text x="320" y="174" fontSize="13" fontWeight="bold">x</text><text x="188" y="42" fontSize="13" fontWeight="bold">y</text>
      <g clipPath="url(#explanation-v2-graph-clip)">
        <line data-testid="graph-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#0f766e" strokeWidth="3.5" className="motion-safe:transition-all motion-safe:duration-100" />
        {points.map((p, i) => { const xy = graphToPixel(p.x, p.y); return <circle key={i} data-testid={'data-point-'+i} cx={xy.x} cy={xy.y} r="5.5" fill="#e8790d" stroke="white" strokeWidth="1.5" />; })}
      </g>
      {(['intercept','slope'] as const).map(handle => {
        const pos = handle === 'intercept' ? interceptDot : slopeDot;
        return <circle key={handle} data-testid={'drag-'+handle} cx={pos.x} cy={pos.y} r="12"
          fill={handle === 'intercept' ? '#0f766e' : '#4f46e5'} stroke="white" strokeWidth="3"
          style={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none' }}
          role="button" aria-label={handle === 'intercept' ? 'Déplacer l’ordonnée à l’origine' : 'Déplacer la pente'}
          onPointerDown={e => { if (!disabled) { active.current = handle; e.currentTarget.setPointerCapture(e.pointerId); drag(e, handle); } }}
          onPointerMove={e => { if (!disabled && active.current === handle) drag(e, handle); }}
          onPointerUp={e => { if (active.current === handle) { active.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } }}
          onPointerCancel={() => { active.current = null; }} />;
      })}
    </svg>
    <p className="text-center text-xs text-slate-600">Déplace le point vert pour changer le départ de la droite, ou le point violet pour modifier sa pente. Les boutons ci-dessous fonctionnent aussi au clavier.</p>
  </div>;
}
