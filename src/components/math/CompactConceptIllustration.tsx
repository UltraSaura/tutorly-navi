import { useState } from 'react';
import { MathExplanationReader } from './MathExplanationReader';

function Objects({ count, removed = 0 }: { count: number; removed?: number }) {
  return <div className="flex flex-wrap justify-center gap-1.5" aria-label={`${count} objets, ${removed} retirés`}>
    {Array.from({ length: count }, (_, index) => <span key={index} className={`h-5 w-5 rounded-full border-2 ${index < removed ? 'border-slate-300 bg-slate-200 line-through opacity-60' : 'border-teal-500 bg-teal-100 dark:bg-teal-900/40'}`} aria-hidden="true" />)}
  </div>;
}

export function CompactConceptIllustration() {
  const [autoRead, setAutoRead] = useState(false);
  const narration = 'Huit moins cinq, c’est partir de huit et enlever cinq : il reste trois. Cinq moins huit, c’est partir de cinq et vouloir enlever huit : il manque trois unités. Ce ne sont pas les mêmes situations.';
  return <div data-testid="compact-concept-illustration" className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900 dark:bg-teal-950/20">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md bg-white p-2 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">8 − 5</p><MathExplanationReader text={narration} language="fr-FR" autoRead={autoRead} onAutoReadChange={setAutoRead} /></div>
        <Objects count={8} removed={5} />
        <p className="mt-2 text-center text-xs text-slate-700 dark:text-slate-200">Il reste 3 objets.</p>
      </div>
      <div className="rounded-md bg-white p-2 dark:bg-slate-950">
        <p className="text-sm font-semibold">5 − 8</p>
        <Objects count={5} />
        <p className="mt-2 text-center text-xs text-slate-700 dark:text-slate-200">On veut enlever 8, mais on n’a que 5 objets : il manque 3 unités.</p>
      </div>
    </div>
    <p className="mt-3 text-center text-xs font-medium text-teal-900 dark:text-teal-100">Le nombre de départ change, donc la situation change.</p>
  </div>;
}
