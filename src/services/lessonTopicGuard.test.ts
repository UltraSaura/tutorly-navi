import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { authGetUser, from, invoke } = vi.hoisted(() => ({ authGetUser: vi.fn(), from: vi.fn(), invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: authGetUser }, from, functions: { invoke }, rpc: vi.fn() } }));

import { assertExplicitStagingTopicId, assertGenerationTopic, CM2_GEOMETRY_TOPIC_ID, generateStagingDraft, saveDraftVersion, validateDrawableGeometry } from './lessonVersionWorkflow';
import { PedagogicalVisual } from '@/components/learning/PedagogicalVisual';

const FIXTURE = '185f20b5-d698-446d-80e8-c3c462819b94';
const sym = (data: unknown) => ({ levels: [{ level_number: 4, lesson: { sequence: [{ visual: { kind: 'symmetry', data } }] } }] });
const complete = { axis: { x: 5 }, grid: { width: 10, height: 8 }, figure: [{ x: 2, y: 2 }, { x: 3, y: 4 }, { x: 2, y: 5 }], symmetric_figure: [{ x: 8, y: 2 }, { x: 7, y: 4 }, { x: 8, y: 5 }] };
const symIssues = (data: unknown) => validateDrawableGeometry(sym(data)).filter((i) => !i.message.startsWith('Missing required'));

describe('symmetry drawable contract', () => {
  it('accepts and renders complete symmetry (axis {x} or {y})', () => {
    expect(symIssues(complete)).toEqual([]);
    expect(symIssues({ ...complete, axis: { y: 4 } })).toEqual([]);
    const html = renderToStaticMarkup(React.createElement(PedagogicalVisual, { block: { title: 'S', content: '', visual: { kind: 'symmetry', data: complete } } } as any));
    expect(html).toContain('data-testid="symmetry-grid"');
    expect(html).not.toContain('Symétrie incomplète');
  });
  it.each([
    ['missing axis', { ...complete, axis: undefined }],
    ['string axis', { ...complete, axis: 'vertical' }],
    ['missing grid height', { ...complete, grid: { width: 10 } }],
    ['single-point figure', { ...complete, figure: [{ x: 2, y: 2 }] }],
    ['non-numeric reflected point', { ...complete, symmetric_figure: [{ x: 'a', y: 2 }, { x: 7, y: 4 }] }],
    ['missing reflected set', { ...complete, symmetric_figure: undefined }],
  ])('rejects incomplete symmetry: %s', (_label, data) => expect(symIssues(data).length).toBeGreaterThan(0));
});

describe('topic guard', () => {
  it('accepts any explicit non-fixture topic for the staging workflow', () => {
    expect(assertExplicitStagingTopicId('7588497a-6173-4144-864e-25bcab6b4011')).toBe('7588497a-6173-4144-864e-25bcab6b4011');
    expect(assertExplicitStagingTopicId('another-topic')).toBe('another-topic');
  });

  it('refuses the fixture topic and any other topic for CM2 generation', () => {
    expect(() => assertGenerationTopic(FIXTURE)).toThrow('fixture_topic_refused');
    expect(() => assertGenerationTopic('')).toThrow('staging_topic_id_required');
    expect(() => assertGenerationTopic('other')).toThrow('unexpected_topic_id');
    expect(assertGenerationTopic(CM2_GEOMETRY_TOPIC_ID)).toBe(CM2_GEOMETRY_TOPIC_ID);
  });
  it('never invokes the generator for the fixture topic', async () => {
    await expect(generateStagingDraft(FIXTURE)).rejects.toThrow('fixture_topic_refused');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('rejects a returned topic id that differs before saving', async () => {
    invoke.mockResolvedValueOnce({ data: { success: true, providerCalls: 4, lesson_content: {}, topic_id: FIXTURE }, error: null });
    await expect(generateStagingDraft(CM2_GEOMETRY_TOPIC_ID)).rejects.toThrow('topic_id_mismatch');
    await expect(saveDraftVersion(CM2_GEOMETRY_TOPIC_ID, {}, FIXTURE)).rejects.toThrow('topic_id_mismatch');
    expect(from).not.toHaveBeenCalled();
  });
});
