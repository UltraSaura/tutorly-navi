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

function runPipeline(raw: string, topicName: string) {
  const parsed = parseProviderJsonSafely(raw);
  if (!parsed.ok) return { parsed, providerCalls: 0, success: false };
  const answers = normalizeCanonicalAnswers(parsed.value as Record<string, unknown>);
  if (answers.errors.length) return { parsed, providerCalls: 0, success: false, canonicalErrors: answers.errors };
  const normalized = normalizeGeneratedLesson(answers.lesson, topicName);
  const ensured = ensureRequiredVisuals(normalized.lesson, topicName);
  const composition = normalizeLessonComposition(ensured.lesson, topicName);
  const lesson = composition.lesson;
  const canonical = validateLessonV21({ version: '2.1', topic_goal: topicName, levels: [{ id: 'fixture-level', level_number: 1, title: topicName, purpose: `Comprendre ${topicName}.`, difficulty: 'foundation', objective_ids: [], lesson }] });
  const allQualityIssues = pedagogicalIssues(lesson, 'CM2', topicName);
  // Match the live V2.1 gate: deterministic composition cleanup owns the
  // key_points/takeaway repetition warning, while all other pedagogical
  // issues remain hard failures.
  const qualityIssues = allQualityIssues.filter((issue) => !(/\.(key_points|takeaway)$/.test(issue.path) && issue.message.includes('partagent trop de tokens')));
  return {
    parsed,
    providerCalls: 0,
    success: canonical.success && qualityIssues.length === 0,
    canonicalValid: canonical.success,
    pedagogicalValid: qualityIssues.length === 0,
    canonicalIssues: canonical.success ? [] : canonical.issues,
    qualityIssues,
    normalizationEvents: [...normalized.events, ...ensured.events],
    compositionEvents: composition.events,
  };
}

function topicFixture(topicName: string, visualKind: string, content: string, data: Record<string, unknown>) {
  return {
    lesson_goal: `Comprendre ${topicName}.`,
    success_criteria: ['Je peux expliquer la notion.', 'Je peux résoudre un exemple.'],
    prerequisites: [],
    misconceptions: [],
    sequence: [
      { id: 'concept', type: 'concept', title: topicName, content, key_points: [{ label: 'Idée', text: 'Je relie la représentation à la situation.' }], takeaway: 'Observe la représentation avant de choisir une méthode.', visual: { kind: visualKind, purpose: `Représenter ${topicName}.`, alt_text: `Représentation de ${topicName}.`, data } },
      { id: 'try', type: 'student_try', question: 'Quelle réponse convient ?', answer_type: 'short_text', correct_answer: '42', success_feedback: 'Bravo !', error_feedback: 'Observe encore la représentation.' },
      { id: 'mastery', type: 'mastery_check', questions: [{ id: 'q1', question: 'Explique ton choix.', answer_type: 'short_text', correct_answer: '42', skill: topicName, difficulty: 1, success_feedback: 'Bien joué !', error_feedback: 'Reprends l’idée centrale.' }] },
    ],
    mastery: { skills: [topicName], threshold: 0.8 },
  };
}

describe('provider-free Fractions fixture pipeline', () => {
  it('passes fenced JSON with missing visual, repeated composition and serializes frontend shape', () => {
    const result = run('Voici:\n```json\n' + JSON.stringify(fixture()) + ',\n```');
    expect(result.response).toMatchObject({ success: true, providerCalls: 0, canonicalValid: true, pedagogicalValid: true, visualKind: 'fraction_bar' });
    expect(result.normalizationEvents?.length).toBeGreaterThan(0);
    expect(result.compositionEvents?.length).toBeGreaterThan(0);
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

describe('requested provider-free topic and failure matrix', () => {
  const validTopics = [
    ['CM2 — Les nombres entiers', 'number_line', 'Sur une droite graduée, la position montre la valeur du nombre.', { min: 0, max: 100, step: 10 }],
    ['CM2 — Fractions', 'fraction_bar', 'Une fraction décrit des parts égales d’un même tout.', { parts: 4, filled: 1, denominator: 4, numerator: 1 }],
    ['Calcul : mental, posé et instrumenté', 'groups', 'On choisit une méthode de calcul adaptée aux nombres et à la situation.', { groups: [10, 4, 2] }],
    ['La résolution de problèmes', 'sequence', 'Pour résoudre un problème, je repère les données, la question et l’opération utile.', { items: ['données', 'question', 'opération'] }],
    ['Algèbre', 'equation', 'Une égalité reste vraie quand on effectue la même action sur les deux membres.', { left: 'x + 3', right: '8' }],
    ['Geometry', 'triangle', 'Une figure géométrique se décrit avec ses côtés, ses sommets et ses propriétés.', { shape: 'triangle', vertices: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 70 }] }],
    ['Measurement', 'measurement', 'Mesurer consiste à comparer une grandeur avec une unité adaptée.', { unit: 'cm', value: 7 }],
  ] as const;

  it.each(validTopics)('accepts %s using the same production pipeline with zero provider calls', (topic, visualKind, content, data) => {
    const result = runPipeline(JSON.stringify(topicFixture(topic, visualKind, content, data)), topic);
    expect(result).toMatchObject({ success: true, providerCalls: 0, canonicalValid: true, pedagogicalValid: true });
  });

  it('repairs missing and unsupported visuals deterministically without provider calls', () => {
    const source = topicFixture('CM2 — Fractions', 'diagram_magic', 'Une fraction décrit des parts égales d’un même tout.', { });
    delete (source.sequence[0] as { visual?: unknown }).visual;
    const result = runPipeline(JSON.stringify(source), 'CM2 — Fractions');
    expect(result).toMatchObject({ success: true, providerCalls: 0 });
    expect(result.normalizationEvents?.length).toBeGreaterThan(0);
  });

  it('hard-fails malformed, truncated, incomplete, and ambiguous provider output', () => {
    const base = topicFixture('CM2 — Fractions', 'fraction_bar', 'Une fraction décrit des parts égales d’un même tout.', { parts: 4, filled: 1 });
    const cases = [
      ['truncated JSON', '{"lesson_goal":"Fractions","sequence":['],
      ['malformed JSON', '{"lesson_goal":"Fractions",}'],
      ['missing correct_answer', JSON.stringify({ ...base, sequence: [{ ...(base.sequence[0]) }, { ...(base.sequence[1]), correct_answer: undefined }] })],
      ['ambiguous correct choices', JSON.stringify({ ...base, sequence: [{ ...(base.sequence[0]) }, { ...(base.sequence[1]), correct_answer: undefined, choices: [{ label: '1/4', correct: true }, { label: '2/4', correct: true }] }, base.sequence[2]] })],
      ['invalid success criteria', JSON.stringify({ ...base, success_criteria: [] })],
      ['missing essential steps', JSON.stringify({ ...base, sequence: [] })],
    ] as const;
    for (const [name, raw] of cases) {
      const result = runPipeline(raw, 'CM2 — Fractions');
      expect(result.success, name).toBe(false);
      expect(result.providerCalls, name).toBe(0);
    }
  });

  it('keeps a textual explanation copy invalid even after legacy deterministic cleanup', () => {
    const repeated = topicFixture('CM2 — Fractions', 'fraction_bar', 'Le numérateur compte les parts prises et le dénominateur indique les parts égales.', { parts: 4, filled: 1 });
    (repeated.sequence[0] as Record<string, unknown>).key_points = [{ label: 'Règle', text: 'Le numérateur compte les parts prises et le dénominateur indique les parts égales.' }];
    (repeated.sequence[0] as Record<string, unknown>).takeaway = 'Le numérateur compte les parts prises et le dénominateur indique les parts égales.';
    const result = runPipeline(JSON.stringify(repeated), 'CM2 — Fractions');
    expect(result).toMatchObject({ success: false, providerCalls: 0 });
    expect(result.qualityIssues).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('copié textuellement') })]));
    expect(result.compositionEvents?.length).toBeGreaterThan(0);
  });

  it('rejects a mathematically inconsistent visual/text example', () => {
    const clock = topicFixture('Lire l’heure', 'clock', 'La petite aiguille indique 3 heures et la grande aiguille est sur 12.', { hour: 4, minute: 30 });
    const result = runPipeline(JSON.stringify(clock), 'Lire l’heure');
    expect(result).toMatchObject({ success: false, providerCalls: 0, pedagogicalValid: false });
    expect(result.qualityIssues?.some((issue) => issue.path.includes('visual.data'))).toBe(true);
  });
});
