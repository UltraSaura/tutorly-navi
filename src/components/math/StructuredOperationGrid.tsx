import { cn } from '@/lib/utils';
import type { PlaceValueFrame, PlaceValueColumn } from '@/utils/mathStepper/placeValueGrid';

interface Props { frame: PlaceValueFrame; columns: PlaceValueColumn[]; className?: string; }

export function StructuredOperationGrid({ frame, columns, className }: Props) {
  const sourceExponents = new Set(frame.events.flatMap((event) => event.sourceExponent === undefined ? [] : [event.sourceExponent]));
  const destinationExponents = new Set(frame.events.flatMap((event) => event.destinationExponent === undefined ? [] : [event.destinationExponent]));
  return <div className={cn('overflow-x-auto rounded-lg border bg-white p-4 dark:bg-slate-900', className)} aria-label={frame.label}>
    <div className="min-w-max" style={{ display: 'grid', gridTemplateColumns: `8rem repeat(${columns.length}, minmax(2.25rem, 1fr))` }}>
      <div />{columns.map((column) => <div key={column.exponent} className={cn('border-b px-1 pb-1 text-center text-[10px] text-slate-500', column.isDecimalMarkerBefore && 'border-l-2 border-l-indigo-300')} title={column.label}>{column.exponent < 0 ? `10${column.exponent}` : column.label}</div>)}
      {frame.rows.map((row) => { const operator = row.cells.find((item) => item.kind === 'operator')?.text; return <div key={row.id} className="contents"><div className={cn('pr-3 text-right text-xs text-slate-500', frame.layout === 'long-division' && row.id === 'dividend' && 'border-r-2 border-indigo-400 font-semibold text-slate-800 dark:text-slate-100')}>{operator ?? row.label ?? (row.id === 'result' ? 'résultat' : '')}</div>{columns.map((column) => { const item = row.cells.find((cell) => cell.exponent === column.exponent); const isSource = item !== undefined && sourceExponents.has(column.exponent); const isDestination = item !== undefined && destinationExponents.has(column.exponent); return <div key={`${row.id}-${column.exponent}`} className={cn('relative min-h-10 border-b border-slate-100 px-1 py-2 text-center font-mono text-lg transition-colors dark:border-slate-800 motion-reduce:transition-none', column.isDecimalMarkerBefore && 'border-l-2 border-l-indigo-300', frame.layout === 'long-division' && row.id === 'dividend' && 'border-t-2 border-indigo-400', item?.kind === 'line' && 'text-slate-400', item?.emphasis === 'active' && 'rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100', item?.emphasis === 'source' && 'bg-amber-100', item?.emphasis === 'destination' && 'bg-emerald-100', isSource && 'ring-2 ring-amber-400 motion-safe:animate-pulse', isDestination && 'ring-2 ring-emerald-400 motion-safe:animate-pulse')}>{item?.text}</div>; })}</div>; })}
    </div>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{frame.explanation}</p>
    {frame.events.length > 0 && <ul className="mt-2 space-y-1 text-xs text-indigo-700 dark:text-indigo-300">{frame.events.map((event, index) => <li key={`${event.kind}-${index}`}>{event.description}</li>)}</ul>}
  </div>;
}
