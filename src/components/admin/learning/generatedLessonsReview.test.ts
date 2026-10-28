import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { deriveLessonReview, GeneratedLessonPreview, discoverLessonVisuals } from './GeneratedLessonsPage';
import { storedGeometryVisualFixture } from './geometryLesson.fixture';
import { geometryDraftLesson, validateGeometryDraft } from './geometryDraft';

const legacy = { explanation: 'old', example: 'x', common_mistakes: [], guided_practice: [], exit_ticket: [], generated_at: '2026-01-01' };
const valid = { version: '2.1', topic_goal: 'Nombres', levels: [{ id: 'l1', level_number: 1, title: 'Base', purpose: 'Lire', difficulty: 'foundation', objective_ids: [], lesson: { lesson_goal: 'Lire', success_criteria: ['Je peux lire'], prerequisites: [], sequence: [{ id: 'c', type: 'concept', title: 'C', content: 'Contenu' }, { id: 'm', type: 'mastery_check', questions: [{ id: 'q', question: 'Q', answer_type: 'numeric', correct_answer: 1, skill: 's', difficulty: 1, success_feedback: 'Oui', error_feedback: 'Non' }] }], misconceptions: [], mastery: { skills: ['s'], threshold: .8 } } }] };

describe('generated lesson review derivation', () => {
  it.each([null, undefined])('handles an empty lesson list/content (%s)', (value) => expect(deriveLessonReview(value).status).toBe('Aucun contenu'));
  it('recognizes legacy content', () => expect(deriveLessonReview(legacy).format).toBe('Legacy'));
  it('recognizes valid V2.1 content', () => expect(deriveLessonReview(valid).status).toBe('Contrat valide'));
  it('rejects invalid canonical content', () => expect(deriveLessonReview({ ...valid, levels: [] }).status).toBe('Contrat invalide'));
  it('reports missing correct answer', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'q', type: 'student_try', question: 'Q', answer_type: 'numeric', success_feedback: 'x', error_feedback: 'y' }] } }] }).checks[0].path).toContain('correct_answer'));
  it('reports malformed mastery metadata', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, mastery: { threshold: 2 } } }] }).status).toBe('Contrat invalide'));
  it('supports mastery questions inside sequence', () => expect(deriveLessonReview(valid).status).toBe('Contrat valide'));
  it('reports unsupported visuals', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'v', type: 'visual', title: 'V', content: 'x', visual: { kind: 'magic' } }] } }] }).status).toBe('Contrat invalide'));
  it('reports missing visuals through the contract', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'c', type: 'concept', title: 'C', content: 'x' }] } }] }).status).toBe('Contrat valide'));
  it('does not stringify errors as object placeholders', () => expect(JSON.stringify(deriveLessonReview({ bad: true }))).not.toContain('[object Object]'));
  it('keeps geometry visuals reviewable', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'v', type: 'visual', title: 'V', content: 'x', visual: { kind: 'triangle' } }] } }] }).status).toBe('Contrat valide'));
  it('handles ambiguous multiple choices as invalid when answer is absent', () => expect(deriveLessonReview({ ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [{ id: 'q', type: 'student_try', question: 'Q', answer_type: 'selection', choices: ['A', 'B'], success_feedback: 'x', error_feedback: 'y' }] } }] }).status).toBe('Contrat invalide'));
  it('renders canonical visual blocks through the shared visual renderer', () => {
    const lesson = { ...valid, levels: [{ ...valid.levels[0], lesson: { ...valid.levels[0].lesson, sequence: [
      { id: 'diagram', type: 'visual', title: 'Points', content: 'A et B', visual: { kind: 'diagram', data: { points: [{ x: 40, y: 120, label: 'A' }, { x: 240, y: 60, label: 'B' }], segments: [[0, 1]] } } },
      { id: 'circle', type: 'visual', title: 'Cercle', content: 'Centre O', visual: { kind: 'circle', data: { center: { x: 150, y: 100, label: 'O' }, radius: 50 } } },
      { id: 'symmetry', type: 'visual', title: 'Symétrie', content: 'Axe', visual: { kind: 'symmetry', data: { axis: { x: 150, y: 0 }, original: [{ x: 80, y: 60 }, { x: 120, y: 120 }], reflected: [{ x: 220, y: 60 }, { x: 180, y: 120 }], grid: { size: 8 } } } },
    ] } }] };
    const html = renderToStaticMarkup(createElement(GeneratedLessonPreview, { lesson }));
    expect((html.match(/data-testid="admin-lesson-visual"/g) ?? []).length).toBe(3);
    expect(html).toContain('<svg');
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
    expect(html).toContain('>O<');
    expect(html).toContain('stroke-dasharray="7 5"');
    expect(html).not.toContain('[object Object]');
  });
  it('accepts JSON-string lesson_content from the database', () => expect(deriveLessonReview(JSON.stringify(valid)).status).toBe('Contrat valide'));
  it('discovers the visual blocks copied from the stored geometry lesson', () => {
    const entries = discoverLessonVisuals(storedGeometryVisualFixture.levels[3].lesson);
    expect(entries).toHaveLength(5);
    expect(entries.map((entry) => entry.visual.kind)).toEqual(['diagram', 'angle', 'rectangle', 'circle', 'symmetry']);
    const html = renderToStaticMarkup(createElement(GeneratedLessonPreview, { lesson: { ...storedGeometryVisualFixture, levels: [storedGeometryVisualFixture.levels[3]] } }));
    expect(html).toContain('data-visual-kind="diagram"');
    expect(html).toContain('data-visual-kind="angle"');
    expect(html).toContain('data-visual-kind="circle"');
    expect(html).toContain('data-visual-kind="symmetry"');
  });
  it('keeps every stored geometry visual visible in the admin preview', () => {
    const html = storedGeometryVisualFixture.levels.map((level) => renderToStaticMarkup(createElement(GeneratedLessonPreview, { lesson: { ...storedGeometryVisualFixture, levels: [level] } }))).join('');
    expect((html.match(/data-testid="admin-lesson-visual"/g) ?? []).length).toBe(22);
    expect((html.match(/data-testid="admin-lesson-visual-rendered"/g) ?? []).length).toBe(22);
    expect(html).toContain('data-visual-kind="diagram"');
    expect(html).toContain('data-visual-kind="angle"');
    expect(html).toContain('data-visual-kind="circle"');
    expect(html).toContain('data-visual-kind="polygon"');
    expect(html).toContain('data-visual-kind="symmetry"');
    expect(html).toContain('AB = 6 cm');
    expect(html).toContain('BC = 4 cm');
    expect(html).toContain('>CA<');
    expect(html).toContain('>O<');
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(html).not.toContain('[object Object]');
  });
  it('validates the separate complete geometry draft without provider calls or writes', () => {
    const result = validateGeometryDraft();
    expect(result.canonicalValid).toBe(true);
    expect(result.pedagogicalValid).toBe(true);
    expect(geometryDraftLesson.levels[0].lesson.sequence.map((block) => block.visual.kind)).toEqual(['rectangle', 'polygon', 'circle', 'angle', 'symmetry']);
    const html = renderToStaticMarkup(createElement(GeneratedLessonPreview, { lesson: geometryDraftLesson }));
    expect((html.match(/data-testid="admin-lesson-visual-rendered"/g) ?? []).length).toBe(5);
    expect((html.match(/<svg/g) ?? []).length).toBe(5);
    expect(html).toContain('AB = 6 cm');
    expect(html).toContain('BC = 4 cm');
    expect(html).toContain('>O<');
    expect(html).not.toContain('[object Object]');
  });
});
