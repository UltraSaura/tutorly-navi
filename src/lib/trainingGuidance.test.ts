import { describe, expect, it } from 'vitest';
import {
  applyCheckFeedback,
  evaluateTrainingAnswer,
  initialQuestionState,
  questionStateKey,
  revealNextHint,
  updateQuestionAnswer,
} from './trainingGuidance';

describe('training guidance state', () => {
  it('keeps separate guidance state for each question', () => {
    const q1 = questionStateKey('item-1', 'q1');
    const q2 = questionStateKey('item-1', 'q2');
    const q3 = questionStateKey('item-1', 'q3');
    let states = {
      [q1]: initialQuestionState(),
      [q2]: initialQuestionState(),
      [q3]: initialQuestionState(),
    };

    states = updateQuestionAnswer(states, q2, '18,2');
    states = applyCheckFeedback(states, q2, { isCorrect: true, feedback: 'Bonne réponse.' });

    expect(states[q1]).toEqual(initialQuestionState());
    expect(states[q2]).toMatchObject({ answer: '18,2', is_correct: true, feedback: 'Bonne réponse.' });
    expect(states[q3]).toEqual(initialQuestionState());
  });

  it('does not update q2 when requesting a hint on q1', () => {
    const q1 = questionStateKey('item-1', 'q1');
    const q2 = questionStateKey('item-1', 'q2');
    const states = revealNextHint({ [q2]: initialQuestionState() }, q1, 3);

    expect(states[q1].hint_level).toBe(1);
    expect(states[q2].hint_level).toBe(0);
  });

  it('checks numeric and multiple choice answers without revealing expected answers', () => {
    expect(evaluateTrainingAnswer({
      answer: '',
      expectedAnswer: { value: 18.2, accepted: ['18,2'] },
      fallbackIncorrect: 'Essaie d’abord de répondre.',
    })).toEqual({ isCorrect: null, feedback: 'Essaie d’abord de répondre.' });

    expect(evaluateTrainingAnswer({
      answer: '18,2',
      expectedAnswer: { value: 18.2, accepted: ['18,2'] },
      guidance: { correct_feedback: 'Bonne réponse.' },
    })).toEqual({ isCorrect: true, feedback: 'Bonne réponse.' });

    expect(evaluateTrainingAnswer({
      answer: '10 %',
      expectedAnswer: '10 %',
      guidance: { correct_feedback: 'Bonne réponse.' },
    })).toEqual({ isCorrect: true, feedback: 'Bonne réponse.' });
  });
});
