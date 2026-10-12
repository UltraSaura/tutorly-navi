import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import type { GraduatedNumberLineConfiguration, GraduatedNumberLineItem, GraduatedNumberLineResult } from './numberLineTypes';
import { equivalentNumberLineValues, formatNumberLineValue, normalizedNumberLinePosition, numberLineTickValues, numberLineValidPositions, parseNumberLineValue, snapNumberLinePosition, sortNumberLineValues, validateNumberLinePlacement } from './numberLineUtils';

type LinePoint = { label: string; value?: unknown; position?: number; itemId?: string };
type LineHandle = { label: string; position: number };

function Line({ config, points = [], interactive = false, onTickSelect, handle, onHandlePosition, dropPosition, dropActive, containerRef, onPointPointerDown }: { config: GraduatedNumberLineConfiguration; points?: LinePoint[]; interactive?: boolean; onTickSelect?: (position: number) => void; handle?: LineHandle | null; onHandlePosition?: (position: number) => void; dropPosition?: number | null; dropActive?: boolean; containerRef?: React.RefObject<HTMLDivElement>; onPointPointerDown?: (itemId: string, event: React.PointerEvent<HTMLButtonElement>) => void }) {
  const lineRef = useRef<HTMLDivElement>(null);
  const ticks = numberLineTickValues(config.line.start, config.line.end, config.line.subdivisions);
  function positionFromPointer(clientX: number) {
    const bounds = lineRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    onHandlePosition?.(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)));
  }
  return <div ref={containerRef} role={interactive ? 'group' : 'img'} aria-label={interactive ? 'Choose a position on the graduated number line' : 'Graduated number line'} className={"relative mx-2 h-32 rounded-xl transition-colors sm:mx-8 " + (dropActive ? 'bg-primary/10 ring-2 ring-primary/40' : '')}>
    <div ref={lineRef} className="absolute left-0 right-0 top-9 h-1 rounded bg-slate-700" />
    {ticks.map((tick, index) => {
      const position = index / (ticks.length - 1) * 100;
      const label = formatNumberLineValue(tick);
      return <div key={String(tick) + '-' + index} className="absolute top-5 -translate-x-1/2" style={{ left: String(position) + '%' }}>
        <div className="h-9 w-1 rounded bg-slate-700" />
        {interactive ? <button type="button" className="absolute -inset-x-5 -top-3 h-14 w-11 rounded-full transition-colors hover:bg-primary/10 active:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onTickSelect?.(index / (ticks.length - 1))} aria-label={'Place at ' + label}><span className="sr-only">{'Place at ' + label}</span></button> : null}
        {(index === 0 || index === ticks.length - 1 || config.line.visibleLabels?.includes(tick)) && <span className="absolute left-1/2 top-10 -translate-x-1/2 text-xs">{label}</span>}
      </div>;
    })}
    {points.map((point) => {
      const position = point.position ?? normalizedNumberLinePosition(point.value, config.line.start, config.line.end) ?? 0;
      return <div key={point.label} className="absolute top-1 -translate-x-1/2" style={{ left: String(Math.max(0, Math.min(1, position)) * 100) + '%' }} aria-label={point.label + ': ' + (point.value ?? formatNumberLineValue(config.line.start + position * (config.line.end - config.line.start)))}>{point.itemId ? <button type="button" className="touch-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onPointerDown={(event) => onPointPointerDown?.(point.itemId!, event)}><span className="flex min-h-7 max-w-20 items-center justify-center whitespace-nowrap rounded-md bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{point.label}</span></button> : <span className="flex min-h-7 max-w-20 items-center justify-center whitespace-nowrap rounded-md bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{point.label}</span>}<div className="mx-auto h-3 w-1 rounded-full bg-primary" /></div>;
    })}
    {dropActive && typeof dropPosition === 'number' ? <div aria-hidden="true" className="pointer-events-none absolute top-4 z-20 h-12 w-1 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_6px_rgba(18,198,160,0.2)]" style={{ left: String(dropPosition * 100) + '%' }} /> : null}
    {interactive && handle ? <button type="button" className="absolute top-1 z-10 flex min-h-8 min-w-9 -translate-x-1/2 touch-none flex-col items-center justify-start rounded-md bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" style={{ left: String(Math.max(0, Math.min(1, handle.position)) * 100) + '%' }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); positionFromPointer(event.clientX); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) positionFromPointer(event.clientX); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); positionFromPointer(event.clientX); }} aria-label={'Move ' + handle.label}><span>{handle.label}</span><span className="h-3 w-1 rounded-full bg-primary" /></button> : null}
  </div>;
}

const display = (item: GraduatedNumberLineItem) => item.displayValue ?? String(item.value);

export function GraduatedNumberLineActivity({ config, onResult }: { config: GraduatedNumberLineConfiguration; onResult?: (result: GraduatedNumberLineResult) => void }) {
  const ui = useInterfaceTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [placements, setPlacements] = useState<Record<string, number>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [order, setOrder] = useState(config.items);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, boolean> | null>(null);
  const [placementFeedback, setPlacementFeedback] = useState<Record<string, string>>({});
  const [showOrderedValues, setShowOrderedValues] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [pendingDrag, setPendingDrag] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const lineContainerRef = useRef<HTMLDivElement>(null);
  const [complete, setComplete] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const ticks = useMemo(() => numberLineTickValues(config.line.start, config.line.end, config.line.subdivisions), [config]);
  const validPositions = useMemo(() => numberLineValidPositions(config.line.start, config.line.end, config.line.subdivisions, config.validPositions), [config]);
  const expectedOrder = useMemo(() => sortNumberLineValues(config.items, (item) => item.value), [config]);
  const selectedPosition = selectedItemId ? placements[selectedItemId] : undefined;
  const handlePosition = typeof selectedPosition === 'number' ? selectedPosition : validPositions[0] ?? 0;
  const placeValuePoints = config.items.flatMap((item) => item.id !== selectedItemId && typeof placements[item.id] === 'number' ? [{ label: display(item), position: placements[item.id], itemId: item.id }] : []);

  useEffect(() => {
    if (!draggingItemId) return undefined;
    const update = (event: PointerEvent) => {
      if (!draggingItemId && pendingDrag) {
        const distance = Math.hypot(event.clientX - pendingDrag.x, event.clientY - pendingDrag.y);
        if (distance < 8) return;
        setDraggingItemId(pendingDrag.itemId); setPendingDrag(null); setDragPointer({ x: event.clientX, y: event.clientY }); setDragPosition(validPositions[0] ?? 0); event.preventDefault();
      }
      if (!draggingItemId && !pendingDrag) return;
      setDragPointer({ x: event.clientX, y: event.clientY });
      const bounds = lineContainerRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0) return;
      const raw = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      setDragPosition(snapNumberLinePosition(raw, validPositions));
    };
    const finish = (event: PointerEvent) => {
      if (!draggingItemId) {
        setPendingDrag(null); setDragPointer(null); setDragPosition(null);
        return;
      }
      update(event);
      const bounds = lineContainerRef.current?.getBoundingClientRect();
      const overLine = bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top - 32 && event.clientY <= bounds.bottom + 32;
      const raw = bounds && bounds.width > 0 ? Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) : null;
      const finalPosition = raw === null ? null : snapNumberLinePosition(raw, validPositions);
      if (overLine && finalPosition !== null) setPlacements((current) => ({ ...current, [draggingItemId]: finalPosition }));
      setDraggingItemId(null); setDragPointer(null); setDragPosition(null); setValidationResults(null); setPlacementFeedback({});
    };
    window.addEventListener('pointermove', update, { passive: false });
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    return () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); };
  }, [draggingItemId, pendingDrag, dragPosition, validPositions]);

  function beginChipDrag(itemId: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    setPendingDrag({ itemId, x: event.clientX, y: event.clientY }); setSelectedItemId(itemId);
  }

  function placeSelected(position: number) {
    if (!selectedItemId) return;
    const nextPosition = config.snapMode === 'free' ? Math.max(0, Math.min(1, position)) : snapNumberLinePosition(position, validPositions);
    setPlacements((current) => ({ ...current, [selectedItemId]: nextPosition }));
    setValidationResults(null);
    setPlacementFeedback({});
    setShowOrderedValues(false);
    setFeedback(null);
  }

  function resetActivity() {
    setAnswers({}); setPlacements({}); setSelectedItemId(null); setOrder(config.items); setFeedback(null); setValidationResults(null); setPlacementFeedback({}); setShowOrderedValues(false); setDraggingItemId(null); setPendingDrag(null); setDragPointer(null); setDragPosition(null); setComplete(false); setAttempts(0);
  }

  function submit() {
    const nextAttempts = attempts + 1; setAttempts(nextAttempts);
    const results = config.items.map((item) => {
      const correct = config.mode === 'read_point_value'
        ? equivalentNumberLineValues(answers[item.id], item.value) || Boolean(item.acceptedAnswers?.some((answer) => equivalentNumberLineValues(answers[item.id], answer)))
        : config.mode === 'place_value'
          ? typeof placements[item.id] === 'number' && validateNumberLinePlacement(item.value, placements[item.id], config.line.start, config.line.end, item.tolerance ?? 0.08)
          : order.every((entry, index) => equivalentNumberLineValues(entry.value, expectedOrder[index]?.value));
      return { id: item.id, correct };
    });
    const correct = results.every((result) => result.correct);
    const result: GraduatedNumberLineResult = { activityId: config.id, mode: config.mode, status: correct ? 'correct' : results.some((item) => item.correct) ? 'partial' : 'incorrect', attempts: nextAttempts, items: results, errors: correct ? [] : ['graduation_or_order'], skillTags: config.skillTags, timestamp: new Date().toISOString() };
    setValidationResults(Object.fromEntries(results.map((item) => [item.id, item.correct])));
    if (config.mode === 'order_values') setShowOrderedValues(true);
    if (config.mode === 'place_value') setPlacementFeedback(Object.fromEntries(results.map((item) => [item.id, placementHint(config.items.find((candidate) => candidate.id === item.id)!, config, item.correct)])));
    onResult?.(result); setFeedback(correct ? ui('Correct!') : ui('Look at the value of one graduation and try again.')); if (correct) setComplete(true);
  }

  function placementHint(item: GraduatedNumberLineItem, activity: GraduatedNumberLineConfiguration, correct: boolean) {
    if (correct) return ui('Correct placement');
    const value = parseNumberLineValue(item.value);
    if (value === 0.5) return ui('Halfway hint');
    if (value === 0.75) return ui('Three quarters hint');
    if (value !== null && value > activity.line.end) return ui('Greater than one hint');
    const step = formatNumberLineValue((activity.line.end - activity.line.start) / activity.line.subdivisions);
    return ui('Graduation value hint') + ' ' + step + '.';
  }

  function move(index: number, direction: -1 | 1) {
    setOrder((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  if (complete) return <div className="rounded-xl border bg-emerald-50 p-5 text-center" role="status"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" /><p className="font-semibold">{ui('Activity complete!')}</p><Button className="mt-3" variant="outline" onClick={resetActivity}><RotateCcw className="h-4 w-4" />{ui('Try again')}</Button></div>;

  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">{config.instruction}</p>
    {config.mode === 'place_value' ? <p className="text-sm font-medium text-primary">{ui('Drag each label onto the correct graduation.')}</p> : null}
    <Line config={config} points={config.mode === 'place_value' ? placeValuePoints : config.mode === 'order_values' ? (showOrderedValues ? expectedOrder.map((item) => ({ label: display(item), value: item.value })) : []) : config.items.map((item) => ({ label: item.label, value: item.value }))} interactive={config.mode === 'place_value'} onTickSelect={placeSelected} handle={config.mode === 'place_value' && selectedItemId && !draggingItemId ? { label: display(config.items.find((item) => item.id === selectedItemId) ?? config.items[0]), position: handlePosition } : null} onHandlePosition={placeSelected} dropPosition={dragPosition} dropActive={Boolean(draggingItemId)} containerRef={lineContainerRef} onPointPointerDown={beginChipDrag} />
    {config.mode === 'read_point_value' && <div className="grid gap-3 sm:grid-cols-2">{config.items.map((item) => <label key={item.id} className="flex items-center gap-2 font-semibold">{item.label} = <Input value={answers[item.id] ?? ''} onChange={(event) => { const value = (event.target as HTMLInputElement).value; setAnswers((current) => ({ ...current, [item.id]: value })); }} aria-label={item.label + ' value'} placeholder={ui('Write the value')} /></label>)}</div>}
    {config.mode === 'place_value' && <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label={ui('Values to place')}>{config.items.map((item) => <Button key={item.id} type="button" className="touch-none cursor-grab active:cursor-grabbing" variant={selectedItemId === item.id ? 'default' : 'outline'} aria-pressed={selectedItemId === item.id} aria-label={display(item) + (typeof placements[item.id] === 'number' ? ' ✓' : '')} onPointerDown={(event) => beginChipDrag(item.id, event)} onClick={() => setSelectedItemId(item.id)}>{display(item)}{typeof placements[item.id] === 'number' ? ' ✓' : ''}</Button>)}</div>
      <p className="text-xs text-muted-foreground">{ui('You can also tap a label, then a graduation.')}</p>
      <p className="text-xs text-muted-foreground">{selectedItemId ? ui('Selected label') + ': ' + display(config.items.find((item) => item.id === selectedItemId) ?? config.items[0]) : ui('Choose a label to begin.')}</p>
      <details className="rounded-lg border bg-muted/30 px-3 py-2"><summary className="cursor-pointer text-sm font-semibold">{ui('Need help? Choose from a list')}</summary><div className="mt-3 space-y-3">{config.items.map((item) => <label key={item.id} className="flex flex-col gap-1 text-sm font-semibold">{display(item)}<select className="h-11 rounded-md border bg-background px-3 text-base" value={placements[item.id] ?? ''} onChange={(event) => { const value = (event.target as HTMLSelectElement).value; setPlacements((current) => ({ ...current, [item.id]: value === '' ? undefined : Number(value) })); setSelectedItemId(item.id); setValidationResults(null); setPlacementFeedback({}); }} aria-label={'Fallback position for ' + display(item)}><option value="">{ui('Choose a graduation')}</option>{ticks.map((tick) => <option key={tick} value={normalizedNumberLinePosition(tick, config.line.start, config.line.end) ?? 0}>{formatNumberLineValue(tick)}</option>)}</select>{validationResults && <span className={validationResults[item.id] ? 'text-emerald-600' : 'text-destructive'}>{validationResults[item.id] ? '✓ ' + ui('Correct') : ui('To correct')}</span>}{placementFeedback[item.id] && <span className="text-xs font-normal text-muted-foreground">{placementFeedback[item.id]}</span>}</label>)}</div></details>
    </div>}
    {config.mode === 'order_values' && <div className="space-y-2" aria-label={ui('Order values from smallest to largest')}>{order.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2"><span className="flex-1 font-semibold">{display(item)}</span><Button size="icon" variant="outline" aria-label={ui('Move up')} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp /></Button><Button size="icon" variant="outline" aria-label={ui('Move down')} onClick={() => move(index, 1)} disabled={index === order.length - 1}><ArrowDown /></Button></div>)}</div>}
    {feedback && <p className="text-sm font-medium" role="status">{feedback}</p>}
    <Button type="button" className="w-full" onClick={submit}>{ui('Check answer')}</Button>
    {config.mode === 'place_value' && selectedItemId ? <div className="flex flex-wrap justify-center gap-2"><Button type="button" variant="ghost" onClick={() => { setPlacements((current) => { const next = { ...current }; delete next[selectedItemId]; return next; }); }}><RotateCcw className="h-4 w-4" />{ui('Clear label')}</Button><Button type="button" variant="ghost" onClick={() => { setPlacements({}); setValidationResults(null); setPlacementFeedback({}); }}><RotateCcw className="h-4 w-4" />{ui('Reset placements')}</Button><Button type="button" variant="ghost" onClick={() => { const index = validPositions.indexOf(placements[selectedItemId] ?? 0); placeSelected(validPositions[Math.max(0, index - 1)] ?? 0); }} aria-label="Move selected value left"><ArrowLeft /></Button><Button type="button" variant="ghost" onClick={() => { const index = validPositions.indexOf(placements[selectedItemId] ?? 0); placeSelected(validPositions[Math.min(validPositions.length - 1, index + 1)] ?? 0); }} aria-label="Move selected value right"><ArrowRight /></Button></div> : null}
    {draggingItemId && dragPointer ? <div className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-xl" style={{ left: dragPointer.x, top: dragPointer.y }}>{display(config.items.find((item) => item.id === draggingItemId) ?? config.items[0])}</div> : null}
  </div>;
}
export default GraduatedNumberLineActivity;
