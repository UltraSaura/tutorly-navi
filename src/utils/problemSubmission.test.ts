import { describe, expect, it } from 'vitest';
import { applyGroupedAnswers, cleanGroupedProblemDisplayText, __problemSubmissionTest } from './problemSubmission';

const geometryProblemText = `
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

describe('problemSubmission grouped multi-part parsing', () => {
  it('creates one grouped problem with a Partie A section and four rows', () => {
    const problem = __problemSubmissionTest.createProblemSubmissionFromText({
      rawText: geometryProblemText,
      attachments: [],
      extractedText: geometryProblemText,
    });

    expect(problem.type).toBe('grouped_problem');
    expect(problem.title).toBe('Exercice 3 : (20 points)');
    expect(problem.sections).toHaveLength(1);
    expect(problem.sections[0].title).toBe('PARTIE A : Dans cette partie, x = 1,5 cm.');
    expect(problem.sections[0].rows).toHaveLength(4);
    expect(problem.sections[0].rows[0].rowKind).toBe('calculation');
    expect(problem.sections[0].rows[2].rowKind).toBe('construction');
    expect(problem.sharedContext).toContain('rectangle ABCD');
    expect(problem.sharedContext).not.toContain('PARTIE A');
  });

  it('cleans markdown, math delimiters, image placeholders, and repeated OCR blocks', () => {
    const repeatedOcrText = `
# Exercice 3 : (20 points)
Dans cet exercice, toutes les longueurs sont exprimées en cm.
On considère :
- le rectangle ABCD tel que $AD = x$ et $AB = 16 - 2x$ ;
- Le carré EFGH tel que $EF = 2x$.
![img-0.jpeg](img-0.jpeg)
![img-1.jpeg](img-1.jpeg)
**PARTIE A** : Dans cette partie, $x = 1,5$ cm.

# Exercice 3 : (20 points)
Dans cet exercice, toutes les longueurs sont exprimées en cm.
On considère :
- le rectangle ABCD tel que $AD = x$ et $AB = 16 - 2x$ ;
- Le carré EFGH tel que $EF = 2x$.
![img-0.jpeg](img-0.jpeg)
![img-1.jpeg](img-1.jpeg)
**PARTIE A** : Dans cette partie, $x = 1,5$ cm.
1) Calculer le périmètre du carré EFGH.
2) Calculer AB.
3) Construire en vraie grandeur le rectangle ABCD.
4) Les périmètres de ABCD et EFGH sont-ils égaux ?
`;

    const problem = __problemSubmissionTest.createProblemSubmissionFromText({
      rawText: repeatedOcrText,
      attachments: [],
      extractedText: repeatedOcrText,
    });

    expect(problem.sharedContext).toContain('AD = x');
    expect(problem.sharedContext).toContain('AB = 16 - 2x');
    expect(problem.sharedContext).toContain('EF = 2x');
    expect(problem.sharedContext).not.toContain('$');
    expect(problem.sharedContext).not.toContain('![img');
    expect(problem.sharedContext).not.toContain('1) Calculer');
    expect(problem.sections).toHaveLength(1);
    expect(problem.sections[0].context).toBe('PARTIE A : Dans cette partie, x = 1,5 cm.');
    expect(problem.sections[0].rows.map(row => row.prompt)).toEqual([
      'Calculer le périmètre du carré EFGH.',
      'Calculer AB.',
      'Construire en vraie grandeur le rectangle ABCD.',
      'Les périmètres de ABCD et EFGH sont-ils égaux ?',
    ]);
  });

  it('removes inline math delimiters while preserving math text', () => {
    expect(cleanGroupedProblemDisplayText('$AD = x$ et $AB = 16 - 2x$')).toBe('AD = x et AB = 16 - 2x');
  });

  it('applies mixed text answers and construction attachments in one payload', () => {
    const problem = __problemSubmissionTest.createProblemSubmissionFromText({
      rawText: geometryProblemText,
      attachments: [],
      extractedText: geometryProblemText,
    });

    const answered = applyGroupedAnswers(problem, {
      problemId: problem.id,
      answers: [
        {
          rowId: problem.sections[0].rows[0].id,
          label: '1',
          selected: true,
          answer: '12 cm',
        },
        {
          rowId: problem.sections[0].rows[2].id,
          label: '3',
          selected: true,
          answer: 'Rectangle construit en vraie grandeur.',
          justificationAttachments: [{
            id: 'attachment-1',
            type: 'image',
            filename: 'construction.jpg',
            uploadedAt: '2026-05-01T00:00:00.000Z',
            extractionStatus: 'extracted',
            extractedText: 'Rectangle ABCD, AD = 1,5 cm, AB = 13 cm.',
          }],
        },
      ],
    });

    expect(answered.status).toBe('evaluating');
    expect(answered.sections[0].rows[0].studentAnswer).toBe('12 cm');
    expect(answered.sections[0].rows[2].studentAnswer).toContain('Rectangle construit');
    expect(answered.sections[0].rows[2].justificationAttachments?.[0].extractedText).toContain('AB = 13 cm');
    expect(answered.sections[0].rows[1].doNotGrade).toBe(true);
  });

  it('preserves untouched correct rows during retry and clears only retried row evaluation', () => {
    const problem = __problemSubmissionTest.createProblemSubmissionFromText({
      rawText: geometryProblemText,
      attachments: [],
      extractedText: geometryProblemText,
    });
    const correctRowId = problem.sections[0].rows[0].id;
    const retryRowId = problem.sections[0].rows[1].id;
    const evaluated = {
      ...problem,
      status: 'evaluated' as const,
      sections: [{
        ...problem.sections[0],
        rows: problem.sections[0].rows.map(row => row.id === correctRowId
          ? {
              ...row,
              selected: true,
              studentAnswer: '12 cm',
              evaluation: {
                selectedAnswer: '12 cm',
                correctAnswer: '12 cm',
                isCorrect: true,
                justificationProvided: true,
                justificationSufficient: true,
                status: 'correct' as const,
              },
            }
          : row.id === retryRowId
            ? {
                ...row,
                selected: true,
                studentAnswer: '12 cm',
                evaluation: {
                  selectedAnswer: '12 cm',
                  correctAnswer: '13 cm',
                  isCorrect: false,
                  justificationProvided: true,
                  status: 'incorrect' as const,
                },
              }
            : row),
      }],
    };

    const retried = applyGroupedAnswers(evaluated, {
      problemId: evaluated.id,
      isRetry: true,
      retryRowIds: [retryRowId],
      answers: [{
        rowId: retryRowId,
        label: '2',
        selected: true,
        answer: '13 cm',
      }],
    });

    const correctRow = retried.sections[0].rows.find(row => row.id === correctRowId);
    const retryRow = retried.sections[0].rows.find(row => row.id === retryRowId);
    expect(correctRow?.studentAnswer).toBe('12 cm');
    expect(correctRow?.evaluation?.status).toBe('correct');
    expect(retryRow?.studentAnswer).toBe('13 cm');
    expect(retryRow?.evaluation).toBeUndefined();
  });
});
