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
    ? (d.relationships ?? d.relations as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
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
    ? (d.relations ?? d.relationships as unknown[]).map((item) => typeof item === 'string' ? item : s(data(item).label ?? data(item).value))
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
function NumberLine({ d }: { d: Data }) { const min=n(d.min,0),max=n(d.max,10),v=n(d.value,min),x=(q:number)=>25+((q-min)/Math.max(1,max-min))*280; return <svg viewBox="0 0 330 110" className="w-full" role="img" aria-label="Droite graduée"><line x1="25" y1="50" x2="305" y2="50" stroke="#0f766e" strokeWidth="4"/>{Array.from({length:Math.min(21,Math.round(max-min)+1)},(_,i)=>{const q=min+i;return <g key={i}><line x1={x(q)} y1="42" x2={x(q)} y2="58" stroke="#0f766e"/><text x={x(q)} y="78" textAnchor="middle" fontSize="11">{q}</text></g>})}<circle cx={x(v)} cy="50" r="8" fill="#f59e0b"/></svg>; }
function Fraction({ d, circle=false }: { d: Data; circle?: boolean }) { const den=Math.max(1,Math.min(16,Math.round(n(d.denominator,4)))),num=Math.max(0,Math.min(den,Math.round(n(d.numerator,1)))); if(circle)return <svg viewBox="0 0 220 180" className="mx-auto w-full max-w-sm" role="img" aria-label="Disque fractionné"><circle cx="110" cy="80" r="60" fill="#d1fae5" stroke="#0f766e" strokeWidth="3"/>{Array.from({length:num},(_,i)=>{const a=i*2*Math.PI/den-Math.PI/2,b=(i+1)*2*Math.PI/den-Math.PI/2;const p=(q:number)=>`${110+60*Math.cos(q)},${80+60*Math.sin(q)}`;return <path key={i} d={`M110 80 L${p(a)} A60 60 0 0 1 ${p(b)} Z`} fill="#14b8a6"/>})}<text x="110" y="165" textAnchor="middle">{num} / {den}</text></svg>; return <svg viewBox="0 0 360 100" className="w-full" role="img" aria-label="Barre de fraction"><g transform="translate(15 25)">{Array.from({length:den},(_,i)=><rect key={i} x={i*330/den} width={330/den-2} height="38" fill={i<num?'#14b8a6':'#d1fae5'} stroke="#0f766e"/>)}</g><text x="180" y="88" textAnchor="middle">{num} / {den}</text></svg>; }
function Geometry({ kind }: { kind: string }) { return <svg viewBox="0 0 300 180" className="mx-auto w-full max-w-sm" role="img" aria-label={kind === 'solid_section' ? 'Solide avec plan de coupe' : kind === 'coordinate_plane' ? 'Repère cartésien' : 'Figure géométrique'}>{kind==='coordinate_plane'?<><line x1="25" y1="90" x2="275" y2="90" stroke="#0f766e" strokeWidth="2"/><line x1="150" y1="165" x2="150" y2="15" stroke="#0f766e" strokeWidth="2"/>{[50,100,200,250].map(x=><line key={x} x1={x} y1="86" x2={x} y2="94" stroke="#99f6e4"/>)}{[40,140].map(y=><line key={y} x1="146" y1={y} x2="154" y2={y} stroke="#99f6e4"/>)}<circle cx="200" cy="50" r="6" fill="#f59e0b"/><text x="208" y="45" fontSize="12">A(2,4)</text></>:kind==='solid_section'||kind==='geometric_solid'?<><path d="M70 55 150 20 230 55 150 90Z M70 55V140L150 175V90 M230 55V140L150 175" fill="#ccfbf1" stroke="#0f766e" strokeWidth="3"/>{kind==='solid_section'&&<path d="M62 100 150 68 238 100 150 132Z" fill="#fbbf24" fillOpacity=".6" stroke="#b45309" strokeWidth="3"/>}</>:kind==='triangle'?<polygon points="150,20 55,145 245,145" fill="#ccfbf1" stroke="#0f766e" strokeWidth="4"/>:kind==='circle'?<circle cx="150" cy="90" r="60" fill="#ccfbf1" stroke="#0f766e" strokeWidth="4"/>:<><polygon points="60,140 105,30 145,80 130,145" fill="#ccfbf1" stroke="#0f766e" strokeWidth="4"/><line x1="150" y1="15" x2="150" y2="165" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 5"/><polygon points="240,140 195,30 155,80 170,145" fill="#99f6e4" stroke="#0f766e" strokeWidth="4"/></>}</svg>; }
function Generic({ d }: { d: Data }) {
  const xs = arr(d.items ?? d.nodes ?? d.groups ?? d.labels);
  if (xs.length === 0 && typeof d.text === 'string') return <p className="rounded-lg bg-white p-3 text-center text-lg font-semibold text-[#111827]">{d.text}</p>;
  return <div className="space-y-2">{xs.map((x, i) => {
    const label = s(x.label ?? x.name ?? x.value ?? x.title ?? x.text);
    const detail = x.count !== undefined ? ` × ${String(x.count)}` : x.quantity !== undefined ? ` × ${String(x.quantity)}` : '';
    return <div key={i} className="flex items-center justify-center gap-2 rounded-xl border border-[#D8E1F0] bg-white p-3 text-lg font-semibold text-[#111827]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F6FD8] text-sm font-bold text-white">{i + 1}</span>{label || `Groupe ${i + 1}`}{detail}</div>;
  })}</div>;
}
export function PedagogicalVisual({ block }: { block: Block }) { const d=data(block.visual.data), k=isVisualKind(block.visual.kind)?block.visual.kind:'diagram'; let visual:ReactNode; try { if(k==='clock')visual=<Clock d={d}/>; else if(k==='timeline')visual=<Timeline d={d}/>; else if(k==='number_line')visual=<NumberLine d={d}/>; else if(k==='fraction_bar')visual=<Fraction d={d}/>; else if(k==='fraction_circle')visual=<Fraction d={d} circle/>; else if(['triangle','rectangle','circle','polygon','angle','symmetry','coordinate_plane','geometric_solid','solid_section'].includes(k))visual=<Geometry kind={k}/>; else visual=<Generic d={d}/>; } catch(error) { console.warn('[LessonV2] visual fallback',{k,error}); visual=<p role="status">{s(d.alt_text,block.content)}</p>; } return <div className="rounded-xl border border-[#D8E1F0] bg-[#F4F7FF] p-4" role="group" aria-label={block.visual.alt_text||block.title}><p className="text-xs font-bold uppercase tracking-wide text-[#3448A5]">{k.replace('_',' ')}</p>{block.showText !== false && <p className="mt-2 text-sm text-[#111827]">{block.content}</p>}{block.visual.purpose&&<p className="mt-1 text-xs text-[#667085]">{block.visual.purpose}</p>}<div className="mt-4 rounded-lg bg-white p-3">{visual}</div></div>; }
