/** Real LessonV2Player browser QA. No real learner session or Supabase writes. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { cm2FractionLesson } from './cm2FractionLesson';
import '../../index.css';

const equationLesson = {
  ...cm2FractionLesson,
  lesson_goal: 'Résoudre une équation simple',
  sequence: [
    { id: 'simple-equation', type: 'interactive_activity', activity: { schemaVersion: 1, id: 'player-equation-3x5', kind: 'equation-decomposition', schoolLevel: '5e', title: 'Résoudre 3x + 5 = 20', prompt: 'Trouve la valeur de x.', a: 3, b: 5, c: 20, transfer: { a: 2, b: 4, c: 18 } } },
    { id: 'after-equation', type: 'concept', title: 'Étape suivante débloquée', content: 'La validation de l’équation permet de continuer.' },
  ],
} as typeof cm2FractionLesson;

function App() {
  const [fixture, setFixture] = useState<'cm2' | 'equation'>('cm2');
  const lesson = fixture === 'cm2' ? cm2FractionLesson : equationLesson;
  return <AuthProvider><div className="mx-auto h-[95vh] max-w-2xl border p-3">
    <div className="mb-3 flex gap-2"><button type="button" onClick={() => setFixture('cm2')}>Fixture CM2</button><button type="button" onClick={() => setFixture('equation')}>Fixture équation</button></div>
    <LessonV2Player key={fixture} lesson={lesson} topicId="qa-topic" topicName="QA — leçon interactive" />
  </div></AuthProvider>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
