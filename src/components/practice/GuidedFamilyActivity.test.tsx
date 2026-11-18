import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuidedFamilyActivity } from './GuidedFamilyActivity';
import type { GuidedFamilyExercise, GuidedFamilyState } from '@/features/practice/guidedFamilies';

const exercise: GuidedFamilyExercise = { id: 'word', kind: 'guided-word-problem', prompt: 'Stale prompt', initial: 8, change: 3, operation: 'subtraction', object: 'apple' };
const render = (initialState?: GuidedFamilyState) => renderToStaticMarkup(<GuidedFamilyActivity exercise={exercise} initialState={initialState} />);
const saved: GuidedFamilyState = { selectedOperation: 'subtraction', modelActions: 3, modelComplete: true, selectedAnswer: 5, complete: true, attempts: 2, supported: true };

describe('guided exercise rendering and restored progress', () => {
  it('starts by recognizing the operation with an uncertainty path, not a revealed solution', () => {
    const html = render();
    expect(html).toContain('Quelle opération');
    expect(html).toContain('Je ne suis pas sûr');
    expect(html).not.toContain('Stale prompt');
    expect(html).not.toContain('= 5');
    expect(html).not.toContain('guided-family-complete');
  });

  it('restores a valid completed exercise without replaying completion callbacks', () => {
    expect(render(saved)).toContain('guided-family-complete');
    expect(render(saved)).toContain('8 − 3 = 5');
  });

  it('rejects a saved false completion with missing model actions', () => {
    const html = render({ ...saved, modelActions: 0 });
    expect(html).not.toContain('guided-family-complete');
    expect(html).not.toContain('= 5');
    expect(html).toContain('Enlever un objet');
  });

  it('does not restore completion without a submitted attempt', () => {
    expect(render({ ...saved, attempts: 0 })).not.toContain('guided-family-complete');
  });

  it('rejects a saved false completion with the wrong operation', () => {
    const html = render({ ...saved, selectedOperation: 'addition' });
    expect(html).not.toContain('guided-family-complete');
    expect(html).toContain('Quelle opération');
  });

  it('reports invalid exercise configuration instead of crashing', () => {
    const html = renderToStaticMarkup(<GuidedFamilyActivity exercise={{ ...exercise, initial: -1 }} />);
    expect(html).toContain('role="alert"');
  });
});
