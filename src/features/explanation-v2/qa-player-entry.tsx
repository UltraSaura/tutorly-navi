/** Real LessonV2Player browser QA. No real learner session or Supabase writes. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { cm2FractionLesson } from './cm2FractionLesson';
import '../../index.css';

const lesson = cm2FractionLesson;

function App() {
  return <AuthProvider><div className="mx-auto h-[95vh] max-w-2xl border p-3">
    <LessonV2Player lesson={lesson} topicId="qa-topic" topicName="QA — CM2 : comprendre les fractions" />
  </div></AuthProvider>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
