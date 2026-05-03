import { describe, expect, it } from 'vitest';
import { extractTrueFalseGroupedProblem } from './trueFalseExtraction';

const worksheetText = `
Exercice 1 : (20 points)
Voici cinq affirmations. Pour chacune d'entre elles, dire si elle est vraie ou fausse.
On rappelle que chaque réponse doit être justifiée.

1) Voici les prix en euros d'un vêtement relevés dans différents magasins.
12 ; 15 ; 10 ; 7 ; 13

Affirmation A : La moyenne des prix est 11,40 €.

Affirmation B : La médiane des prix est 10 €.
`;

describe('extractTrueFalseGroupedProblem', () => {
  it('extracts one grouped true/false problem with affirmation rows', () => {
    const problem = extractTrueFalseGroupedProblem(worksheetText);

    expect(problem).toMatchObject({
      responseType: 'grouped_choice_problem',
      answerType: 'true_false',
      requiresJustification: true,
      keepGrouped: true,
    });
    expect(problem?.sections).toHaveLength(1);
    expect(problem?.sections[0].rows).toHaveLength(2);
    expect(problem?.sections[0].rows.map(row => row.label)).toEqual(['A', 'B']);
  });

  it('keeps printed values in the question instead of using them as answers', () => {
    const problem = extractTrueFalseGroupedProblem(worksheetText);
    const [affirmationA, affirmationB] = problem?.sections[0].rows || [];

    expect(affirmationA.label).toBe('A');
    expect(affirmationA.prompt).toContain('11,40 €');
    expect((affirmationA as any).answer).toBeUndefined();

    expect(affirmationB.label).toBe('B');
    expect(affirmationB.prompt).toContain('10 €');
    expect((affirmationB as any).answer).toBeUndefined();
  });

  it('includes shared data context once on the parent section', () => {
    const problem = extractTrueFalseGroupedProblem(worksheetText);

    expect(problem?.sections[0].context).toContain("Voici les prix en euros d'un vêtement");
    expect(problem?.sections[0].context).toContain('12 ; 15 ; 10 ; 7 ; 13');
  });
});
