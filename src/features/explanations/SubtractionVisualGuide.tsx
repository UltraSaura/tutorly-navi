import { buildSubtractionVisual } from './subtractionVisualModel';
import type { InteractiveTutorSession } from './interactiveTutorSession';

const labels = [
  { key: 'hundreds', label: 'Centaines' },
  { key: 'tens', label: 'Dizaines' },
  { key: 'units', label: 'Unités' },
] as const;

export function SubtractionVisualGuide({ session }: { session: Pick<InteractiveTutorSession, 'step' | 'completedSteps'> }) {
  const visual = buildSubtractionVisual(session);
  const activeIndex = visual.activeColumn === 'hundreds' ? 0 : visual.activeColumn === 'tens' ? 1 : visual.activeColumn === 'units' ? 2 : -1;
  return <section aria-label={`Repères de calcul pour ${visual.operation}`} data-testid="subtraction-visual-guide" className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h4 className="font-semibold">{visual.operation}</h4>
      <span className="text-xs text-slate-600 dark:text-slate-300">{visual.activeColumn === 'result' ? 'Résultat' : `Colonne des ${visual.activeColumn === 'hundreds' ? 'centaines' : visual.activeColumn === 'tens' ? 'dizaines' : 'unités'}`}</span>
    </div>
    <div className="grid grid-cols-[minmax(5.5rem,1fr)_repeat(3,minmax(2.7rem,0.8fr))] items-center gap-1 text-center text-sm sm:gap-2">
      <span aria-hidden="true" />
      {labels.map((column, index) => <span key={column.key} className={`rounded-t-md px-1 py-1 text-[11px] font-medium ${index === activeIndex ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' : 'text-slate-500'}`}>{column.label}</span>)}
      <span className="text-left text-xs text-slate-600 dark:text-slate-300">En haut</span>
      {visual.upper.map((digit, index) => <span key={`u-${index}`} className={`rounded px-1 py-1.5 text-lg font-bold tabular-nums ${index === activeIndex ? 'bg-amber-100 ring-1 ring-amber-400 dark:bg-amber-900/40' : 'bg-white dark:bg-slate-800'}`}>{digit}</span>)}
      <span className="text-left text-xs text-slate-600 dark:text-slate-300">En bas</span>
      {visual.lower.map((digit, index) => <span key={`l-${index}`} className={`rounded px-1 py-1.5 text-lg font-bold tabular-nums ${index === activeIndex ? 'bg-amber-100 ring-1 ring-amber-400 dark:bg-amber-900/40' : 'bg-white dark:bg-slate-800'}`}>{digit}</span>)}
      <span className="text-left text-xs text-slate-600 dark:text-slate-300">Différence</span>
      {visual.result.map((digit, index) => <span key={`r-${index}`} className={`border-t border-slate-400 px-1 py-1 text-base font-semibold tabular-nums ${digit ? 'text-teal-700 dark:text-teal-300' : 'text-transparent'}`} aria-label={digit ? `${labels[index].label}: ${digit}` : undefined}>{digit || '·'}</span>)}
    </div>
    {visual.compensation && <p className="mt-2 rounded-md bg-teal-50 px-2.5 py-2 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-100">{visual.compensation}</p>}
  </section>;
}
