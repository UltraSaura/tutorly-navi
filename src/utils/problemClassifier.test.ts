import { describe, expect, it } from 'vitest';
import { classifyProblemSubmission } from './problemClassifier';

const trueFalseProblem = `
Exercice 1
Pour chaque affirmation, dire si elle est vraie ou fausse. Chaque réponse doit être justifiée.
Affirmation A : La moyenne des prix est 11,40 €.
Affirmation B : La médiane des prix est 10 €.
`;

describe('classifyProblemSubmission', () => {
  it('classifies French true/false assertions as grouped choice', () => {
    expect(classifyProblemSubmission(trueFalseProblem).type).toBe('grouped_choice_problem');
  });

  it('keeps short arithmetic in the simple exercise flow', () => {
    expect(classifyProblemSubmission('2+2=4').type).toBe('simple_exercise');
  });

  it('keeps French simple PPCM in the simple exercise flow', () => {
    expect(classifyProblemSubmission('calcul le ppcm de 30 et 12 est 60').type).toBe('simple_exercise');
  });

  it('classifies French geometry multi-part problems as grouped problems', () => {
    const text = `
Exercice 3 : (20 points)
Dans cet exercice, toutes les longueurs sont exprimées en cm.
On considère :
- le rectangle ABCD tel que AD = x et AB = 16 - 2x ;
- Le carré EFGH tel que EF = 2x.

PARTIE A : Dans cette partie, x = 1,5 cm.
1) Calculer le périmètre du carré EFGH.
2) Calculer AB.
3) Construire en vraie grandeur le rectangle ABCD.
4) Les périmètres de ABCD et EFGH sont-ils égaux ?
`;

    expect(classifyProblemSubmission(text, { hasAttachments: true }).type).toBe('grouped_problem');
  });

  it('classifies multi-equation contextual text as complex', () => {
    const text = `
Un train parcourt une distance pendant plusieurs étapes.
1) On sait que d = v × t et que v = 80 km/h.
2) Ensuite, on utilise t = d / v pour une deuxième étape.
3) Explique les résultats obtenus.
`;

    expect(classifyProblemSubmission(text).type).toBe('complex_problem');
  });

  it('classifies QCM text as grouped choice', () => {
    const text = `
QCM : choisir la bonne réponse.
1) Quelle est la valeur de 2+2 ? A. 3 B. 4 C. 5 D. 6
2) Quelle est la valeur de 3+3 ? A. 5 B. 6 C. 7 D. 8
`;

    expect(classifyProblemSubmission(text).type).toBe('grouped_choice_problem');
  });
});
