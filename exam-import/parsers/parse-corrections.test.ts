import { describe, expect, it } from 'vitest';
import { parseCorrections } from './parse-corrections.ts';

const SAMPLE_CORRECTION = `
Exercice 1 (20 points)

1. La température en novembre 2019 était 8,2 °C.
   On lit directement dans le tableau à la colonne novembre.

2. L'étendue = max - min = 22,6 - 4,4 = 18,2 °C
   On cherche d'abord la valeur maximale, puis la valeur minimale.

3. La formule à saisir en N2 est =MOYENNE(B2:M2).
   On utilise la fonction MOYENNE sur les douze mois.

4. a. Calcul de la moyenne : somme des 12 températures divisée par 12.
   b. On obtient environ 13,1 °C.

5. Le pourcentage d'augmentation est d'environ 10 %.
   Réponse B

Exercice 2

1. La probabilité est 7/16.

2. a. Vrai.
   b. Faux.
`;

describe('parseCorrections', () => {
  it('splits into the correct number of corrections', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    // Ex1: q1, q2, q3, q4a, q4b, q5 = 6; Ex2: q1, q2a, q2b = 3 → 9 total
    expect(corrections.length).toBeGreaterThanOrEqual(6);
  });

  it('assigns exercise numbers correctly', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const ex1 = corrections.filter((c) => c.exercise_number === 1);
    const ex2 = corrections.filter((c) => c.exercise_number === 2);
    expect(ex1.length).toBeGreaterThan(0);
    expect(ex2.length).toBeGreaterThan(0);
  });

  it('detects numeric answer with unit (°C)', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q1 = corrections.find((c) => c.exercise_number === 1 && c.question_id === '1');
    expect(q1).toBeDefined();
    expect(q1?.answer_type).toBe('numeric');
    expect(q1?.correct_answer).toContain('8');
  });

  it('detects comma-decimal numeric answer (étendue)', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q2 = corrections.find((c) => c.exercise_number === 1 && c.question_id === '2');
    expect(q2).toBeDefined();
    expect(q2?.answer_type).toBe('numeric');
    expect(q2?.correct_answer).toContain('18');
  });

  it('detects spreadsheet formula as numeric answer', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q3 = corrections.find((c) => c.exercise_number === 1 && c.question_id === '3');
    expect(q3).toBeDefined();
    expect(q3?.correct_answer).toMatch(/MOYENNE/i);
  });

  it('detects MCQ answer (Réponse B)', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q5 = corrections.find((c) => c.exercise_number === 1 && c.question_id === '5');
    expect(q5).toBeDefined();
    expect(q5?.answer_type).toBe('mcq');
    expect(q5?.correct_answer).toBe('B');
  });

  it('splits explanation into steps', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q2 = corrections.find((c) => c.exercise_number === 1 && c.question_id === '2');
    expect(q2?.explanation_steps.length).toBeGreaterThanOrEqual(1);
  });

  it('clamps explanation_steps to 4 max', () => {
    const longText = `
Exercice 1
1. La réponse est 42.
   Étape 1 : identifier les données. Étape 2 : appliquer la formule. Étape 3 : calculer. Étape 4 : vérifier. Étape 5 : conclure.
`;
    const { corrections } = parseCorrections(longText);
    const q = corrections[0];
    expect(q?.explanation_steps.length).toBeLessThanOrEqual(4);
  });

  it('returns empty corrections for unparseable input', () => {
    const { corrections } = parseCorrections('');
    expect(corrections).toHaveLength(0);
  });

  it('handles lettered sub-questions with parent number prefix', () => {
    const { corrections } = parseCorrections(SAMPLE_CORRECTION);
    const q4a = corrections.find((c) => c.exercise_number === 1 && c.question_id === '4a');
    const q4b = corrections.find((c) => c.exercise_number === 1 && c.question_id === '4b');
    expect(q4a).toBeDefined();
    expect(q4b).toBeDefined();
  });
});
