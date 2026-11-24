/** Real LessonV2Player browser QA. No real learner session or Supabase writes. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { LessonV2Schema } from '@/types/lesson-generator';
import '../../index.css';

const lesson = LessonV2Schema.parse({
  version: '2.0',
  lesson_goal: 'Comprendre les fractions et les coordonnées',
  success_criteria: ['Additionner des fractions', 'Placer un point'],
  prerequisites: [{
    id: 'qa-prerequisite', description: 'Confirme que tu es prêt.', check_question: 'Écris oui pour commencer.',
    answer_type: 'short_text', expected_answer: 'oui', remediation_hint: 'Écris simplement oui.',
  }],
  sequence: [
    { id: 'qa-fraction-block', type: 'interactive_activity', activity: {
      schemaVersion: 1, id: 'qa-fraction-player', kind: 'fraction-bar', schoolLevel: 'CM2', title: 'Additionner les fractions',
      prompt: 'Transforme 1/2 en quarts puis additionne.', left: { n: 3, d: 4 },
      right: { n: 1, d: 2 }, targetDenominator: 4,
    }},
    { id: 'qa-coordinate-block', type: 'interactive_activity', activity: {
      schemaVersion: 1, id: 'qa-coordinate-player', kind: 'coordinate-plane', schoolLevel: '4e', title: 'Placer A(2 ; 3)',
      prompt: 'Place le point A(2 ; 3).', target: { x: 2, y: 3 },
    }},
  ],
  misconceptions: [],
  mastery: { skills: ['fractions', 'coordonnées'], threshold: 0.8 },
});
function App() {
  return <AuthProvider><div className="mx-auto h-[95vh] max-w-2xl border p-3">
    <LessonV2Player lesson={lesson} topicId="qa-topic" topicName="QA — Fractions et coordonnées" />
  </div></AuthProvider>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
