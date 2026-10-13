import { describe, expect, it } from 'vitest';
import { parseProviderJsonSafely } from './provider-json.ts';
import { normalizeGeneratedLesson, ensureRequiredVisuals } from './lesson-normalization.ts';
import { normalizeLessonComposition } from './composition-normalization.ts';
import { validateLessonV21 } from './lesson-v21-contract.ts';
import { pedagogicalIssues } from './pedagogical-quality.ts';
import { normalizeCanonicalAnswers } from './canonical-normalization.ts';

function fixture(visualKind: string = 'missing', topicName = 'Fractions', answerField: string | null = null) {
  return { lesson_goal: `Comprendre ${topicName}.`, success_criteria: ['Je sais lire une fraction.'], prerequisites: [], misconceptions: [], sequence: [
    { id: 'fixture-concept', type: 'concept', title: topicName, content: topicName === 'Fractions' ? 'Une fraction décrit une part d’un tout.' : `Cette notion aide à comprendre ${topicName.toLocaleLowerCase()}.`, key_points: [{ label: 'Numérateur', text: 'Il compte les parts prises.' }, { label: 'Dénominateur', text: 'Il indique les parts égales.' }], takeaway: 'Il indique les parts égales et il compte les parts prises.', visual: { kind: visualKind, purpose: '', alt_text: '', data: {} } },
    { id: 'fixture-try', type: 'student_try', question: 'Quelle réponse convient ?', answer_type: 'short_text', ...(answerField ? { [answerField]: '42' } : { correct_answer: '42' }), success_feedback: 'Bravo !', error_feedback: 'Réessaie.' },
  ], mastery: { skills: ['fractions'], threshold: 0.8 } } as Record<string, unknown>;
}
function run(raw: string, topicName = 'Fractions') {
  const parsed = parseProviderJsonSafely(raw);
  if (!parsed.ok) return { parsed, providerCalls: 0 };
  const canonicalAnswers = normalizeCanonicalAnswers(parsed.value as Record<string, unknown>);
  if (canonicalAnswers.errors.length) return { parsed, providerCalls: 0, canonicalErrors: canonicalAnswers.errors };
  const normalized = normalizeGeneratedLesson(canonicalAnswers.lesson, topicName);
  const ensured = ensureRequiredVisuals(normalized.lesson, topicName);
  const composition = normalizeLessonComposition(ensured.lesson, topicName);
  const lesson = composition.lesson;
  const canonical = validateLessonV21({ version: '2.1', topic_goal: topicName, levels: [{ id: 'fixture-level', level_number: 1, title: 'Fractions', purpose: 'Lire les fractions.', difficulty: 'foundation', objective_ids: [], lesson }] });
  const allIssues = pedagogicalIssues(lesson, 'CM2', topicName);
  const issues = allIssues.filter((issue) => !(/\.(key_points|takeaway)$/.test(issue.path) && issue.message.includes('partagent trop de tokens')));
  const visual = (lesson.sequence as Array<Record<string, unknown>>)[0].visual as Record<string, unknown>;
  const response = { success: canonical.success && issues.length === 0, providerCalls: 0, canonicalValid: canonical.success, pedagogicalValid: issues.length === 0, visualKind: visual.kind, lesson_content: lesson };
  return { parsed, response: JSON.parse(JSON.stringify(response)), normalizationEvents: [...normalized.events, ...ensured.events], compositionEvents: composition.events };
}

describe('provider-free Fractions fixture pipeline', () => {
  it('passes fenced JSON with missing visual, repeated composition and serializes frontend shape', () => {
    const result = run('Voici:\n```json\n' + JSON.stringify(fixture()) + ',\n```');
    expect(result.response).toMatchObject({ success: true, providerCalls: 0, canonicalValid: true, pedagogicalValid: true, visualKind: 'fraction_bar' });
    expect(result.normalizationEvents.length).toBeGreaterThan(0);
    expect(result.compositionEvents.length).toBeGreaterThan(0);
    expect(result.response.lesson_content).toBeTruthy();
  });
  it('passes all four topic families without provider calls', () => {
    for (const topic of ['Fractions', 'Les nombres entiers', 'Calcul : mental, posé et instrumenté', 'La résolution de problèmes']) {
      const result = run(JSON.stringify(fixture('missing', topic)), topic);
      expect(result.response).toMatchObject({ success: true, providerCalls: 0, canonicalValid: true });
    }
  });
  it('maps an alternate answer field before canonical validation', () => {
    const result = run(JSON.stringify(fixture('missing', 'Les nombres entiers', 'expected_answer')), 'Les nombres entiers');
    expect(result.response).toMatchObject({ success: true, canonicalValid: true });
  });
  it('returns a clean canonical error when no answer can be inferred', () => {
    const source = fixture('missing', 'Les nombres entiers');
    const result = run(JSON.stringify({ ...source, sequence: [{ ...(source.sequence as Array<Record<string, unknown>>)[0] }, { id: 'q', type: 'student_try', question: 'q', answer_type: 'short_text' }] }), 'Les nombres entiers');
    expect(result.canonicalErrors?.[0].path).toContain('correct_answer');
    expect(result.providerCalls).toBe(0);
  });
  it('normalizes unsupported visual kinds without a fatal validation error', () => {
    const result = run(JSON.stringify(fixture('diagram_magic')));
    expect(result.response).toMatchObject({ success: true, providerCalls: 0, canonicalValid: true, visualKind: 'fraction_bar' });
  });
  it('returns a safe parser error for malformed JSON', () => {
    const result = run('{"lesson_goal":"Fractions","sequence":[{"type":"concept"}');
    expect(result.parsed).toMatchObject({ ok: false, category: 'malformed_json' });
    expect(result.providerCalls).toBe(0);
  });
});
