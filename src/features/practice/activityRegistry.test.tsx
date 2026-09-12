import { afterEach, describe, expect, it } from 'vitest';
import type { PracticeActivityRendererProps } from './activityRegistry';
import {
  clearPracticeActivityRenderersForTests,
  getPracticeActivityRenderer,
  getRegisteredPracticeActivityEngines,
  hasPracticeActivityRenderer,
  registerPracticeActivityRenderer,
} from './activityRegistry';

function DummyRenderer(_props: PracticeActivityRendererProps) {
  return null;
}

afterEach(() => {
  clearPracticeActivityRenderersForTests();
});

describe('practice activity renderer registry', () => {
  it('registers and resolves a renderer by reusable engine', () => {
    registerPracticeActivityRenderer('match_pairs', DummyRenderer);
    expect(hasPracticeActivityRenderer('match_pairs')).toBe(true);
    expect(getPracticeActivityRenderer('match_pairs')).toBe(DummyRenderer);
  });

  it('returns no renderer for engines not implemented yet', () => {
    expect(hasPracticeActivityRenderer('timeline')).toBe(false);
    expect(getPracticeActivityRenderer('timeline')).toBeUndefined();
  });

  it('returns registered engines deterministically', () => {
    registerPracticeActivityRenderer('timeline', DummyRenderer);
    registerPracticeActivityRenderer('fact_sprint', DummyRenderer);
    expect(getRegisteredPracticeActivityEngines()).toEqual(['fact_sprint', 'timeline']);
  });
});
