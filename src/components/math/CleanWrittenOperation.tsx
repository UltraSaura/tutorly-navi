import { cn } from '@/lib/utils';
import type { PlaceValueColumn, PlaceValueFrame, GridCell } from '@/utils/mathStepper/placeValueGrid';

type Assistance = 'concrete' | 'standard' | 'concise';

interface Props {
  frame: PlaceValueFrame;
  columns: PlaceValueColumn[];
  expression: string;
  assistance?: Assistance;
  result?: string;
  className?: string;
}

const visibleRowIds = new Set(['top', 'bottom', 'line', 'result', 'quotient', 'dividend']);

function cellAt(row: { cells: GridCell[] }, exponent: number) {
  return row.cells.find((cell) => cell.exponent === exponent);
}

function getDigits(expression: string) {
  const match = expression.replace(',', '.').match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*([+×÷*/-])\\s*(\\d+(?:\\.\\d+)?)$'));
  return match ? { left: match[1], operator: match[2], right: match[3] } : null;
}

function frenchNumber(value: string) {
  return value.replace('.', ',');
}

function studentExplanation(frame: PlaceValueFrame, expression: string, result?: string, assistance: Assistance = 'standard') {
  const parts = getDigits(expression);
  if (!parts) return frame.explanation;
  if (frame.id === 'setup') return assistance === 'concrete'
    ? 'Aligne les unités sous les unités, les dizaines sous les dizaines et les centaines sous les centaines.'
    : 'Aligne chaque chiffre par valeur de position.';
  if (frame.id === 'final') return result ? `Le résultat est ${frenchNumber(result)}.` : 'On obtient le résultat.';

  const exponent = frame.events.find((event) => event.destinationExponent !== undefined)?.destinationExponent ?? 0;
  const place = exponent === 0 ? 'unités' : exponent === 1 ? 'dizaines' : exponent === 2 ? 'centaines' : 'milliers';
  const left = parts.left.replace('.', '').padStart(Math.max(parts.left.replace('.', '').length, parts.right.replace('.', '').length), '0');
  const right = parts.right.replace('.', '').padStart(left.length, '0');
  const offset = exponent;
  const leftDigit = left[left.length - 1 - offset] ?? '0';
  const rightDigit = right[right.length - 1 - offset] ?? '0';
  const event = frame.events.find((item) => item.kind === 'borrow' || item.kind === 'carry');

  if (parts.operator === '-' && exponent === 0 && event?.kind === 'borrow') {
    return `On commence par les unités. On ne peut pas enlever ${rightDigit} unités à ${leftDigit} unités. On échange une dizaine contre 10 unités. On a maintenant ${Number(leftDigit) + 10} unités. ${Number(leftDigit) + 10} moins ${rightDigit}, cela fait ${Number(leftDigit) + 10 - Number(rightDigit)}. On écrit ${Number(leftDigit) + 10 - Number(rightDigit)} dans la colonne des unités.`;
  }
  if (parts.operator === '-' && event?.kind === 'borrow') {
    return `On passe aux ${place}. Après l'échange, on peut soustraire ${rightDigit} à ${leftDigit}. On écrit le résultat dans la colonne des ${place}.`;
  }
  if (parts.operator === '-') return `${leftDigit} moins ${rightDigit}, cela fait ${Number(leftDigit) - Number(rightDigit)}. On écrit le résultat dans la colonne des ${place}.`;
  if (parts.operator === '+') return event?.kind === 'carry'
    ? `On additionne les ${place}. La somme fait 10 ou plus : on écrit le chiffre des unités et on porte 1 à la colonne suivante.`
    : `On additionne les ${place}, puis on écrit le chiffre obtenu dans cette colonne.`;
  if (parts.operator === '×' || parts.operator === '*') return frame.id.startsWith('partial-')
    ? 'On écrit ce produit partiel en le décalant selon la valeur du chiffre multiplicateur.'
    : 'On additionne les produits partiels pour obtenir le résultat.';
  return frame.explanation.replace(/\b(?:avant|après|unités avant|unités après|résultat)\b/gi, '').trim();
}

function AnnotationOverlay({ frame, exponent }: { frame: PlaceValueFrame; exponent: number }) {
  const annotations = frame.rows
    .filter((row) => row.id.includes('regroup') || row.id.startsWith('carry'))
    .map((row) => cellAt(row, exponent))
    .filter((cell): cell is GridCell => Boolean(cell));
  if (!annotations.length) return null;

  return <span className="absolute inset-x-0 -top-5 flex items-center justify-center gap-1 text-xs leading-none" aria-label="Annotation de regroupement">
    {annotations.map((annotation, index) => <span key={`${annotation.rowId}-${index}`} className={cn(annotation.annotationType === 'crossed-out' && 'text-rose-700 line-through', annotation.annotationType === 'replacement' && 'text-emerald-700 font-semibold', annotation.annotationType === 'carry' && 'text-indigo-700 font-semibold')}>
      {annotation.text}{annotation.annotationType === 'crossed-out' && annotations.some((item) => item.annotationType === 'replacement') ? ' →' : ''}
    </span>)}
  </span>;
}

function studentCellText(row: { id: string; cells: GridCell[] }, cell: GridCell | undefined, frame: PlaceValueFrame) {
  if (!cell?.text) return '';
  const trimsLeadingZeroes = ['top', 'bottom', 'result'].includes(row.id) || row.id.startsWith('partial-');
  if (!trimsLeadingZeroes || cell.text !== '0') return cell.text;

  const hasSignificantDigit = row.cells.some((item) =>
    (item.kind === 'digit' || item.kind === 'result') && item.text !== '0' && item.text !== ''
  );
  if (!hasSignificantDigit) return cell.text;

  const isBeforeSignificantDigit = row.cells
    .filter((item) => item.exponent >= cell.exponent)
    .filter((item) => item.kind === 'digit' || item.kind === 'result')
    .every((item) => item.text === '0' || item.text === '');
  return isBeforeSignificantDigit && frame.id !== 'final' ? '' : cell.text;
}

export function CleanWrittenOperation({ frame, columns, expression, assistance = 'standard', result, className }: Props) {
  const baseRows = frame.rows.filter((row) => visibleRowIds.has(row.id) || row.id.startsWith('partial-') || row.id.startsWith('subtraction-') || row.id.startsWith('remainder-'));
  const showAnnotations = assistance !== 'concise';
  return <section className={cn('overflow-x-auto rounded-xl border bg-white p-4 dark:bg-slate-900', className)} aria-label="Opération posée">
    <div className="mx-auto min-w-[17rem] max-w-xl" style={{ display: 'grid', gridTemplateColumns: `2rem repeat(${columns.length}, minmax(2.75rem, 1fr))` }}>
      <div aria-hidden="true" />
      {columns.map((column) => <div key={column.exponent} className={cn('h-2 border-b border-slate-200', column.isDecimalMarkerBefore && 'border-l-2 border-l-indigo-300')} aria-label={column.label} />)}
      {baseRows.map((row) => <div key={row.id} className="contents">
        <div className={cn('flex items-center justify-end pr-2 font-mono text-lg', row.id === 'bottom' && 'font-semibold', row.id === 'dividend' && 'border-r-2 border-indigo-400')}>{row.id === 'bottom' ? row.cells.find((cell) => cell.kind === 'operator')?.text : frame.layout === 'long-division' && row.id === 'dividend' ? row.label : ''}</div>
        {columns.map((column) => {
          const cell = cellAt(row, column.exponent);
          return <div key={`${row.id}-${column.exponent}`} className={cn('relative flex min-h-11 items-center justify-center border-b border-slate-100 px-1 font-mono text-xl dark:border-slate-800', row.id === 'line' && 'border-b-2 border-slate-700', cell?.emphasis === 'active' && 'rounded bg-indigo-50 text-indigo-950', cell?.kind === 'line' && 'text-transparent', row.id.startsWith('partial-') && 'text-slate-700')}>{showAnnotations && row.id === 'top' && <AnnotationOverlay frame={frame} exponent={column.exponent} />}<span className={cn(cell?.annotationType === 'crossed-out' && 'line-through')}>{studentCellText(row, cell, frame)}</span></div>;
        })}
      </div>)}
    </div>
    <p aria-live="polite" className="mt-4 text-center text-sm leading-relaxed text-slate-700 dark:text-slate-200">{studentExplanation(frame, expression, result, assistance)}</p>
  </section>;
}
