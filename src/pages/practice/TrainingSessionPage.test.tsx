import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { shouldPersistTrainingAnswer, TrainingQuestionBlock } from './TrainingSessionPage';
import { initialQuestionState, type TrainingQuestion } from '@/lib/trainingGuidance';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'practice.guidance.checkAnswer': 'Vérifier ma réponse',
      'practice.guidance.hint': 'Indice',
      'practice.guidance.nextHint': 'Indice suivant',
    }[key] ?? key),
  }),
}));

const question: TrainingQuestion = {
  id: 'q2',
  label: '2.',
  prompt: 'Détermine l’étendue de cette série.',
  answer_type: 'numeric',
  choices: null,
  expected_answer: { value: 18.2, accepted: ['18,2', '18.2'] },
  guidance: {
    hints: [
      { level: 1, text: 'Cherche la température la plus élevée.' },
      { level: 2, text: 'Cherche la température la plus basse.' },
      { level: 3, text: 'Calcule maximum - minimum.' },
    ],
    correct_feedback: 'Oui, tu as bien identifié la méthode.',
    almost_feedback: 'Tu es proche : vérifie les deux valeurs utilisées.',
    incorrect_feedback: 'Reviens au tableau.',
  },
};

describe('TrainingSessionPage guidance rendering', () => {
  it('does not render expected_answer in the student DOM', () => {
    const html = renderToStaticMarkup(
      <TrainingQuestionBlock
        itemId="item-1"
        question={question}
        state={initialQuestionState()}
        onAnswerChange={() => undefined}
        onCheck={() => undefined}
        onHint={() => undefined}
      />,
    );

    expect(html).toContain('Détermine l’étendue de cette série.');
    expect(html).toContain('Vérifier ma réponse');
    expect(html).toContain('Indice');
    expect(html).not.toContain('18.2');
    expect(html).not.toContain('18,2');
    expect(html).not.toContain('Réponse attendue');
    expect(html).not.toContain('Voir la correction');
  });

  it('does not reveal a solution when feedback is visible', () => {
    const html = renderToStaticMarkup(
      <TrainingQuestionBlock
        itemId="item-1"
        question={question}
        state={{ ...initialQuestionState(), answer: '17', is_correct: false, feedback: 'Tu es proche.' }}
        onAnswerChange={() => undefined}
        onCheck={() => undefined}
        onHint={() => undefined}
      />,
    );

    expect(html).toContain('Tu es proche.');
    expect(html).not.toContain('22,6 - 4,4');
    expect(html).not.toContain('18,2');
  });

  it('renders multiple choice training items as radio choices', () => {
    const html = renderToStaticMarkup(
      <TrainingQuestionBlock
        itemId="item-qcm"
        question={{
          id: 'q5',
          label: '5.',
          prompt: 'Le pourcentage arrondi à l’unité est-il de 7 %, 10 % ou 13 % ?',
          answer_type: 'multiple_choice',
          choices: ['7 %', '10 %', '13 %'],
          expected_answer: '10 %',
          guidance: {
            hints: [],
            correct_feedback: 'Bonne réponse.',
            almost_feedback: 'Tu es proche.',
            incorrect_feedback: 'Relis la question.',
          },
        }}
        state={initialQuestionState()}
        onAnswerChange={() => undefined}
        onCheck={() => undefined}
        onHint={() => undefined}
      />,
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('7 %');
    expect(html).toContain('10 %');
    expect(html).toContain('13 %');
    expect(html).not.toContain('Réponse attendue');
  });

  it('does not persist answers in admin preview mode', () => {
    expect(shouldPersistTrainingAnswer(true)).toBe(false);
    expect(shouldPersistTrainingAnswer(false)).toBe(true);
  });
});
