import { describe, expect, it } from 'vitest';
import {
  detectQcmChoices,
  resolveTrainingItemLevel,
  splitQuestionIntoTrainingQuestions,
} from './generate-training-items';

describe('generate-training-items question normalization', () => {
  it('splits lettered subquestions into separate training questions', () => {
    const questions = splitQuestionIntoTrainingQuestions({
      id: '3',
      label: '3.',
      text: '3. a) Calculer la moyenne. b) Déterminer l’étendue. c) Interpréter le résultat.',
      answer_type: 'free_text',
    });

    expect(questions).toHaveLength(3);
    expect(questions.map((question) => question.id)).toEqual(['3-a', '3-b', '3-c']);
    expect(questions.map((question) => question.label)).toEqual(['a.', 'b.', 'c.']);
    expect(questions[0].text).toBe('Calculer la moyenne.');
    expect(questions[1].text).toBe('Déterminer l’étendue.');
    expect(questions[2].text).toBe('Interpréter le résultat.');
  });

  it('detects QCM answer choices labelled Réponse A/B/C', () => {
    const choices = detectQcmChoices(
      'À quel événement correspond une probabilité de 7/16 ? Réponse A Obtenir un jeton de couleur rouge ou jaune. Réponse B Obtenir un jeton qui n’est pas vert. Réponse C Obtenir un jeton vert.',
    );

    expect(choices).toEqual([
      'Obtenir un jeton de couleur rouge ou jaune.',
      'Obtenir un jeton qui n’est pas vert.',
      'Obtenir un jeton vert.',
    ]);
  });

  it('marks a QCM question with choices after normalization', () => {
    const questions = splitQuestionIntoTrainingQuestions({
      id: '5',
      label: '5.',
      text: 'QCM : choisir la bonne réponse. Réponse A 7 % Réponse B 10 % Réponse C 13 %',
      answer_type: 'multiple_choice',
    });

    expect(questions).toHaveLength(1);
    expect(questions[0].choices).toEqual(['7 %', '10 %', '13 %']);
  });

  it('propagates the paper level to generated DNB training items', () => {
    expect(resolveTrainingItemLevel({ exam: 'dnb' }, { exam: 'dnb', level: '3eme' })).toBe('3eme');
  });

  it('falls back to DNB level when the source paper has no level yet', () => {
    expect(resolveTrainingItemLevel({ exam: 'dnb' }, { exam: 'dnb', level: null })).toBe('3eme');
  });
});
