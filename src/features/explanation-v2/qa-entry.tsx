/** Isolated browser QA harness: no authentication, Supabase, or persistent writes. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InteractiveActivityHost } from './InteractiveActivityHost';
import { initialActivityProgress, type ActivityProgress, type InteractiveActivitySpec } from './activityContract';
import '../../index.css';

const specs: InteractiveActivitySpec[] = [
  { schemaVersion: 1, id: 'qa-fraction-select', kind: 'fraction-select', schoolLevel: 'CM2',
    title: 'Construire 3/4', prompt: 'Sélectionne trois quarts.', target: { n: 3, d: 4 } },
  { schemaVersion: 1, id: 'qa-fraction', kind: 'fraction-bar', schoolLevel: 'CM2', title: 'Additionner les fractions',
    prompt: 'Convertis 1/2 en quarts puis additionne 3/4 et 1/2.',
    left: { n: 3, d: 4 }, right: { n: 1, d: 2 }, targetDenominator: 4 },
  { schemaVersion: 1, id: 'qa-coordinate', kind: 'coordinate-plane', schoolLevel: '4e', title: 'Placer A(2 ; 3)',
    prompt: 'Place le point A(2 ; 3) sur le repère.', target: { x: 2, y: 3 } },
  { schemaVersion: 1, id: 'qa-algebra', kind: 'algebra-tiles', schoolLevel: '5e', title: 'Construire 2x + 3',
    prompt: 'Construis l’expression avec les tuiles.', target: { x: 2, units: 3 } },
  { schemaVersion: 1, id: 'qa-linear', kind: 'linear-function', schoolLevel: '3e', title: 'Construire une fonction affine',
    prompt: 'Déplace la droite pour obtenir f(x) = 2x + 1. Le coefficient directeur est a = 2 et l’ordonnée à l’origine est b = 1.', target: { m: 2, b: 1 } },
  { schemaVersion: 1, id: 'qa-equation', kind: 'equation-decomposition', schoolLevel: '5e',
    title: 'Résoudre 3x + 5 = 20', prompt: 'Résous cette équation, étape par étape.', a: 3, b: 5, c: 20 },
  { schemaVersion: 1, id: 'qa-equation-both', kind: 'equation-decomposition', schoolLevel: '4e',
    title: 'Résoudre 5x − 4 = 2x + 8', prompt: 'Regroupe les x du même côté.', a: 5, b: -4, c: 8, d: 2 },
  { schemaVersion: 1, id: 'qa-equation-rational', kind: 'equation-decomposition', schoolLevel: '3e',
    title: 'Résoudre −2x + 3 = 8', prompt: 'Trouve la solution fractionnaire.', a: -2, b: 3, c: 8 },
  { schemaVersion: 1, id: 'qa-fit', kind: 'line-fit', schoolLevel: '2nde', title: 'Ajuster une droite aux données',
    prompt: 'Trouve la droite qui suit le mieux les observations.', points: [{ x: -2, y: -2 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }] },
];
function App() {
  const [active, setActive] = useState(1);
  const [states, setStates] = useState<Record<string, ActivityProgress>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [completionCounts, setCompletionCounts] = useState<Record<string, number>>({});
  const spec = specs[active];
  return <main className="mx-auto max-w-xl space-y-4 p-3 sm:p-6">
    <h1 className="text-xl font-bold">Explanation V2 — isolated QA</h1>
    <div className="flex flex-wrap gap-2">
      <button className="rounded border p-3" type="button" data-testid="tab-fraction-select" onClick={() => setActive(0)}>Sélectionner 3/4</button>
      <button className="rounded border p-3" type="button" data-testid="tab-fraction" onClick={() => setActive(1)}>Fractions</button>
      <button className="rounded border p-3" type="button" data-testid="tab-coordinate" onClick={() => setActive(2)}>Coordonnées</button>
      <button className="rounded border p-3" type="button" data-testid="tab-algebra" onClick={() => setActive(3)}>Tuiles algébriques</button>
      <button className="rounded border p-3" type="button" data-testid="tab-linear" onClick={() => setActive(4)}>Fonctions</button>
      <button className="rounded border p-3" type="button" data-testid="tab-equation" onClick={() => setActive(5)}>Équation simple</button>
      <button className="rounded border p-3" type="button" data-testid="tab-equation-both" onClick={() => setActive(6)}>Équation deux côtés</button>
      <button className="rounded border p-3" type="button" data-testid="tab-equation-rational" onClick={() => setActive(7)}>Équation fractionnaire</button>
      <button className="rounded border p-3" type="button" data-testid="tab-fit" onClick={() => setActive(8)}>Ajuster une droite</button>
      <button className="rounded border p-3" type="button" data-testid="reset" onClick={() => {
        setStates(prev => ({ ...prev, [spec.id]: initialActivityProgress() }));
        setResults(prev => ({ ...prev, [spec.id]: '' }));
        setCompletionCounts(prev => ({ ...prev, [spec.id]: 0 }));
      }}>Recommencer</button>
    </div>
    <InteractiveActivityHost spec={spec} progress={states[spec.id]}
      onProgressChange={next => setStates(prev => ({ ...prev, [spec.id]: next }))}
      onComplete={result => { setResults(prev => ({ ...prev, [spec.id]: result.independent ? 'Indépendant' : 'Avec aide' })); setCompletionCounts(prev => ({ ...prev, [spec.id]: (prev[spec.id] ?? 0) + 1 })); }} />
    {results[spec.id] && <p data-testid="completion">{results[spec.id]}</p>}
    <output data-testid="activity-progress" className="hidden">{JSON.stringify(states[spec.id] ?? initialActivityProgress())}</output>
    <output data-testid="completion-count" className="hidden">{completionCounts[spec.id] ?? 0}</output>
  </main>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
