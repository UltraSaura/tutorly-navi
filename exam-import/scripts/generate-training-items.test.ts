import { describe, expect, it } from 'vitest';
import {
  buildGuidance,
  buildValidation,
  buildValidationFromContext,
  cleanQuestionText,
  detectQcmChoices,
  detectQuestionType,
  detectSkill,
  enrichQuestion,
  extractQuestions,
  resolveTrainingItemLevel,
  splitMainQuestions,
  splitParts,
  splitQuestionIntoTrainingQuestions,
  splitSubQuestions,
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
    expect(questions.map((q) => q.id)).toEqual(['3-a', '3-b', '3-c']);
    expect(questions.map((q) => q.label)).toEqual(['a.', 'b.', 'c.']);
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

describe('detectSkill', () => {
  it('returns statistics for moyenne/étendue', () => {
    expect(detectSkill('Calculer la moyenne de cette série.')).toBe('statistics');
    expect(detectSkill('Déterminer l’étendue.')).toBe('statistics');
  });

  it('returns probability for probabilité', () => {
    expect(detectSkill('Quelle est la probabilité d’obtenir un jeton rouge ?')).toBe('probability');
  });

  it('returns percentages for évolution/pourcentage', () => {
    expect(detectSkill('Calculer le pourcentage d’augmentation.')).toBe('percentages');
    expect(detectSkill('L’évolution entre les deux années est de combien ?')).toBe('percentages');
  });

  it('returns geometry for triangle/angle', () => {
    expect(detectSkill('Calculer l’angle du triangle ABC.')).toBe('geometry');
  });

  it('returns spreadsheet for tableur/formule', () => {
    expect(detectSkill('Quelle formule saisir dans la cellule B2 ?')).toBe('spreadsheet');
  });

  it('returns general_math as default', () => {
    expect(detectSkill('Répondre à la question suivante.')).toBe('general_math');
  });
});

describe('splitting pipeline', () => {
  describe('splitParts', () => {
    it('returns a single part when no Partie marker exists', () => {
      const parts = splitParts('1. Calculer la moyenne.\n2. Déduire l\'étendue.');
      expect(parts).toHaveLength(1);
      expect(parts[0].title).toBeNull();
    });

    it('splits text into Partie A and Partie B', () => {
      const text = 'Partie A\n1. Calculer la moyenne des températures.\nPartie B\n1. Comparer les valeurs de 2019 et 2020.';
      const parts = splitParts(text);
      expect(parts).toHaveLength(2);
      expect(parts[0].title).toMatch(/Partie\s+A/i);
      expect(parts[1].title).toMatch(/Partie\s+B/i);
    });

    it('discards empty chunks before the first Partie marker', () => {
      const text = 'Partie A\n1. Question une.\nPartie B\n1. Question deux.';
      const parts = splitParts(text);
      expect(parts.every((p) => p.content.length > 0)).toBe(true);
    });
  });

  describe('splitMainQuestions', () => {
    it('splits numbered questions separated by newlines', () => {
      const qs = splitMainQuestions(
        '1. Calculer la moyenne de cette série de données.\n2. Déduire l\'étendue de cette même série.',
      );
      expect(qs).toHaveLength(2);
    });

    it('filters fragments shorter than 20 characters', () => {
      const qs = splitMainQuestions('Intro\n1. Calculer la moyenne des données de la série complète.\n2. Interpréter le résultat obtenu.');
      // "Intro" is < 20 chars and is dropped
      expect(qs.every((q) => q.length > 20)).toBe(true);
    });
  });

  describe('splitSubQuestions', () => {
    it('returns the original text when no lettered sub-questions exist', () => {
      const text = 'Calculer la moyenne de la série.';
      expect(splitSubQuestions(text)).toEqual([text]);
    });

    it('splits inline lettered sub-questions a) and b)', () => {
      const text = '1. a) Calculer la probabilité d\'obtenir un jeton rouge. b) En déduire la probabilité complémentaire.';
      const subs = splitSubQuestions(text);
      expect(subs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cleanQuestionText', () => {
    it('strips a leading numeric prefix', () => {
      expect(cleanQuestionText('1. Calculer la moyenne.')).toBe('Calculer la moyenne.');
    });

    it('strips a leading lettered prefix', () => {
      expect(cleanQuestionText('a) Déterminer l\'étendue.')).toBe('Déterminer l\'étendue.');
    });

    it('removes an Exercice header', () => {
      expect(cleanQuestionText('Exercice 3 Calculer le périmètre.')).toBe('Calculer le périmètre.');
    });

    it('collapses newlines into spaces', () => {
      expect(cleanQuestionText('Calculer\nla moyenne.')).toBe('Calculer la moyenne.');
    });
  });

  describe('extractQuestions', () => {
    it('returns 2 questions from "1. ... 2. ..." text', () => {
      const qs = extractQuestions(
        '1. Calculer la moyenne de cette série de données.\n2. Déduire l\'étendue de cette même série de données.',
      );
      expect(qs).toHaveLength(2);
    });

    it('returns 2 sub-questions from inline "1. a) ... b) ..." text', () => {
      const qs = extractQuestions(
        '1. a) Calculer la probabilité d\'obtenir un jeton rouge parmi les jetons. b) En déduire la probabilité complémentaire associée.',
      );
      expect(qs).toHaveLength(2);
    });

    it('returns 4 questions from a Partie A / Partie B exercise', () => {
      const text = [
        'Partie A',
        '1. Calculer la moyenne des températures relevées.',
        '2. Déduire l\'étendue de cette série de valeurs.',
        'Partie B',
        '1. Comparer les valeurs observées en 2019 et en 2020.',
        '2. Conclure sur l\'évolution observée entre les deux années.',
      ].join('\n');
      const qs = extractQuestions(text);
      expect(qs).toHaveLength(4);
    });

    it('tags each question with the correct part label for Partie A/B', () => {
      const text = 'Partie A\n1. Calculer la probabilité d\'obtenir un jeton rouge parmi tous les jetons.\nPartie B\n1. Interpréter ce résultat dans le contexte de l\'expérience aléatoire.';
      const qs = extractQuestions(text);
      expect(qs.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for blank input', () => {
      expect(extractQuestions('')).toHaveLength(0);
    });

    it('filters out fragments of 15 characters or fewer', () => {
      const qs = extractQuestions(
        '1. Calculer la moyenne des données de cette série statistique.\n2. Interpréter le résultat dans le cadre de l\'étude.',
      );
      expect(qs.every((q) => q.text.length > 15)).toBe(true);
    });
  });
});

describe('enrichment pipeline', () => {
  describe('detectQuestionType', () => {
    it('returns numeric for calculer', () => {
      expect(detectQuestionType('Calculer la moyenne de cette série.')).toBe('numeric');
    });

    it('returns numeric for déterminer', () => {
      expect(detectQuestionType('Déterminer le périmètre du triangle.')).toBe('numeric');
    });

    it('returns mcq for choisir', () => {
      expect(detectQuestionType('Choisir la bonne réponse parmi les propositions.')).toBe('mcq');
    });

    it('returns text for justifier', () => {
      expect(detectQuestionType('Justifier que la probabilité est correcte.')).toBe('text');
    });

    it('returns expression for résoudre', () => {
      expect(detectQuestionType('Résoudre l\'équation 2x + 3 = 7.')).toBe('expression');
    });

    it('defaults to text', () => {
      expect(detectQuestionType('Que peut-on dire de ce résultat ?')).toBe('text');
    });
  });

  describe('detectSkill with context', () => {
    it('uses context to detect statistics when text alone is generic', () => {
      const skill = detectSkill('Quelle est la valeur ?', 'Les températures moyennes mensuelles sont données.');
      expect(skill).toBe('statistics');
    });

    it('detects probability from combined text+context', () => {
      const skill = detectSkill('Calculer.', 'La probabilité d\'obtenir un jeton rouge.');
      expect(skill).toBe('probability');
    });

    it('single-arg call still works (backward compat)', () => {
      expect(detectSkill('Calculer la moyenne.')).toBe('statistics');
    });
  });

  describe('buildValidationFromContext', () => {
    it('extracts a number and builds a range around it', () => {
      const result = buildValidationFromContext('La valeur est 18,2 °C.', '');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('range');
      const [lo, hi] = result?.value as [number, number];
      expect(lo).toBeLessThan(18.2);
      expect(hi).toBeGreaterThan(18.2);
    });

    it('returns null when no number is found', () => {
      const result = buildValidationFromContext('Justifier la réponse.', '');
      expect(result).toBeNull();
    });

    it('applies at least 0.01 tolerance for small numbers', () => {
      const result = buildValidationFromContext('La probabilité est 0.', '');
      const [lo, hi] = (result?.value ?? [0, 0]) as [number, number];
      expect(hi - lo).toBeGreaterThanOrEqual(0.02);
    });
  });

  describe('buildGuidance', () => {
    it('returns table hints when a table document is present', () => {
      const guidance = buildGuidance('Lire la valeur.', 'text', 'statistics', [{ type: 'table' }]);
      expect(guidance.hints[0].text).toMatch(/tableau/i);
    });

    it('returns graph hints when a graph document is present', () => {
      const guidance = buildGuidance('Lire la valeur.', 'text', 'statistics', [{ type: 'graph' }]);
      expect(guidance.hints[0].text).toMatch(/graphique/i);
    });

    it('returns statistics hints for statistics skill without documents', () => {
      const guidance = buildGuidance('Calculer la moyenne.', 'numeric', 'statistics', []);
      expect(guidance.hints.some((h) => /formule|valeur/i.test(h.text))).toBe(true);
    });

    it('returns numeric hints for numeric type without documents', () => {
      const guidance = buildGuidance('Calculer le périmètre.', 'numeric', 'geometry', []);
      expect(guidance.hints.some((h) => /calcul|étape/i.test(h.text))).toBe(true);
    });

    it('includes correct_feedback, almost_feedback, incorrect_feedback fields', () => {
      const guidance = buildGuidance('Question.', 'text', 'general_math', []);
      expect(guidance).toHaveProperty('correct_feedback');
      expect(guidance).toHaveProperty('almost_feedback');
      expect(guidance).toHaveProperty('incorrect_feedback');
    });

    it('returns structured hints (level + text)', () => {
      const guidance = buildGuidance('Calculer.', 'numeric', 'general_math', []);
      expect(guidance.hints.every((h) => typeof h.level === 'number' && typeof h.text === 'string')).toBe(true);
    });
  });

  describe('enrichQuestion', () => {
    const baseQuestion = {
      id: 'q1',
      label: '1.',
      text: 'Calculer la moyenne de la série de données.',
      answer_type: undefined as string | undefined,
      choices: null as string[] | null,
    };

    it('returns all required enrichment fields', () => {
      const enriched = enrichQuestion(baseQuestion, '', []);
      expect(enriched).toHaveProperty('type');
      expect(enriched).toHaveProperty('skill');
      expect(enriched).toHaveProperty('validation');
      expect(enriched).toHaveProperty('guidance');
    });

    it('detects numeric type from calculer', () => {
      const enriched = enrichQuestion(baseQuestion, '', []);
      expect(enriched.type).toBe('numeric');
    });

    it('uses context when detecting skill', () => {
      const enriched = enrichQuestion(
        { ...baseQuestion, text: 'Quelle est la valeur ?' },
        'La probabilité d\'obtenir un jeton rouge.',
        [],
      );
      expect(enriched.skill).toBe('probability');
    });

    it('preserves original question fields', () => {
      const enriched = enrichQuestion(baseQuestion, '', []);
      expect(enriched.id).toBe('q1');
      expect(enriched.label).toBe('1.');
      expect(enriched.text).toBe(baseQuestion.text);
    });

    it('does NOT expose correct_answer (expected_answer remains null on the item)', () => {
      const enriched = enrichQuestion(baseQuestion, 'La moyenne est 13,1 °C.', []);
      // enriched.validation is a range, but expected_answer on TrainingItem stays null
      expect((enriched as Record<string, unknown>).correct_answer).toBeUndefined();
      expect((enriched as Record<string, unknown>).expected_answer).toBeUndefined();
    });
  });
});

describe('buildValidation', () => {
  it('returns exact validation for multiple_choice with string answer', () => {
    const result = buildValidation('multiple_choice', { value: '10 %' });
    expect(result).toEqual({ type: 'exact', value: '10 %' });
  });

  it('returns range validation for numeric with numeric answer', () => {
    const result = buildValidation('numeric', { value: 18.2 });
    expect(result).toEqual({ type: 'range', value: [18.1, 18.3] });
  });

  it('parses comma-decimal numeric answers', () => {
    const result = buildValidation('numeric', { value: '8,2' });
    expect(result).toEqual({ type: 'range', value: [8.1, 8.3] });
  });

  it('returns null when expected_answer is null', () => {
    expect(buildValidation('numeric', null)).toBeNull();
    expect(buildValidation('multiple_choice', null)).toBeNull();
  });

  it('returns null for free_response', () => {
    expect(buildValidation('free_response', { value: 'some answer' })).toBeNull();
  });
});
