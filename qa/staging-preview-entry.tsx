import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { GeneratedLessonPreview } from '@/components/admin/learning/GeneratedLessonsPage';
import { cm2FractionLessonV21Fixture } from '@/features/explanation-v2/fixtures/cm2FractionLessonV21.fixture';
import '@/index.css';

const fixture = structuredClone(cm2FractionLessonV21Fixture) as {
  version: '2.1';
  levels: Array<{ lesson: { prerequisites: unknown[] } }>;
};
fixture.levels.forEach((level) => { level.lesson.prerequisites = []; });

function App() {
  return <AuthProvider><main className="mx-auto max-w-4xl space-y-4 p-4" data-testid="teacher-preview-fixture">
    <h1 className="text-xl font-bold">Aperçu enseignant — fixture locale CM2</h1>
    <p>Fixture de test uniquement. Objectifs pédagogiques non liés à des identifiants curriculum réels.</p>
    <GeneratedLessonPreview lesson={fixture} topicId="fixture-cm2-fractions" />
  </main></AuthProvider>;
}

const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
