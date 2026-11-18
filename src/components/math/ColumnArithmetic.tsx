import React from 'react';
import { cn } from '@/lib/utils';

export interface ArithmeticRow {
  id: string;
  cells: React.ReactNode[];
  operator?: string;
  annotation?: boolean;
  lineBefore?: boolean;
  tone?: 'result' | 'working';
  activeColumns?: number[];
  usedColumns?: number[];
}

/** One place controls column geometry for every written arithmetic operation. */
export function ColumnArithmetic({ columns, rows, explanation }: {
  columns: number;
  rows: ArithmeticRow[];
  explanation: string;
}) {
  return (
    <div className="font-mono" data-testid="column-arithmetic">
      <div className="overflow-x-auto p-1">
        <div className="ml-auto w-max" style={{ minWidth: `${(columns + 1) * 2}rem` }}>
          {rows.map(row => (
            <div key={row.id} data-arithmetic-row={row.id} className={cn(row.lineBefore && 'mt-2 border-t-2 border-foreground/60 pt-2')}>
              <div className="grid items-center" style={{ gridTemplateColumns: `repeat(${columns + 1}, 2rem)` }}>
                <div className="flex h-9 items-center justify-center text-lg font-bold" aria-hidden="true">{row.operator}</div>
                {Array.from({ length: columns }, (_, column) => (
                  <div key={column} data-arithmetic-cell={column} className={cn(
                    'relative flex h-9 w-8 items-center justify-center rounded-md text-lg font-bold leading-normal md:text-xl',
                    row.annotation && 'text-sm font-semibold text-muted-foreground md:text-sm',
                    row.tone === 'result' && 'text-green-700 dark:text-green-300',
                    row.tone === 'working' && 'text-blue-700 dark:text-blue-300',
                    row.activeColumns?.includes(column) && 'bg-sky-100 ring-2 ring-inset ring-sky-400 dark:bg-sky-950',
                    row.usedColumns?.includes(column) && 'line-through text-muted-foreground',
                  )}>{row.cells[column] ?? ''}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 px-2 font-sans text-sm leading-relaxed text-muted-foreground" aria-live="polite">{explanation}</p>
    </div>
  );
}
