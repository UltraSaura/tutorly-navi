/** Real LessonV2Player browser QA. No real learner session or Supabase writes. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/context/AuthContext';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { LessonV21Path } from '@/components/learning/LessonV21Path';
import { cm2FractionLesson } from './cm2FractionLesson';
import { cm2FractionLessonV21Fixture } from './fixtures/cm2FractionLessonV21.fixture';
import { v21ActivityFixtures } from './fixtures/v21ActivityFixtures';
import { InteractiveActivitySchema } from './activityContract';
import { parseLessonV21 } from '@/types/lesson-generator';
import '../../index.css';

const equationLesson = {
  ...cm2FractionLesson,
  lesson_goal: 'Résoudre une équation simple',
  sequence: [
    { id: 'simple-equation', type: 'interactive_activity', activity: { schemaVersion: 1, id: 'player-equation-3x5', kind: 'equation-decomposition', schoolLevel: '5e', title: 'Résoudre 3x + 5 = 20', prompt: 'Trouve la valeur de x.', a: 3, b: 5, c: 20, transfer: { a: 2, b: 4, c: 18 } } },
    { id: 'after-equation', type: 'concept', title: 'Étape suivante débloquée', content: 'La validation de l’équation permet de continuer.' },
  ],
} as typeof cm2FractionLesson;

const cm2V21Lesson = parseLessonV21(cm2FractionLessonV21Fixture);
if (!cm2V21Lesson) throw new Error('The four-level V2.1 CM2 QA fixture is invalid.');

const v21ActivityLessons = v21ActivityFixtures.map((rawActivity) => {
  const activity = InteractiveActivitySchema.parse(rawActivity);
  const kind = activity.kind;
  const lesson = parseLessonV21({
    version: '2.1', topic_goal: `Fixture ${kind}`,
    levels: [{
      id: `qa-v21-${kind}`, level_number: 1, title: `Fixture ${kind}`, purpose: `Vérifier le rendu ${kind}.`, difficulty: 'fixture', objective_ids: [`test-fixture:${kind}`],
      lesson: { lesson_goal: `Tester ${kind} dans le parcours V2.1.`, success_criteria: ['Le bloc interactif est rendu.'], prerequisites: [{ id: `qa-prerequisite-${kind}`, description: 'Saisis 4 pour ouvrir le test.', check_question: 'Écris le nombre 4.', answer_type: 'short_text', expected_answer: '4', remediation_hint: 'Le nombre attendu est 4.' }], misconceptions: [], sequence: [{ id: `qa-block-${kind}`, type: 'interactive_activity', activity }], mastery: { skills: [`test-fixture:${kind}`], threshold: 0.8 } },
    }],
  });
  if (!lesson) throw new Error(`The ${kind} V2.1 QA fixture is invalid.`);
  return { kind, lesson };
});

function App() {
  const [fixture, setFixture] = useState<'cm2' | 'equation' | 'cm2-v21' | string>('cm2');
  const v21Activity = v21ActivityLessons.find((item) => item.kind === fixture);
  return <AuthProvider><div className="mx-auto flex h-[95vh] max-w-2xl flex-col border p-3">
    <div className="mb-3 flex shrink-0 flex-nowrap gap-2 overflow-x-auto whitespace-nowrap">
      <button className="shrink-0" type="button" onClick={() => setFixture('cm2')}>Fixture CM2</button>
      <button className="shrink-0" type="button" onClick={() => setFixture('equation')}>Fixture équation</button>
      <button className="shrink-0" type="button" onClick={() => setFixture('cm2-v21')}>Fixture CM2 V2.1</button>
      {v21ActivityLessons.map(({ kind }) => <button className="shrink-0" type="button" key={kind} onClick={() => setFixture(kind)}>Fixture V2.1 {kind}</button>)}
    </div>
    <div className="min-h-0 flex-1">
    {fixture === 'cm2-v21' ? <LessonV21Path key={fixture} lesson={cm2V21Lesson} topicId="qa-v21-cm2" topicName="QA — parcours CM2 V2.1" />
      : v21Activity ? <LessonV21Path key={fixture} lesson={v21Activity.lesson} topicId={`qa-v21-${v21Activity.kind}`} topicName={`QA — ${v21Activity.kind}`} />
        : <LessonV2Player key={fixture} lesson={fixture === 'cm2' ? cm2FractionLesson : equationLesson} topicId="qa-topic" topicName="QA — leçon interactive" />}
    </div>
  </div></AuthProvider>;
}
const root = document.getElementById('root');
if (!root) throw new Error('QA root missing');
createRoot(root).render(<App />);
