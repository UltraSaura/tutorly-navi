import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';
import { formatAdminGenerationError } from '@/components/admin/learning/generationErrorMapping';

const { authGetUser, from, invoke } = vi.hoisted(() => ({ authGetUser: vi.fn(), from: vi.fn(), invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from,
    functions: { invoke },
    rpc: vi.fn(),
  },
}));

import {
  classifyStagingTopic,
  saveDraftVersion,
  validateDrawableTimeVisuals,
  validateLessonVersion,
} from './lessonVersionWorkflow';

const TIME_TOPIC_ID = '7588497a-6173-4144-864e-25bcab6b4011';
const TIME_TOPIC_NAME = 'Le repérage dans le temps et les durées';

const timeVisualBlock = (id: string, title: string, content: string, visual: Record<string, unknown>) => ({ id, type: 'visual', title, content, visual });

function buildTimeLesson(overrides?: { visuals?: Record<string, unknown>[] }) {
  const lesson = structuredClone(geometryDraftLesson) as any;
  lesson.topic_goal = 'Lire l’heure et convertir des durées avec des unités cohérentes.';
  lesson.levels[0].title = 'Exemples complets de durées';
  lesson.levels[0].purpose = 'Observer des horloges et des conversions entièrement dessinables.';
  lesson.levels[0].lesson.lesson_goal = 'Lire une horloge et convertir des unités de durée.';
  lesson.levels[0].lesson.sequence = (overrides?.visuals ?? [
    { kind: 'clock', alt_text: 'Horloge indiquant 3 heures et 15 minutes.', purpose: 'Lire une heure précise sur un cadran.', data: { hour: 3, minute: 15 } },
    { kind: 'timeline', alt_text: 'Frise des unités seconde, minute et heure.', purpose: 'Comparer l’ordre des unités de durée.', data: { units: ['seconde', 'minute', 'heure'] } },
    { kind: 'unit_conversion', alt_text: 'Conversion d’une minute en secondes.', purpose: 'Montrer le facteur entre minute et seconde.', data: { from: 'minute', to: 'seconde', factor: 60 } },
  ]).map((visual, index) => timeVisualBlock(`time-${index}`, `Bloc temps ${index + 1}`, 'On observe la représentation pour raisonner sur les durées.', visual));
  return lesson;
}

describe('time-topic staging validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  });

  it('classifies the CM2 time topic as time and geometry topics as geometry', () => {
    expect(classifyStagingTopic(TIME_TOPIC_NAME)).toBe('time');
    expect(classifyStagingTopic('La géométrie plane')).toBe('geometry');
    expect(classifyStagingTopic(undefined)).toBe('geometry');
  });

  it('still requires every geometry visual for geometry topics', () => {
    const validation = validateLessonVersion(geometryDraftLesson, { topicKind: 'geometry' });
    expect(validation.geometryValid).toBe(true);
    const missing = structuredClone(geometryDraftLesson) as any;
    missing.levels[0].lesson.sequence = missing.levels[0].lesson.sequence.filter((block: any) => block.visual.kind !== 'circle');
    const failed = validateLessonVersion(missing, { topicKind: 'geometry' });
    expect(failed.geometryValid).toBe(false);
    expect(failed.geometryIssues.some((issue) => issue.message.includes('circle'))).toBe(true);
  });

  it('accepts clock, timeline, and unit_conversion visuals for time topics', () => {
    const validation = validateLessonVersion(buildTimeLesson(), { topicKind: 'time' });
    expect(validation.geometryValid).toBe(true);
    expect(validation.canonicalValid).toBe(true);
    expect(validation.pedagogicalValid).toBe(true);
  });

  it('does not fail a time topic because rectangle/triangle/circle/angle/symmetry are absent', () => {
    const lesson = buildTimeLesson();
    const kinds = lesson.levels[0].lesson.sequence.map((block: any) => block.visual.kind);
    expect(kinds).toEqual(['clock', 'timeline', 'unit_conversion']);
    const validation = validateLessonVersion(lesson, { topicKind: 'time' });
    expect(validation.geometryValid).toBe(true);
    expect(validation.geometryIssues).toEqual([]);
  });

  it('fails a time topic that has no clock, timeline, or unit_conversion visual', () => {
    const issues = validateDrawableTimeVisuals(geometryDraftLesson);
    expect(issues.some((issue) => issue.message.includes('clock, timeline, unit_conversion'))).toBe(true);
    const validation = validateLessonVersion(geometryDraftLesson, { topicKind: 'time' });
    expect(validation.geometryValid).toBe(false);
  });

  it('rejects incomplete time visual data such as an out-of-range clock hour', () => {
    const lesson = buildTimeLesson({ visuals: [
      { kind: 'clock', alt_text: 'Horloge.', purpose: 'Lire l’heure.', data: { hour: 13, minute: 15 } },
      { kind: 'timeline', alt_text: 'Frise.', purpose: 'Ordonner.', data: { units: ['minute', 'heure'] } },
    ] });
    const validation = validateLessonVersion(lesson, { topicKind: 'time' });
    expect(validation.geometryValid).toBe(false);
    expect(validation.geometryIssues.some((issue) => issue.path.endsWith('data.hour'))).toBe(true);
  });

  it('saves no partial draft when time-topic validation fails', async () => {
    const invalid = buildTimeLesson({ visuals: [
      { kind: 'clock', alt_text: 'Horloge.', purpose: 'Lire l’heure.', data: { hour: 25, minute: 99 } },
    ] });
    await expect(saveDraftVersion(TIME_TOPIC_ID, invalid, TIME_TOPIC_ID, null, 'time')).rejects.toThrow(/Draft validation failed/);
    expect(from).not.toHaveBeenCalled();
  });

  it('saves a valid time-topic draft without requiring geometry visuals', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'version-time-1' }, error: null });
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    from.mockReturnValue({ insert });
    const version = await saveDraftVersion(TIME_TOPIC_ID, buildTimeLesson(), TIME_TOPIC_ID, null, 'time');
    expect(version.id).toBe('version-time-1');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ topic_id: TIME_TOPIC_ID, status: 'draft' }));
    expect(from).not.toHaveBeenCalledWith('topics');
  });

  it('formats draft validation failures without [object Object] and keeps the technical detail', async () => {
    const invalid = buildTimeLesson({ visuals: [
      { kind: 'clock', alt_text: 'Horloge.', purpose: 'Lire l’heure.', data: { hour: 13, minute: 15 } },
    ] });
    const error = await saveDraftVersion(TIME_TOPIC_ID, invalid, TIME_TOPIC_ID, null, 'time').catch((value) => value);
    const formatted = formatAdminGenerationError(error);
    expect(formatted).not.toContain('[object Object]');
    expect(formatted).toContain('Validation failure');
    expect(formatted).toContain('code=draft_validation_failed');
    expect(formatted).toContain('data.hour');
  });
});
