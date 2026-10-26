import type { ReactNode } from 'react';

export const VISUAL_KINDS = ['clock','timeline','number_line','fraction_bar','fraction_circle','triangle','rectangle','circle','polygon','angle','symmetry','coordinate_plane','geometric_solid','solid_section','measurement','unit_conversion','groups','comparison','part_whole','table','equation','diagram','sequence'] as const;
type Data = Record<string, unknown>;
type Block = { title: string; content: string; visual: { kind: string; data: unknown; alt_text?: string; purpose?: string }; showText?: boolean };
const data = (v: unknown): Data => v && typeof v === 'object' && !Array.isArray(v) ? v as Data : {};
const n = (v: unknown, d: number) => typeof v === 'number' && Number.isFinite(v) ? v : d;
const s = (v: unknown, d = '') => typeof v === 'string' ? v : d;
const arr = (v: unknown) => Array.isArray(v) ? v.map((item) => typeof item === 'string' || typeof item === 'number' ? { label: String(item) } : data(item)) : [];
export function isVisualKind(v: unknown): v is typeof VISUAL_KINDS[number] { return typeof v === 'string' && (VISUAL_KINDS as readonly string[]).includes(v); }

export const CLOCK_GEOMETRY = {
  centerX: 120,
  centerY: 90,
  faceRadius: 66,
  tickInnerRadius: 56,
  tickOuterRadius: 63,
  labelRadius: 45,
  hourHandRadius: 35,
  minuteHandRadius: 53,
  labelFontSize: 14,
} as const;

export type ClockPoint = { x: number; y: number };

/** Clock angles use 0° at 12 o'clock and increase clockwise. */
export function clockPoint(hourAngle: number, radius: number): ClockPoint {
  const angle = (hourAngle * 30 - 90) * Math.PI / 180;
  return {
    x: CLOCK_GEOMETRY.centerX + radius * Math.cos(angle),
    y: CLOCK_GEOMETRY.centerY + radius * Math.sin(angle),
  };
}

function Clock({ d }: { d: Data }) {
  const h = n(d.hour ?? d.hours, 0) % 12, m = n(d.minute ?? d.minutes, 0) % 60;
  const hand = (a: number, r: number) => { const point = clockPoint(a / 30, r); return `${point.x},${point.y}`; };
  const label = (hour: number) => clockPoint(hour % 12, CLOCK_GEOMETRY.labelRadius);
  const annotations = data(d.annotations);
  const handLabels = data(d.hand_labels ?? d.handLabels);
  const relationships = Array.isArray(d.relationships ?? d.relations)
    ? ((d.relationships ?? d.relations) as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const hourLabel = s(annotations.hours ?? annotations.hour ?? handLabels.hours ?? handLabels.hour);
  const minuteLabel = s(annotations.minutes ?? annotations.minute ?? handLabels.minutes ?? handLabels.minute);
  return <div className="space-y-2">
    <svg viewBox="0 0 240 205" className="mx-auto w-full max-w-sm" role="img" aria-label="Horloge pédagogique">
      <circle cx={CLOCK_GEOMETRY.centerX} cy={CLOCK_GEOMETRY.centerY} r={CLOCK_GEOMETRY.faceRadius} fill="white" stroke="#4F6FD8" strokeWidth="3" />
      {Array.from({length:12},(_,i)=>{const a=i*30;return <line key={i} x1={hand(a,CLOCK_GEOMETRY.tickInnerRadius).split(',')[0]} y1={hand(a,CLOCK_GEOMETRY.tickInnerRadius).split(',')[1]} x2={hand(a,CLOCK_GEOMETRY.tickOuterRadius).split(',')[0]} y2={hand(a,CLOCK_GEOMETRY.tickOuterRadius).split(',')[1]} stroke="#667085" strokeWidth="3"/>})}
      {[{hour:12,text:'12'},{hour:3,text:'3'},{hour:6,text:'6'},{hour:9,text:'9'}].map(({hour,text}) => { const point = label(hour); return <text key={hour} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" fontSize={CLOCK_GEOMETRY.labelFontSize} fontWeight="700" fill="#111827">{text}</text>; })}
      <line x1={CLOCK_GEOMETRY.centerX} y1={CLOCK_GEOMETRY.centerY} x2={hand((h+m/60)*30,CLOCK_GEOMETRY.hourHandRadius).split(',')[0]} y2={hand((h+m/60)*30,CLOCK_GEOMETRY.hourHandRadius).split(',')[1]} stroke="#3448A5" strokeWidth="7" strokeLinecap="round"/>
      <line x1={CLOCK_GEOMETRY.centerX} y1={CLOCK_GEOMETRY.centerY} x2={hand(m*6,CLOCK_GEOMETRY.minuteHandRadius).split(',')[0]} y2={hand(m*6,CLOCK_GEOMETRY.minuteHandRadius).split(',')[1]} stroke="#16C7A3" strokeWidth="5" strokeLinecap="round"/>
      <circle cx={CLOCK_GEOMETRY.centerX} cy={CLOCK_GEOMETRY.centerY} r="5" fill="#111827"/>
      {hourLabel && <text x="28" y="190" fontSize="10" fontWeight="700" fill="#3448A5">{hourLabel}</text>}
      {minuteLabel && <text x="212" y="190" textAnchor="end" fontSize="10" fontWeight="700" fill="#16C7A3">{minuteLabel}</text>}
    </svg>
    {relationships.length > 0 && <div className="flex flex-wrap justify-center gap-2" aria-label="Relations pédagogiques">{relationships.map((relationship, index) => <span key={`${relationship}-${index}`} className="rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-semibold text-[#3448A5]">{relationship}</span>)}</div>}
  </div>;
}
function Timeline({ d }: { d: Data }) {
  const xs = arr(d.events ?? d.nodes ?? d.items ?? d.units ?? d.labels);
  // Relationship labels are data, not inferred from a unit's name. The
  // generator may provide one label per connector in `relations` or on an
  // individual item via `next`, `relation`, or `multiplier`.
  const relations = Array.isArray(d.relations ?? d.relationships)
    ? ((d.relations ?? d.relationships) as unknown[]).map((item) => typeof item === 'string' ? item : s(data(item).label ?? data(item).value))
    : [];
  const relation = (item: Data, index: number) => s(item.next ?? item.relation ?? item.multiplier ?? relations[index]);
  const rows = Array.from({ length: Math.ceil(xs.length / 3) }, (_, row) => xs.slice(row * 3, row * 3 + 3));
  return <div className="space-y-2" role="list" aria-label="Unités de durée">
    <p className="text-center text-xs font-bold uppercase tracking-wide text-[#3448A5]">Du plus court au plus long →</p>
    {rows.map((row, rowIndex) => <div key={rowIndex}>
      {rowIndex > 0 && <div className="flex h-5 items-center justify-center text-sm font-bold text-[#4F6FD8]" aria-hidden>↓</div>}
      <div className="flex items-stretch justify-center gap-1 sm:gap-2">
      {row.map((item, columnIndex) => { const index = rowIndex * 3 + columnIndex; const factor = relation(item, index); return <div key={index} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <div className="flex min-h-[62px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl border-2 border-[#D8E1F0] bg-white px-1.5 py-2 text-center shadow-sm" role="listitem">
          <span className="text-[10px] font-extrabold text-[#667085]">{index + 1}</span>
          <span className="mt-1 break-words text-xs font-extrabold leading-tight text-[#111827] sm:text-sm">{s(item.label ?? item.title ?? item.value, `Étape ${index + 1}`)}</span>
          {item.detail !== undefined && <span className="mt-0.5 text-[10px] text-[#667085]">{String(item.detail)}</span>}
        </div>
        {columnIndex < row.length - 1 && <span className="flex shrink-0 flex-col items-center justify-center text-sm font-bold text-[#4F6FD8] sm:text-base"><span aria-hidden>→</span>{factor && <span className="text-[9px] font-semibold text-[#3448A5]">{factor}</span>}</span>}
      </div>; })}
      </div>
    </div>)}
  </div>;
}
export function numberLineTickValues(min: number, max: number, step: number, maxTicks = 41): number[] {
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) return [];
  const count = Math.floor((max - min) / step + 1e-9);
  if (count + 1 > maxTicks) return [];
  return Array.from({ length: count + 1 }, (_, index) => Number((min + index * step).toFixed(10)));
}

export function formatNumberLineLabel(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 10, useGrouping: false }).format(value);
}

export function numberLinePosition(value: number, min: number, max: number): number {
  return max === min ? 0 : (value - min) / (max - min);
}

export function numberLineExactTickIndex(ticks: number[], value: number): number | null {
  const index = ticks.findIndex((tick) => Math.abs(tick - value) < 1e-9);
  return index === -1 ? null : index;
}

export function numberLineLabelIndices(ticks: number[], value: number, maxLabels: number, minGap = 32): Set<number> {
  if (ticks.length === 0) return new Set();
  const indices = new Set<number>([0, ticks.length - 1]);
  const exactValueIndex = numberLineExactTickIndex(ticks, value);
  const pixelPosition = (index: number) => (index / Math.max(1, ticks.length - 1)) * 280;
  const canPlace = (index: number) => Array.from(indices).every((placed) => Math.abs(pixelPosition(index) - pixelPosition(placed)) >= minGap);
  const priorityIndices = ticks
    .map((tick, index) => ({ tick, index }))
    .filter(({ tick, index }) => index > 0 && index < ticks.length - 1 && Number.isInteger(tick))
    .map(({ index }) => index);

  for (const index of priorityIndices) {
    if (indices.size >= maxLabels || !canPlace(index)) continue;
    indices.add(index);
  }
  if (exactValueIndex !== null && indices.size < maxLabels && canPlace(exactValueIndex)) indices.add(exactValueIndex);

  const stride = Math.max(1, Math.ceil((ticks.length - 1) / Math.max(1, maxLabels - indices.size + 1)));
  for (let index = stride; index < ticks.length - 1 && indices.size < maxLabels; index += stride) {
    if (canPlace(index)) indices.add(index);
  }
  return indices;
}

function NumberLine({ d }: { d: Data }) {
  const min = n(d.min, 0), max = n(d.max, 10), step = n(d.step, 1), value = n(d.value, min);
  const ticks = numberLineTickValues(min, max, step);
  const x = (q: number) => 25 + numberLinePosition(q, min, max) * 280;
  const labels = Array.isArray(d.labels) ? d.labels : [];
  const labelFor = (tick: number, index: number) => {
    const item = labels[index];
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      if (record.label !== undefined) return String(record.label);
    }
    return formatNumberLineLabel(tick);
  };
  if (ticks.length === 0) return <div role="status">Données de graduation invalides ou nécessitant plus de 41 graduations.</div>;
  const exactValueIndex = numberLineExactTickIndex(ticks, value);
  const desktopLabels = numberLineLabelIndices(ticks, value, 21, 32);
  const mobileLabels = numberLineLabelIndices(ticks, value, 9, 42);
  const desktopPointLabel = exactValueIndex === null || !desktopLabels.has(exactValueIndex);
  const mobilePointLabel = exactValueIndex === null || !mobileLabels.has(exactValueIndex);
  return <svg viewBox="0 0 330 110" className="w-full" role="img" aria-label="Droite graduée">
    <style>{`.number-line-label--mobile,.number-line-point-label--mobile{display:none}@media(max-width:480px){.number-line-label--desktop,.number-line-point-label--desktop{display:none}.number-line-label--mobile,.number-line-point-label--mobile{display:block}}`}</style>
    <line x1="25" y1="50" x2="305" y2="50" stroke="#0f766e" strokeWidth="4"/>
    {ticks.map((tick, index) => <g key={`${tick}-${index}`}><line x1={x(tick)} y1="42" x2={x(tick)} y2="58" stroke="#0f766e"/>{desktopLabels.has(index) && <text className="number-line-label--desktop" x={x(tick)} y="78" textAnchor="middle" fontSize="11">{labelFor(tick, index)}</text>}{mobileLabels.has(index) && <text className="number-line-label--mobile" x={x(tick)} y="78" textAnchor="middle" fontSize="11">{labelFor(tick, index)}</text>}</g>)}
    {desktopPointLabel && <text className="number-line-point-label--desktop" x={x(value)} y="98" textAnchor="middle" fontSize="11">{formatNumberLineLabel(value)}</text>}{mobilePointLabel && <text className="number-line-point-label--mobile" x={x(value)} y="98" textAnchor="middle" fontSize="11">{formatNumberLineLabel(value)}</text>}
    <circle cx={x(value)} cy="50" r="8" fill="#f59e0b"/>
  </svg>;
}
function Fraction({ d, circle=false }: { d: Data; circle?: boolean }) { const den=Math.max(1,Math.min(16,Math.round(n(d.denominator,4)))),num=Math.max(0,Math.min(den,Math.round(n(d.numerator,1)))); if(circle)return <svg viewBox="0 0 220 180" className="mx-auto w-full max-w-sm" role="img" aria-label="Disque fractionné"><circle cx="110" cy="80" r="60" fill="#d1fae5" stroke="#0f766e" strokeWidth="3"/>{Array.from({length:num},(_,i)=>{const a=i*2*Math.PI/den-Math.PI/2,b=(i+1)*2*Math.PI/den-Math.PI/2;const p=(q:number)=>`${110+60*Math.cos(q)},${80+60*Math.sin(q)}`;return <path key={i} d={`M110 80 L${p(a)} A60 60 0 0 1 ${p(b)} Z`} fill="#14b8a6"/>})}<text x="110" y="165" textAnchor="middle">{num} / {den}</text></svg>; return <svg viewBox="0 0 360 100" className="w-full" role="img" aria-label="Barre de fraction"><g transform="translate(15 25)">{Array.from({length:den},(_,i)=><rect key={i} x={i*330/den} width={330/den-2} height="38" fill={i<num?'#14b8a6':'#d1fae5'} stroke="#0f766e"/>)}</g><text x="180" y="88" textAnchor="middle">{num} / {den}</text></svg>; }
type Point = { x: number; y: number; label?: string };
const point = (value: unknown): Point | null => { if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') return { x: value[0], y: value[1] }; const p = data(value); return typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y) ? { x: p.x, y: p.y, label: s(p.label ?? p.name ?? p.id) || undefined } : null; };
const points = (value: unknown): Point[] => Array.isArray(value) ? value.map(point).filter((p): p is Point => Boolean(p)) : [];
const pointList = (d: Data) => points(d.points ?? d.vertices ?? d.coordinates ?? d.figure ?? d.original);
const fallback = (message: string, title?: string) => <div role="status" className="space-y-1 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center text-sm text-[#667085]"><p className="font-semibold text-[#3448A5]">{title || 'Données géométriques incomplètes'}</p><p>{message}</p></div>;
const labelFor = (p: Point, index: number) => p.label || `Point ${index + 1}`;
function Diagram({ d }: { d: Data }) {
  const ps = pointList(d); const segs = Array.isArray(d.segments) ? d.segments : []; const lines = Array.isArray(d.lines) ? d.lines : [];
  if (ps.length === 0) { const labels = Array.isArray(d.points) ? d.points.filter((v): v is string => typeof v === 'string') : []; const annotations = Array.isArray(d.annotations) ? d.annotations.filter((v): v is string => typeof v === 'string') : []; const lineNames = Array.isArray(d.lines) ? d.lines.map((v) => { const line = data(v); const through = Array.isArray(line.through) ? line.through.filter((x): x is string => typeof x === 'string').join('–') : ''; return s(line.label) || through || s(line.relation); }).filter(Boolean) : []; const relations = Array.isArray(d.relations) ? d.relations.map((v) => typeof v === 'string' ? v : s(data(v).label ?? data(v).type)).filter(Boolean) : []; return <div role="status" className="space-y-2 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#475569]"><p className="font-semibold text-[#3448A5]">Données symboliques du diagramme</p>{labels.length > 0 && <p><strong>Points :</strong> {labels.join(', ')}</p>}{typeof d.segment === 'string' && <p><strong>Segment :</strong> {d.segment}</p>}{lineNames.length > 0 && <p><strong>Droites :</strong> {lineNames.join(', ')}</p>}{relations.length > 0 && <p><strong>Relations :</strong> {relations.join(', ')}</p>}{annotations.length > 0 && <ul className="list-disc pl-5">{annotations.map((item, i) => <li key={i}>{item}</li>)}</ul>}<p className="text-xs text-[#667085]">Coordonnées absentes : aucune position n’est inventée.</p></div>; }
  const by = (v: unknown): Point | null => typeof v === 'number' ? ps[v] || null : point(v) || ps.find(p => p.label === String(v)) || null;
  const coords = (item: unknown): Point[] => { if (Array.isArray(item)) return item.map(by).filter((p): p is Point => Boolean(p)); const relation = data(item); return [by(relation.from ?? relation.start), by(relation.to ?? relation.end)].filter((p): p is Point => Boolean(p)); };
  return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label={s(d.title, 'Diagramme géométrique')}>
    {lines.map((raw, i) => { const ps2 = coords(data(raw).points ?? data(raw).through); return ps2.length >= 2 ? <line key={`line-${i}`} x1={ps2[0].x} y1={ps2[0].y} x2={ps2[1].x} y2={ps2[1].y} stroke="#0f766e" strokeWidth="3" strokeDasharray={data(raw).infinite || data(raw).extends ? '8 5' : undefined}/> : null; })}
    {segs.map((raw, i) => { const ps2 = coords(raw); return ps2.length >= 2 ? <line key={`seg-${i}`} x1={ps2[0].x} y1={ps2[0].y} x2={ps2[1].x} y2={ps2[1].y} stroke="#3448A5" strokeWidth="4"/> : null; })}
    {Array.isArray(d.arrows) && d.arrows.map((raw, i) => { const ps2 = coords(raw); return ps2.length >= 2 ? <line key={`arrow-${i}`} x1={ps2[0].x} y1={ps2[0].y} x2={ps2[1].x} y2={ps2[1].y} stroke="#F59E0B" strokeWidth="3" markerEnd="url(#diagram-arrow)"/> : null; })}
    <defs><marker id="diagram-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#F59E0B"/></marker></defs>
    {ps.map((p, i) => <g key={`point-${i}`}><circle cx={p.x} cy={p.y} r="5" fill="#F59E0B"/><text x={p.x + 7} y={p.y - 7} fontSize="12" fontWeight="700" fill="#111827">{labelFor(p, i)}</text></g>)}
    {Array.isArray(d.annotations) && d.annotations.map((raw, i) => { const a = data(raw); return <text key={`annotation-${i}`} x={n(a.x, 15)} y={n(a.y, 190)} fontSize="11" fill="#667085">{s(a.text ?? a.label)}</text>; })}
    {Array.isArray(d.relations) && d.relations.map((raw, i) => { const relation = data(raw); const text = typeof raw === 'string' ? raw : s(relation.label ?? relation.type); return text ? <text key={`relation-${i}`} x={n(relation.x, 15)} y={n(relation.y, 18 + i * 14)} fontSize="11" fontWeight="700" fill="#B45309">{text}</text> : null; })}
  </svg>;
}
function Angle({ d }: { d: Data }) {
  const center = point(d.vertex ?? d.center); const rays = Array.isArray(d.rays) ? d.rays.map(point).filter((p): p is Point => Boolean(p)) : [];
  const degrees = n(d.degrees ?? d.angle ?? d.value, NaN); const labels = Array.isArray(d.labels) ? d.labels.filter((v): v is string => typeof v === 'string') : [];
  if (!center || rays.length < 2) return fallback(Number.isFinite(degrees) ? `Valeur de l’angle : ${degrees}°.` : `Les données décrivent « ${s(d.label, 'un angle')} », mais le sommet et les côtés ne sont pas fournis.`, 'Angle non traçable');
  const right = d.rightAngle === true || degrees === 90; return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label="Angle géométrique"><line x1={center.x} y1={center.y} x2={rays[0].x} y2={rays[0].y} stroke="#3448A5" strokeWidth="4"/><line x1={center.x} y1={center.y} x2={rays[1].x} y2={rays[1].y} stroke="#3448A5" strokeWidth="4"/><path d={`M ${rays[0].x} ${rays[0].y} Q ${center.x} ${center.y} ${rays[1].x} ${rays[1].y}`} fill="none" stroke="#16C7A3" strokeWidth="3"/>{right && <path d={`M ${center.x + 14} ${center.y} L ${center.x + 14} ${center.y - 14} L ${center.x} ${center.y - 14}`} fill="none" stroke="#F59E0B" strokeWidth="3"/>}<circle cx={center.x} cy={center.y} r="4" fill="#F59E0B"/>{[center, ...rays].map((p, i) => <text key={i} x={p.x + 7} y={p.y - 7} fontSize="12" fontWeight="700">{p.label || labels[i] || ''}</text>)}{Number.isFinite(degrees) && <text x="150" y="185" textAnchor="middle" fontSize="12" fontWeight="700">{degrees}°</text>}</svg>;
}
/** Real-world units (cm/mm) are converted to canvas points so a "3 cm" radius stays visible; clamped to fit the 300x200 canvas. */
export const CM_TO_CANVAS = 20;
export function circleDisplayRadius(radius: number, unit: unknown, center: { x: number; y: number }): number {
  const u = typeof unit === 'string' ? unit.trim().toLowerCase() : '';
  const scaled = u === 'cm' ? radius * CM_TO_CANVAS : u === 'mm' ? radius * CM_TO_CANVAS / 10 : radius;
  if (scaled === radius) return radius;
  const max = Math.max(10, Math.min(center.x, 300 - center.x, center.y, 200 - center.y) - 6);
  return Math.min(scaled, max);
}
function Circle({ d }: { d: Data }) {
  const centerValue = d.center ?? d.centre; const center = point(centerValue); const rawRadius = n(d.radius, NaN); if (!center || !Number.isFinite(rawRadius) || rawRadius <= 0) { const radiusText = typeof d.radius === 'string' ? d.radius : typeof d.rayon === 'string' ? d.rayon : data(d.radius).label; const diameterText = typeof d.diameter === 'string' ? d.diameter : typeof d.diametre === 'string' ? d.diametre : data(d.diameter).label; return <div role="status" className="space-y-2 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#475569]"><p className="font-semibold text-[#3448A5]">Cercle décrit par les données</p>{centerValue && <p><strong>Centre :</strong> {s(centerValue)}</p>}{radiusText && <p><strong>Rayon :</strong> {s(radiusText)}</p>}{diameterText && <p><strong>Diamètre :</strong> {s(diameterText)}</p>}<p className="text-xs text-[#667085]">Coordonnées ou rayon numérique absents : aucune forme n’est inventée.</p></div>; }
  const radius = circleDisplayRadius(rawRadius, d.unit, center);
  const diameter = d.diameter === true || point(d.diameter); const diameterEnd = point(d.diameterEnd) || (diameter ? { x: center.x + radius, y: center.y, label: undefined } : null); const radiusEnd = point(d.radiusEnd) || (d.radius === undefined ? null : { x: center.x + radius, y: center.y, label: undefined });
  return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label="Cercle géométrique"><circle cx={center.x} cy={center.y} r={radius} fill="#CCFBF1" stroke="#0F766E" strokeWidth="3"/><circle cx={center.x} cy={center.y} r="4" fill="#F59E0B"/>{(center.label || d.center_label) && <text x={center.x + 7} y={center.y - 7} fontSize="12" fontWeight="700">{center.label || s(d.center_label)}</text>}{radiusEnd && <><line x1={center.x} y1={center.y} x2={radiusEnd.x} y2={radiusEnd.y} stroke="#3448A5" strokeWidth="3"/>{d.radius_label && <text x={(center.x + radiusEnd.x) / 2} y={(center.y + radiusEnd.y) / 2 - 7} fontSize="12">{s(d.radius_label)}</text>}</>}{diameterEnd && <><line x1={center.x - radius} y1={center.y} x2={diameterEnd.x} y2={diameterEnd.y} stroke="#F59E0B" strokeWidth="3"/>{d.diameter_label && <text x={center.x} y={center.y + 22} textAnchor="middle" fontSize="12">{s(d.diameter_label)}</text>}</>}</svg>;
}
function Polygon({ d, kind }: { d: Data; kind: string }) {
  const ps = pointList(d);
  if (ps.length < 3) return fallback(`Forme : ${s(d.shape ?? d.name, kind)} — coordonnées absentes.`, 'Polygone non traçable');
  const value = ps.map(p => `${p.x},${p.y}`).join(' ');
  const pointByLabel = (label: unknown) => ps.find((p) => p.label === String(label));
  const dimensions = Array.isArray(d.side_labels ?? d.dimensions) ? ((d.side_labels ?? d.dimensions) as unknown[]) : [];
  const annotations = Array.isArray(d.annotations) ? d.annotations : [];
  return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label={`${s(d.shape, kind)} géométrique`}>
    <polygon points={value} fill="#CCFBF1" stroke="#0F766E" strokeWidth="3"/>
    {ps.map((p, i) => <g key={`vertex-${i}`}><circle cx={p.x} cy={p.y} r="4" fill="#F59E0B"/><text x={p.x + 7} y={p.y - 7} fontSize="12" fontWeight="700">{labelFor(p, i)}</text></g>)}
    {dimensions.map((raw, i) => { const item = data(raw); const from = pointByLabel(item.from ?? item.start); const to = pointByLabel(item.to ?? item.end); const label = s(item.label ?? item.value ?? raw); if (!label) return null; const x = from && to ? (from.x + to.x) / 2 : 18; const y = from && to ? (from.y + to.y) / 2 - 6 : 18 + i * 14; return <text key={`dimension-${i}`} x={x} y={y} fontSize="11" fontWeight="700" fill="#3448A5" textAnchor="middle">{label}</text>; })}
    {annotations.map((raw, i) => { const item = data(raw); const label = typeof raw === 'string' ? raw : s(item.text ?? item.label); if (!label) return null; return <text key={`annotation-${i}`} x={n(item.x, 15)} y={n(item.y, 190 - i * 14)} fontSize="11" fill="#667085">{label}</text>; })}
  </svg>;
}
function GridSymmetry({ d }: { d: Data }) {
  const grid = data(d.grid); const axisData = data(d.axis);
  const W = Number(grid.width), H = Number(grid.height);
  const pts = (v: unknown) => Array.isArray(v) ? v.filter((p): p is { x: number; y: number } => !!p && typeof (p as any).x === 'number' && typeof (p as any).y === 'number') : [];
  const fig = pts(d.figure ?? d.original), ref = pts(d.symmetric_figure ?? d.reflected);
  const ax = typeof axisData.x === 'number' ? axisData.x : null, ay = typeof axisData.y === 'number' ? axisData.y : null;
  if (!(W > 0 && H > 0) || fig.length < 2 || ref.length < 2 || (ax === null && ay === null)) return null;
  const cell = Math.min(260 / W, 160 / H), ox = (300 - W * cell) / 2, oy = (200 - H * cell) / 2;
  const X = (x: number) => ox + x * cell, Y = (y: number) => oy + (H - y) * cell;
  const poly = (list: { x: number; y: number }[]) => list.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
  return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label="Figure de symétrie" data-testid="symmetry-grid">
    {Array.from({ length: W + 1 }, (_, i) => <line key={`v${i}`} x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(H)} stroke="#E2E8F0"/>)}
    {Array.from({ length: H + 1 }, (_, i) => <line key={`h${i}`} x1={X(0)} y1={Y(i)} x2={X(W)} y2={Y(i)} stroke="#E2E8F0"/>)}
    {ax !== null ? <line x1={X(ax)} y1={Y(0)} x2={X(ax)} y2={Y(H)} stroke="#F59E0B" strokeWidth="3" strokeDasharray="7 5"/> : <line x1={X(0)} y1={Y(ay!)} x2={X(W)} y2={Y(ay!)} stroke="#F59E0B" strokeWidth="3" strokeDasharray="7 5"/>}
    <polygon points={poly(fig)} fill="#CCFBF1" stroke="#3448A5" strokeWidth="3"/>
    <polygon points={poly(ref)} fill="#DBEAFE" stroke="#0F766E" strokeWidth="3"/>
  </svg>;
}
function Symmetry({ d }: { d: Data }) { const gridSvg = GridSymmetry({ d }); if (gridSvg) return gridSvg; const rawOriginal = d.original ?? d.figure; const rawReflected = d.reflected ?? d.symmetric ?? d.symmetric_figure; const original = points(rawOriginal); const reflected = points(rawReflected); const rawAxis = point(d.axis); const coordinateArrays = (value: unknown): number[][] => Array.isArray(value) ? value.filter((v): v is number[] => Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number') : []; const originalGrid = coordinateArrays(rawOriginal); const reflectedGrid = coordinateArrays(rawReflected); const allX = [...originalGrid, ...reflectedGrid].map((v) => v[0]); const maxX = Math.max(...allX, 0); const minX = Math.min(...allX, 0); const scale = (x: number) => 35 + ((x - minX) / Math.max(1, maxX - minX)) * 230; const gridOriginal = original.length >= 2 ? original : originalGrid.map(([x, y]) => ({ x: scale(x), y: 180 - y * 35 })); const gridReflected = reflected.length >= 2 ? reflected : reflectedGrid.map(([x, y]) => ({ x: scale(x), y: 180 - y * 35 })); const axis = rawAxis || (typeof d.axis === 'string' && d.axis.toLowerCase().includes('vertical') ? { x: scale((Math.min(...allX, 0) + Math.max(...allX, 0)) / 2), y: 0 } : null); if (gridOriginal.length < 2 || gridReflected.length < 2 || !axis) return fallback('La grille, la figure et l’axe de symétrie ne sont pas tous disponibles.', 'Symétrie incomplète'); const grid = data(d.grid); const gridSize = n(grid.size ?? grid.width, Math.max(4, Math.ceil(maxX - minX))); return <svg viewBox="0 0 300 200" className="mx-auto w-full max-w-sm" role="img" aria-label="Figure de symétrie">{(grid === d.grid || d.grid === true) && <>{Array.from({length: Math.min(12, gridSize + 1)}, (_, i) => <line key={`grid-v-${i}`} x1={20 + i * (260 / gridSize)} y1="20" x2={20 + i * (260 / gridSize)} y2="180" stroke="#E2E8F0"/>)}{Array.from({length: 9}, (_, i) => <line key={`grid-h-${i}`} x1="20" y1={20 + i * 20} x2="280" y2={20 + i * 20} stroke="#E2E8F0"/>)}</>}<line x1={axis.x} y1="15" x2={axis.x} y2="185" stroke="#F59E0B" strokeWidth="3" strokeDasharray="7 5"/><polygon points={gridOriginal.map(p => `${p.x},${p.y}`).join(' ')} fill="#CCFBF1" stroke="#3448A5" strokeWidth="3"/><polygon points={gridReflected.map(p => `${p.x},${p.y}`).join(' ')} fill="#DBEAFE" stroke="#0F766E" strokeWidth="3"/></svg>; }
function Geometry({ kind, d }: { kind: string; d: Data }) { if (kind === 'diagram') return <Diagram d={d}/>; if (kind === 'angle') return <Angle d={d}/>; if (kind === 'circle') return <Circle d={d}/>; if (['triangle','rectangle','polygon'].includes(kind)) return <Polygon d={d} kind={kind}/>; if (kind === 'symmetry') return <Symmetry d={d}/>; return <svg viewBox="0 0 300 180" className="mx-auto w-full max-w-sm" role="img" aria-label={kind === 'solid_section' ? 'Solide avec plan de coupe' : kind === 'coordinate_plane' ? 'Repère cartésien' : 'Figure géométrique'}>{kind==='coordinate_plane'?<><line x1="25" y1="90" x2="275" y2="90" stroke="#0f766e" strokeWidth="2"/><line x1="150" y1="165" x2="150" y2="15" stroke="#0f766e" strokeWidth="2"/></>:<path d="M70 55 150 20 230 55 150 90Z M70 55V140L150 175V90 M230 55V140L150 175" fill="#ccfbf1" stroke="#0f766e" strokeWidth="3"/>}</svg>; }
/** French unit plural: 60 minute → 60 minutes; units already ending in s/x stay unchanged. */
export function pluralizeUnit(unit: string, count: number): string {
  return count > 1 && !/[sx]$/i.test(unit.trim()) ? `${unit}s` : unit;
}
function UnitConversion({ d }: { d: Data }) {
  const rows: { from: string; to: string; factor: number }[] = [];
  const push = (from: unknown, to: unknown, factor: unknown) => {
    const f = s(from), t = s(to), nFactor = Number(factor);
    if (f.trim() && t.trim() && Number.isFinite(nFactor) && nFactor > 0) rows.push({ from: f, to: t, factor: nFactor });
  };
  push(d.from, d.to, d.factor);
  for (const item of arr(d.conversions ?? d.equivalences ?? d.pairs)) push(item.from ?? item.source ?? item.unit, item.to ?? item.target, item.factor ?? item.value ?? item.multiplier);
  if (rows.length === 0) {
    const units = Array.isArray(d.units) ? d.units.filter((u): u is string => typeof u === 'string' && u.trim().length > 0) : [];
    const relations = Array.isArray(d.relations) ? d.relations : [];
    for (let i = 0; i < units.length - 1; i++) {
      const relation = relations[i];
      push(units[i], units[i + 1], typeof relation === 'number' ? relation : data(relation).factor ?? data(relation).value ?? data(relation).multiplier);
    }
  }
  if (rows.length === 0) return fallback('Facteurs de conversion absents des données.', 'Conversion non affichable');
  return <div className="space-y-2" role="list" aria-label="Facteurs de conversion">
    {rows.map((row, i) => <div key={`${row.from}-${row.to}-${i}`} role="listitem" className="flex flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-[#D8E1F0] bg-white px-3 py-2 text-center shadow-sm">
      <span className="text-base font-extrabold text-[#111827]">1 {row.from}</span>
      <span className="text-lg font-bold text-[#4F6FD8]" aria-hidden>=</span>
      <span className="text-base font-extrabold text-[#0F766E]">{row.factor} {pluralizeUnit(row.to, row.factor)}</span>
    </div>)}
  </div>;
}
function Generic({ d }: { d: Data }) {
  const xs = arr(d.items ?? d.nodes ?? d.groups ?? d.labels);
  if (xs.length === 0 && typeof d.text === 'string') return <p className="rounded-lg bg-white p-3 text-center text-lg font-semibold text-[#111827]">{d.text}</p>;
  return <div className="space-y-2">{xs.map((x, i) => {
    const label = s(x.label ?? x.name ?? x.value ?? x.title ?? x.text);
    const detail = x.count !== undefined ? ` × ${String(x.count)}` : x.quantity !== undefined ? ` × ${String(x.quantity)}` : '';
    return <div key={i} className="flex items-center justify-center gap-2 rounded-xl border border-[#D8E1F0] bg-white p-3 text-lg font-semibold text-[#111827]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F6FD8] text-sm font-bold text-white">{i + 1}</span>{label || `Groupe ${i + 1}`}{detail}</div>;
  })}</div>;
}
export function PedagogicalVisual({ block }: { block: Block }) { const d=data(block.visual.data), supported=isVisualKind(block.visual.kind), k=supported?block.visual.kind:'diagram'; let visual:ReactNode; try { if(!supported) visual=fallback(`Type de visuel non pris en charge : ${s(block.visual.kind, 'inconnu')}.`, 'Représentation de secours'); else if(k==='clock')visual=<Clock d={d}/>; else if(k==='timeline')visual=<Timeline d={d}/>; else if(k==='number_line')visual=<NumberLine d={d}/>; else if(k==='fraction_bar')visual=<Fraction d={d}/>; else if(k==='fraction_circle')visual=<Fraction d={d} circle/>; else if(k==='unit_conversion')visual=<UnitConversion d={d}/>; else if(['triangle','rectangle','circle','polygon','angle','symmetry','diagram','coordinate_plane','geometric_solid','solid_section'].includes(k))visual=<Geometry kind={k} d={d}/>; else visual=<Generic d={d}/>; } catch(error) { console.warn('[LessonV2] visual fallback',{k,error}); visual=fallback(s(d.alt_text,block.content), 'Représentation de secours'); } return <div data-testid="visual-card" className="rounded-xl border border-[#D8E1F0] bg-[#F4F7FF] p-4" role="group" aria-label={block.visual.alt_text||block.title}><p className="text-xs font-bold uppercase tracking-wide text-[#3448A5]">{k.replace('_',' ')}</p>{block.showText !== false && <p className="mt-2 text-sm text-[#111827]">{block.content}</p>}{block.visual.purpose&&<p className="mt-1 text-xs text-[#667085]">{block.visual.purpose}</p>}<div className="mt-4 rounded-lg bg-white p-3">{visual}</div></div>; }
