import { describe, expect, it } from 'vitest';
import { validateLessonV21 as validateBrowser } from './lesson-v21-contract';
import { validateLessonVersion } from '@/services/lessonVersionWorkflow';
import { parseLessonContent, parseLessonV21 } from './lesson-generator';
import { v21ActivityFixtures } from '@/features/explanation-v2/fixtures/v21ActivityFixtures';
import { cm2FractionLessonV21Fixture } from '@/features/explanation-v2/fixtures/cm2FractionLessonV21.fixture';
import { validateLessonV21 as validateEdge } from '../../supabase/functions/generate-lesson-content/lesson-v21-contract.ts';

const baseLesson = (sequence: unknown[]) => ({
  version: '2.1',
  topic_goal: 'Additionner des fractions',
  levels: [{
    id: 'test-level-1', level_number: 1, title: 'Comprendre les parts', purpose: 'Comprendre', difficulty: 'CM2',
    objective_ids: ['TEST-OBJECTIVE-ONLY'],
    lesson: {
      lesson_goal: 'Comprendre les fractions équivalentes.', success_criteria: ['Je représente des parts égales.'],
      prerequisites: [], misconceptions: [], sequence, mastery: { skills: ['fraction equivalence'], threshold: 0.8 },
    },
  }],
});

describe('interactive lesson workflow contract compatibility', () => {
  it.each(v21ActivityFixtures.map((activity) => [String((activity as { kind: string }).kind), activity]))(
    'accepts %s through the browser and Edge lesson contracts', (_kind, activity) => {
      const payload = baseLesson([{ id: 'activity-block', type: 'interactive_activity', activity }]);
      expect(validateBrowser(payload, { prerequisiteFormat: 'staging' }).success).toBe(true);
      expect(validateEdge(payload, { prerequisiteFormat: 'staging' }).success).toBe(true);
      expect(parseLessonV21(payload)).not.toBeNull();
    },
  );

  it('accepts a staging prerequisite through the existing workflow and player parser', () => {
    const prerequisite = { id: 'p1', description: 'Comparer des parts', prompt: 'Quelle fraction est la plus grande ?', type: 'multiple_choice', choices: ['1/2', '1/4'], expected_answer: '1/2', remediation_hint: 'Compare les parts de même taille.' };
    const payload = baseLesson([{ id: 'activity-block', type: 'interactive_activity', activity: v21ActivityFixtures[0] }]);
    payload.levels[0].lesson.prerequisites = [prerequisite];
    expect(validateLessonVersion(payload, { topicKind: 'general' }).canonicalValid).toBe(true);
    expect(parseLessonV21(payload)).not.toBeNull();
    expect(validateEdge(payload).success).toBe(true);
  });

  it.each([
    (activity: Record<string, unknown>) => ({ ...activity, kind: 'unsupported-kind' }),
    (activity: Record<string, unknown>) => ({ ...activity, schemaVersion: 2 }),
    (activity: Record<string, unknown>) => ({ ...activity, title: '' }),
    (activity: Record<string, unknown>) => ({ ...activity, kind: 'fraction-select', target: { n: 3, d: 0 } }),
    (activity: Record<string, unknown>) => ({ ...v21ActivityFixtures[1] as object, transfer: { left: { n: 1, d: 4 }, right: { n: 1, d: 3 }, targetDenominator: 4 } }),
  ])('rejects invalid interactive activity consistently', (mutate) => {
    const original = v21ActivityFixtures[0] as Record<string, unknown>;
    const payload = baseLesson([{ id: 'activity-block', type: 'interactive_activity', activity: mutate(original) }]);
    const browser = validateBrowser(payload, { prerequisiteFormat: 'staging' });
    const edge = validateEdge(payload, { prerequisiteFormat: 'staging' });
    expect(browser.success).toBe(false);
    expect(edge.success).toBe(false);
    expect(parseLessonV21(payload)).toBeNull();
  });

  it('rejects duplicate block and activity IDs before the player receives the lesson', () => {
    const first = { id: 'block-a', type: 'interactive_activity', activity: v21ActivityFixtures[0] };
    const second = { id: 'block-b', type: 'interactive_activity', activity: { ...v21ActivityFixtures[1] as object, id: 'activity-fraction-select' } };
    const payload = baseLesson([first, second]);
    expect(validateBrowser(payload, { prerequisiteFormat: 'staging' }).success).toBe(false);
    expect(validateEdge(payload, { prerequisiteFormat: 'staging' }).success).toBe(false);
    expect(parseLessonV21(payload)).toBeNull();
    const duplicateBlock = baseLesson([{ id: 'same', type: 'hook', title: 'A', content: 'A' }, { id: 'same', type: 'hook', title: 'B', content: 'B' }]);
    expect(validateBrowser(duplicateBlock, { prerequisiteFormat: 'staging' }).success).toBe(false);
    expect(validateEdge(duplicateBlock, { prerequisiteFormat: 'staging' }).success).toBe(false);
    expect(parseLessonV21(duplicateBlock)).toBeNull();
  });

  it('scopes reusable block identifiers to each independently mounted V2.1 level', () => {
    const one = baseLesson([{ id: 'same-block-id', type: 'hook', title: 'Découvrir', content: 'Observer.' }]);
    const secondLevel = {
      ...one.levels[0], id: 'test-level-2', level_number: 2,
      lesson: { ...one.levels[0].lesson, sequence: [{ id: 'same-block-id', type: 'hook', title: 'Comprendre', content: 'Comparer.' }] },
    };
    const payload = { ...one, levels: [...one.levels, secondLevel] };
    expect(validateBrowser(payload, { prerequisiteFormat: 'staging' }).success).toBe(true);
    expect(validateEdge(payload, { prerequisiteFormat: 'staging' }).success).toBe(true);
    expect(parseLessonV21(payload)).not.toBeNull();
  });

  it('keeps the full CM2 fixture valid through workflow, parser, and Edge validation', () => {
    const fixture = cm2FractionLessonV21Fixture as { levels: Array<{ lesson: { prerequisites: Array<Record<string, unknown>> } }> };
    const stagingFixture = {
      ...fixture,
      version: '2.1',
      topic_goal: 'Additionner des fractions de dénominateurs différents.',
      levels: fixture.levels.map((level) => ({
        ...level,
        lesson: {
          ...level.lesson,
          prerequisites: level.lesson.prerequisites.map((item) => {
            const { check_question, answer_type, ...stagingFields } = item;
            const type = item.type ?? answer_type;
            const expected = type === 'numeric' && typeof item.expected_answer === 'string' && item.expected_answer.trim() !== ''
              ? Number(item.expected_answer)
              : item.expected_answer;
            return { ...stagingFields, prompt: item.prompt ?? check_question, type, expected_answer: expected };
          }),
        },
      })),
    };
    const workflowValidation = validateLessonVersion(stagingFixture, { topicKind: 'general' });
    expect(workflowValidation.canonicalValid, JSON.stringify(workflowValidation.canonicalIssues)).toBe(true);
    expect(parseLessonV21(stagingFixture)).not.toBeNull();
    expect(validateEdge(stagingFixture, { prerequisiteFormat: 'staging' }).success).toBe(true);
  });

  it('strictly rejects malformed V2.0 interactive payloads after harmless outer normalization', () => {
    const v2 = {
      version: '2.0', lesson_goal: 'Construire une fraction', success_criteria: ['Je sélectionne les parts.'],
      prerequisites: [{ id: 'p1', description: 'Lire une fraction', check_question: 'Que signifie le dénominateur ?', answer_type: 'text', expected_answer: 'Le nombre de parts égales', remediation_hint: 'Regarde le nombre du bas.' }],
      sequence: [{ type: 'interactive_activity', activity: v21ActivityFixtures[0], provider_note: 'harmless outer field' }],
      misconceptions: [], mastery: { skills: ['fraction'], threshold: '0.8' },
    };
    expect(parseLessonContent(v2)).not.toBeNull();
    const invalid = { ...v2, sequence: [{ type: 'interactive_activity', activity: { ...(v21ActivityFixtures[0] as object), schemaVersion: 9 } }] };
    expect(parseLessonContent(invalid)).toBeNull();
  });
});
