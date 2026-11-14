import type { LessonV2 } from '../src/types/lesson-generator';

/** Synthetic transport data only. Never imported by the application or deployed. */
export const lesson: LessonV2 = {
  version: '2.0',
  lesson_goal: 'Synthetic QA fixture: observe a rectangle.',
  success_criteria: ['Open the existing lesson player.'],
  prerequisites: [{ id: 'qa-prerequisite', description: 'Synthetic readiness check.', check_question: 'Écris oui.', answer_type: 'short_text', expected_answer: 'oui', remediation_hint: 'Écris oui.' }],
  sequence: [{ id: 'qa-diagram', type: 'visual', title: 'Rectangle — synthetic fixture', content: 'A rectangle used only for browser verification.', visual: {
    kind: 'rectangle', alt_text: 'Synthetic rectangle ABCD', purpose: 'Verify the existing diagram renderer.',
    data: { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB = 6 cm' }, { from: 'B', to: 'C', label: 'BC = 4 cm' }, { from: 'C', to: 'D', label: 'CD = 6 cm' }, { from: 'D', to: 'A', label: 'DA = 4 cm' }] },
  } }],
  misconceptions: [], mastery: { skills: ['qa-only'], threshold: 0.8 },
};
export const subject = { id: 'qa-subject', name: 'Mathématiques', slug: 'mathematiques', is_active: true, order_index: 1, icon_name: 'Calculator', color_scheme: 'blue', icon_image_url: null };
export const categories = [{ id: 'qa-category', name: 'Géométrie', subject_id: subject.id, slug: 'geometrie', order_index: 1, is_active: true, topics: [
  { id: 'qa-topic', name: 'Aires', slug: 'aires-qa', order_index: 1, is_active: true, lesson_content: lesson },
  { id: 'qa-draft', name: 'Solides', slug: 'unpublished-qa', order_index: 2, is_active: true, lesson_content: null },
] }];
