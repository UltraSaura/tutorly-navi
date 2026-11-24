/** Isolated browser QA harness: no authentication, Supabase, or persistent writes. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InteractiveActivityHost } from './InteractiveActivityHost';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import '../../index.css';

const specs: InteractiveActivitySpec[] = [
  { schemaVersion: 1, id: 'qa-fraction', kind: 'fraction-bar', title: 'Additionner les fractions',
    prompt: 'Convertis 1/2 en quarts puis additionne 3/4 et 1/2.',
    left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 },
  { schemaVersion: 1, id: 'qa-coordinate', kind: 'coordinate-plane', title: 'Placer A(2 ; 3)',
    prompt: 'Place le point A(2 ; 3) sur le repère.', target: { x: 2, y: 3 } },
];
function App() {
  const [active, setActive] = useState(0);
  const [states, setStates] = useState<Record<string, ActivityProgress>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const spec = specs[active];
  return <main className="mx-auto max-w-xl space-y-4 p-3 sm:p-6">
    <h1 className="text-xl font-bold">Explanation V2 — isolated QA</h1>
    <div className="flex flex-wrap gap-2">
      <button className="rounded border p-3" type="button" data-testid="tab-fraction" onClick={() => setActive(0)}>Fractions</button>
      <button className="rounded border p-3" type="button" data-testid="tab-coordinate" onClick={() => setActive(1)}>Coordonnées</button>
      <button className="rounded border p-3" type="button" data-testid="reset" onClick={() => {
        setStates(prev => ({ ...prev, [spec.id]: initialActivityProgress() }));
        setResults(prev => ({ ...prev, [spec.id]: '' }));
      }}>Recommencer</button>
    </div>
    <InteractiveActivityHost spec={spec} progress={states[spec.id]}
      onProgressChange={next => setStates(prev => ({ ...prev, [spec.id]: next }))}
      onComplete={result => setResults(prev => ({ ...prev, [spec.id]: result.independent ? 'Indépendant' : 'Avec aide' }))} />
    {results[spec.id] && <p data-testid="completion">{results[spec.id]}</p>}
  </main>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
