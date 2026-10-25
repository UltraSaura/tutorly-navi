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
  publishValidatedDraft,
  saveDraftVersion,
  validateDrawableGeneralVisuals,
  validateDrawableTimeVisuals,
  validateLessonVersion,
} from './lessonVersionWorkflow';

const TIME_TOPIC_ID = '7588497a-6173-4144-864e-25bcab6b4011';
const TIME_TOPIC_NAME = 'Le repérage dans le temps et les durées';
const DECIMAL_TOPIC_ID = '07fe506e-71f4-44c9-bf7f-98c51a2ca68a';
const DECIMAL_TOPIC_NAME = 'Les nombres décimaux';

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

function buildDecimalLesson(overrides?: { visuals?: Record<string, unknown>[] }) {
  const lesson = structuredClone(geometryDraftLesson) as any;
  lesson.topic_goal = 'Comprendre et utiliser les nombres décimaux.';
  lesson.levels[0].title = 'Comprendre le sens et les bases';
  lesson.levels[0].purpose = 'Découvrir les nombres décimaux avec des représentations visuelles.';
  lesson.levels[0].lesson.lesson_goal = 'Repérer et comparer des nombres décimaux.';
  lesson.levels[0].lesson.sequence = (overrides?.visuals ?? [
    { kind: 'number_line', alt_text: 'Droite graduée de 0 à 10.', purpose: 'Repérer un nombre sur une droite graduée.', data: { min: 0, max: 10, step: 1 } },
    { kind: 'table', alt_text: 'Tableau de numération décimale.', purpose: 'Organiser les chiffres des unités et dixièmes.', data: { columns: ['Unités', 'Dixièmes', 'Centièmes'] } },
  ]).map((visual, index) => ({
    id: `decimal-${index}`,
    type: 'concept',
    title: `Concept décimal ${index + 1}`,
    content: 'On utilise la représentation pour repérer et comparer les nombres décimaux avec précision.',
    key_points: [
      { label: 'Repère', text: 'Chaque position possède une valeur déterminée.' },
      { label: 'Ordre', text: 'Les grandeurs se comparent de gauche à droite.' },
    ],
    takeaway: 'Astuce : pense aux barreaux d’une échelle.',
    visual,
  }));
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

  describe('general-topic staging validation (e.g. Les nombres décimaux)', () => {
    it('classifies general topics as general and preserves geometry and time classification', () => {
      expect(classifyStagingTopic('Les nombres décimaux')).toBe('general');
      expect(classifyStagingTopic('Les fractions')).toBe('general');
      expect(classifyStagingTopic('Algèbre')).toBe('general');
      expect(classifyStagingTopic('Calcul')).toBe('general');
      expect(classifyStagingTopic('Résolution de problèmes')).toBe('general');
      expect(classifyStagingTopic('La géométrie plane')).toBe('geometry');
      expect(classifyStagingTopic('Les aires')).toBe('geometry');
      expect(classifyStagingTopic(TIME_TOPIC_NAME)).toBe('time');
      expect(classifyStagingTopic(undefined)).toBe('geometry');
    });

    it('accepts a general lesson with number_line and table visuals without requiring geometry figures', () => {
      const lesson = buildDecimalLesson();
      const validation = validateLessonVersion(lesson, { topicKind: 'general' });
      expect(validation.geometryValid).toBe(true);
      expect(validation.canonicalValid).toBe(true);
      expect(validation.pedagogicalValid).toBe(true);
      expect(validation.geometryIssues).toEqual([]);
    });

    it('fails a general lesson when geometry shapes are mistakenly enforced', () => {
      const lesson = buildDecimalLesson();
      const validation = validateLessonVersion(lesson, { topicKind: 'geometry' });
      expect(validation.geometryValid).toBe(false);
      expect(validation.geometryIssues.length).toBeGreaterThanOrEqual(4);
      expect(validation.geometryIssues.some((issue) => issue.message.includes('rectangle'))).toBe(true);
      expect(validation.geometryIssues.some((issue) => issue.message.includes('circle'))).toBe(true);
    });

    it('validates number_line and table visual structures when present in a general lesson', () => {
      const invalid = buildDecimalLesson({ visuals: [
        { kind: 'number_line', alt_text: 'Droite.', purpose: 'Repérer.', data: { min: 'not-a-number', max: 10 } },
        { kind: 'table', alt_text: 'Tableau.', purpose: 'Organiser.', data: { columns: [] } },
      ] });
      const issues = validateDrawableGeneralVisuals(invalid);
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.some((issue) => issue.message.includes('Number line requires numeric min and max'))).toBe(true);
      expect(issues.some((issue) => issue.message.includes('Table requires non-empty columns'))).toBe(true);
    });

    it('saves a valid general-topic draft without requiring geometry visuals', async () => {
      const single = vi.fn().mockResolvedValue({ data: { id: 'version-decimal-1' }, error: null });
      const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
      from.mockReturnValue({ insert });
      const version = await saveDraftVersion(DECIMAL_TOPIC_ID, buildDecimalLesson(), DECIMAL_TOPIC_ID, null, 'general');
      expect(version.id).toBe('version-decimal-1');
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ topic_id: DECIMAL_TOPIC_ID, status: 'draft' }));
    });
  });
});
