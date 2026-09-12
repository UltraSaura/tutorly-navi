import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillActivityDefinition } from '@/types/skill-activity';
import { StructuredPracticeRenderer } from './StructuredPracticeRenderer';

const choiceActivity: SkillActivityDefinition = {
  id: 'test-choice', subjectId: 'sciences', conceptId: 'science:test', engine: 'sort_classify', ageBand: 'upper_primary', masteryLevels: [2, 3], difficulty: 2,
  configuration: { items: [{ id: 'q1', type: 'choice', prompt: { en: 'Water vapor is…', fr: 'La vapeur d’eau est…' }, choices: [{ en: 'gas', fr: 'gaz' }, { en: 'solid', fr: 'solide' }], expected: 'gaz' }] },
};

const orderActivity: SkillActivityDefinition = {
  id: 'test-order', subjectId: 'histoire', conceptId: 'history:test', engine: 'timeline', ageBand: 'upper_primary', masteryLevels: [2, 3], difficulty: 2,
  configuration: { items: [{ id: 'q1', type: 'order', prompt: { en: 'Order', fr: 'Ordre' }, tokens: [{ en: 'Second', fr: 'Deuxième' }, { en: 'First', fr: 'Premier' }], expectedOrder: ['Premier', 'Deuxième'] }] },
};

describe('StructuredPracticeRenderer', () => {
  it('emits verified evidence for a correct localized choice', () => {
    const onAttempt = vi.fn();
    render(<StructuredPracticeRenderer activity={choiceActivity} onAttempt={onAttempt} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /gas|gaz/i }));
    fireEvent.click(screen.getByRole('button', { name: /check|vérifier/i }));
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: true, itemId: 'test-choice:q1' }));
  });

  it('does not complete an ordered activity in the wrong order', () => {
    const onAttempt = vi.fn();
    const onComplete = vi.fn();
    render(<StructuredPracticeRenderer activity={orderActivity} onAttempt={onAttempt} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Second|Deuxième/i }));
    fireEvent.click(screen.getByRole('button', { name: /First|Premier/i }));
    fireEvent.click(screen.getByRole('button', { name: /check|vérifier/i }));
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
