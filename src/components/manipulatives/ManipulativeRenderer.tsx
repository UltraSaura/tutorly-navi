import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { ManipulativeConfig, ManipulativeInteraction, ManipulativeSurface } from '@/lib/manipulatives/types';

interface Props {
  config: ManipulativeConfig;
  surface?: ManipulativeSurface;
  readOnly?: boolean;
  onInteraction?: (interaction: ManipulativeInteraction) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function NumberLine({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'number_line' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const min = Math.min(config.min, config.max);
  const max = Math.max(config.min, config.max);
  const step = Math.max(0.0001, config.step ?? 1);
  const [value, setValue] = useState(clamp(config.value ?? min, min, max));
  return <div className="space-y-3"><div className="flex justify-between text-xs"><span>{min}</span><strong>{value}</strong><span>{max}</span></div><Slider min={min} max={max} step={step} value={[value]} disabled={readOnly} aria-label="Number line" onValueChange={([next]) => { const safe = clamp(next, min, max); setValue(safe); onInteraction?.({ kind: 'number_line', value: safe }); }} /></div>;
}

function Counters({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'counters' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const max = config.max ?? 20; const [count, setCount] = useState(clamp(config.count ?? 0, 0, max));
  return <div className="space-y-4"><div className="flex min-h-16 flex-wrap gap-2" aria-label={`${count} counters`}>{Array.from({ length: count }, (_, i) => <span key={i} aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-primary bg-primary/15" />)}</div><div className="flex gap-2"><Button type="button" variant="outline" aria-label="Remove counter" disabled={readOnly || count === 0} onClick={() => { const next=Math.max(0,count-1); setCount(next); onInteraction?.({kind:'counters',value:next}); }}>−</Button><Button type="button" variant="outline" aria-label="Add counter" disabled={readOnly || count === max} onClick={() => { const next=Math.min(max,count+1); setCount(next); onInteraction?.({kind:'counters',value:next}); }}>+</Button><span className="self-center font-semibold">{count}</span></div></div>;
}

function ArrayBoard({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'array' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const maxRows=config.maxRows??10,maxColumns=config.maxColumns??10; const [rows,setRows]=useState(clamp(config.rows??2,1,maxRows)); const [columns,setColumns]=useState(clamp(config.columns??2,1,maxColumns));
  const update=(r:number,c:number)=>onInteraction?.({kind:'array',values:[r,c],value:r*c,metadata:{rows:r,columns:c}});
  return <div className="space-y-3"><div className="grid gap-1" style={{gridTemplateColumns:`repeat(${columns}, minmax(0, 1fr))`}} aria-label={`${rows} by ${columns} array`}>{Array.from({length:rows*columns},(_,i)=><span key={i} className="aspect-square max-h-8 rounded bg-primary/20" />)}</div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={readOnly||rows<=1} onClick={()=>{const n=rows-1;setRows(n);update(n,columns);}}>− row</Button><Button variant="outline" disabled={readOnly||rows>=maxRows} onClick={()=>{const n=rows+1;setRows(n);update(n,columns);}}>+ row</Button><Button variant="outline" disabled={readOnly||columns<=1} onClick={()=>{const n=columns-1;setColumns(n);update(rows,n);}}>− col</Button><Button variant="outline" disabled={readOnly||columns>=maxColumns} onClick={()=>{const n=columns+1;setColumns(n);update(rows,n);}}>+ col</Button><strong className="self-center">{rows} × {columns} = {rows*columns}</strong></div></div>;
}

function FractionBar({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'fraction_bar' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const max=config.maxDenominator??12; const [den,setDen]=useState(clamp(config.denominator??4,2,max)); const [num,setNum]=useState(clamp(config.numerator??1,0,den));
  const emit=(n:number,d:number)=>onInteraction?.({kind:'fraction_bar',values:[n,d],value:n/d,metadata:{numerator:n,denominator:d}});
  return <div className="space-y-3"><div className="flex h-14 overflow-hidden rounded-lg border" aria-label={`${num} of ${den} parts`}>{Array.from({length:den},(_,i)=><button type="button" disabled={readOnly} aria-label={`Part ${i+1}`} key={i} className={`min-w-8 flex-1 border-r last:border-r-0 ${i<num?'bg-primary/40':'bg-background'}`} onClick={()=>{const n=Math.min(i+1,den);setNum(n);emit(n,den);}} />)}</div><div className="flex gap-2"><Button type="button" variant="outline" aria-label="Decrease denominator" disabled={readOnly||den<=2} onClick={()=>{const d=den-1,n=Math.min(num,d);setDen(d);setNum(n);emit(n,d);}}>− part</Button><Button type="button" variant="outline" aria-label="Increase denominator" disabled={readOnly||den>=max} onClick={()=>{const d=den+1;setDen(d);emit(num,d);}}>+ part</Button><strong className="self-center">{num}/{den}</strong></div></div>;
}

function PlaceValue({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'place_value' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const max=config.maxValue??9999; const [value,setValue]=useState(clamp(config.value??0,0,max)); const places=useMemo(()=>[{label:'Thousands',v:1000},{label:'Hundreds',v:100},{label:'Tens',v:10},{label:'Ones',v:1}],[]);
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{places.map(p=>{const digit=Math.floor(value/p.v)%10;return <div key={p.v} className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">{p.label}</p><p className="text-2xl font-bold">{digit}</p><div className="flex justify-center gap-1"><Button type="button" size="sm" variant="outline" aria-label={`Decrease ${p.label}`} disabled={readOnly||value<p.v} onClick={()=>{const n=Math.max(0,value-p.v);setValue(n);onInteraction?.({kind:'place_value',value:n});}}>−</Button><Button type="button" size="sm" variant="outline" aria-label={`Increase ${p.label}`} disabled={readOnly||value+p.v>max} onClick={()=>{const n=Math.min(max,value+p.v);setValue(n);onInteraction?.({kind:'place_value',value:n});}}>+</Button></div></div>})}<p className="col-span-full text-center font-semibold">{value}</p></div>;
}

function BalanceScale({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'balance_scale' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const [left,setLeft]=useState(Math.max(0, config.left??0)),[right,setRight]=useState(Math.max(0, config.right??0)); const emit=(l:number,r:number)=>onInteraction?.({kind:'balance_scale',values:[l,r],correct:l===r,metadata:{left:l,right:r}});
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="rounded-lg border p-5 text-center text-2xl font-bold" aria-label={`Left value ${left}`}>{left}</div><div className="rounded-lg border p-5 text-center text-2xl font-bold" aria-label={`Right value ${right}`}>{right}</div></div><div className="text-center font-semibold" aria-live="polite">{left===right?'=':left>right?'Left is heavier':'Right is heavier'}</div><div className="flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" aria-label="Decrease left" disabled={readOnly||left===0} onClick={()=>{const n=Math.max(0,left-1);setLeft(n);emit(n,right);}}>− left</Button><Button type="button" variant="outline" aria-label="Increase left" disabled={readOnly} onClick={()=>{const n=left+1;setLeft(n);emit(n,right);}}>+ left</Button><Button type="button" variant="outline" aria-label="Decrease right" disabled={readOnly||right===0} onClick={()=>{const n=Math.max(0,right-1);setRight(n);emit(left,n);}}>− right</Button><Button type="button" variant="outline" aria-label="Increase right" disabled={readOnly} onClick={()=>{const n=right+1;setRight(n);emit(left,n);}}>+ right</Button></div></div>;
}

function GeometryCanvas({ config, onInteraction, readOnly }: { config: Extract<ManipulativeConfig, { kind: 'geometry_canvas' }>; onInteraction?: Props['onInteraction']; readOnly?: boolean }) {
  const initialWidth=config.width??4; const [width,setWidth]=useState(initialWidth),[height,setHeight]=useState(config.shape==='square'?initialWidth:(config.height??3)); const shape=config.shape??'rectangle';
  const emit=(w:number,h:number)=>onInteraction?.({kind:'geometry_canvas',values:[w,h],metadata:{shape,width:w,height:h}});
  const svgWidth=Math.min(160,width*20), svgHeight=Math.min(110,height*20);
  return <div className="space-y-3"><svg viewBox="0 0 240 160" className="h-48 w-full rounded-lg border bg-muted/10" role="img" aria-label={`${shape} geometry canvas`}>{shape==='triangle'?<polygon points={`120,25 ${120-svgWidth/2},135 ${120+svgWidth/2},135`} fill="none" stroke="currentColor" strokeWidth="3"/>:<rect x={(240-svgWidth)/2} y={(160-svgHeight)/2} width={svgWidth} height={shape==='square'?svgWidth:svgHeight} fill="none" stroke="currentColor" strokeWidth="3"/>}</svg><div className="grid grid-cols-2 gap-3"><label className="text-sm">Width <Slider aria-label="Geometry width" min={1} max={8} value={[width]} disabled={readOnly} onValueChange={([v])=>{const nextHeight=shape==='square'?v:height;setWidth(v);if(shape==='square')setHeight(v);emit(v,nextHeight);}} /></label><label className="text-sm">Height <Slider aria-label="Geometry height" min={1} max={6} value={[height]} disabled={readOnly||shape==='square'} onValueChange={([v])=>{setHeight(v);emit(width,v);}} /></label></div></div>;
}

export function ManipulativeRenderer({ config, onInteraction, readOnly = false }: Props) {
  switch (config.kind) {
    case 'number_line': return <NumberLine config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'counters': return <Counters config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'array': return <ArrayBoard config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'fraction_bar': return <FractionBar config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'place_value': return <PlaceValue config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'balance_scale': return <BalanceScale config={config} onInteraction={onInteraction} readOnly={readOnly} />;
    case 'geometry_canvas': return <GeometryCanvas config={config} onInteraction={onInteraction} readOnly={readOnly} />;
  }
}

export default ManipulativeRenderer;
