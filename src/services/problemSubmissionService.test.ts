import { describe, expect, it } from 'vitest';
import { ProblemSubmission } from '@/types/chat';
import { __problemSubmissionServiceTest } from './problemSubmissionService';
import { applyGroupedAnswers } from '@/utils/problemSubmission';

const baseProblem: ProblemSubmission = {
  id: 'problem-1',
  submissionId: 'submission-1',
  type: 'grouped_choice_problem',
  rawText: 'Pour chaque affirmation, dire si elle est vraie ou fausse.',
  attachments: [],
  title: 'Exercice 1',
  instructions: 'Dire si chaque affirmation est vraie ou fausse.',
  answerType: 'true_false',
  requiresJustification: true,
  sections: [{
    id: 'section-1',
    context: '12 ; 15 ; 10 ; 7 ; 13',
    rows: [{
      id: 'row-A',
      label: 'A',
      prompt: 'La moyenne des prix est 11,40 €.',
      answerType: 'true_false',
      options: ['Vrai', 'Faux'],
      selected: true,
      selectedOption: 'Vrai',
      justification: 'La moyenne est 11,4.',
      requiresJustification: true,
    }],
  }],
  status: 'evaluating',
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
  keepGrouped: true,
};

const geometryRawText = `Exercice 3 : (20 points)
Dans cet exercice, toutes les longueurs sont exprimées en cm.
On considère :
- le rectangle ABCD tel que AD = x et AB = 16 - 2x ;
- Le carré EFGH tel que EF = 2x.

PARTIE A : Dans cette partie, x = 1,5 cm.
1) Calculer le périmètre du carré EFGH.
2) Calculer AB.
3) Construire en vraie grandeur le rectangle ABCD.
4) Les périmètres de ABCD et EFGH sont-ils égaux ?`;

function geometryGroupedProblem(rows: ProblemSubmission['sections'][number]['rows']): ProblemSubmission {
  return {
    id: 'problem-geometry',
    submissionId: 'submission-geometry',
    type: 'grouped_problem',
    rawText: geometryRawText,
    attachments: [],
    title: 'Exercice 3',
    statement: geometryRawText,
    sharedContext: `Dans cet exercice, toutes les longueurs sont exprimées en cm.
On considère :
- le rectangle ABCD tel que AD = x et AB = 16 - 2x ;
- Le carré EFGH tel que EF = 2x.`,
    answerType: 'text',
    sections: [{
      id: 'section-A',
      title: 'PARTIE A',
      context: 'PARTIE A : Dans cette partie, x = 1,5 cm.',
      rows,
    }],
    status: 'evaluating',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    keepGrouped: true,
  };
}

describe('problemSubmissionService grouped grading errors', () => {
  it('uses one grouped grading prompt for grouped choice and multipart rows', () => {
    const prompt = __problemSubmissionServiceTest.groupedProblemGradingPrompt;

    expect(prompt).toContain('grouped_choice_problem');
    expect(prompt).toContain('grouped_problem');
    expect(prompt).toContain('calculation/text rows');
    expect(prompt).toContain('symbolic geometry rows');
    expect(prompt).toContain('Do not evaluate, mention, correct, reveal, or explain unsubmitted/unselected rows');
    expect(prompt).not.toContain('grouped multi-part homework problem');
  });

  it('keeps grouped problem extraction as a separate prompt stage', () => {
    const prompt = __problemSubmissionServiceTest.groupedProblemExtractionPrompt;

    expect(prompt).toContain('extracting a complete homework problem');
    expect(prompt).toContain('Preserve the original grouped structure');
    expect(prompt).toContain('grouped_choice_problem|grouped_problem');
    expect(prompt).toContain('rowKind');
  });

  it('returns an editable error-state problem while preserving answers', () => {
    const result = __problemSubmissionServiceTest.groupedGradingError(baseProblem, 'Timed out');

    expect(result.status).toBe('error');
    expect(result.error).toBe('Timed out');
    expect(result.sections[0].rows[0].selectedOption).toBe('Vrai');
    expect(result.sections[0].rows[0].justification).toBe('La moyenne est 11,4.');
  });

  it('treats malformed plain text grading as an error', () => {
    const parsed = __problemSubmissionServiceTest.extractJsonObject('CORRECT');
    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(baseProblem, parsed, 'en');

    expect(result.status).toBe('error');
    expect(result.error).toContain('usable grouped correction');
    expect(result.sections[0].rows[0].selectedOption).toBe('Vrai');
  });

  it('treats empty parsed grading as an error', () => {
    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(baseProblem, {}, 'en');

    expect(result.status).toBe('error');
    expect(result.sections[0].rows[0].selectedOption).toBe('Vrai');
  });

  it('applies valid grouped row evaluations as evaluated', () => {
    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(baseProblem, {
      status: 'evaluated',
      overallFeedback: 'Bon travail.',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Vrai',
            correctAnswer: 'Vrai',
            isCorrect: true,
            justificationProvided: true,
            justificationSufficient: true,
            status: 'correct',
            feedback: 'Correct.',
            explanation: 'La moyenne vaut bien 11,4.',
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('evaluated');
    expect(result.overallFeedback).toBe('Bon travail.');
    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.correctAnswer).toBe('Vrai');
  });

  it('preserves extracted justification attachment text in selected row payloads', () => {
    const result = applyGroupedAnswers(baseProblem, {
      problemId: baseProblem.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'work.jpg',
          uploadedAt: '2026-04-30T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '12 + 15 + 10 + 7 + 13 = 57\n57 / 5 = 11.40',
        }],
      }],
    });

    const attachment = result.sections[0].rows[0].justificationAttachments?.[0];
    expect(result.sections[0].rows[0].selected).toBe(true);
    expect(attachment?.extractionStatus).toBe('extracted');
    expect(attachment?.extractedText).toContain('57 / 5 = 11.40');
  });

  it('accepts a valid evaluation when justification came from extracted attachment text', () => {
    const problemWithAttachment = applyGroupedAnswers(baseProblem, {
      problemId: baseProblem.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'work.jpg',
          uploadedAt: '2026-04-30T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '12 + 15 + 10 + 7 + 13 = 57\n57 / 5 = 11.40',
        }],
      }],
    });

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problemWithAttachment, {
      status: 'evaluated',
      overallFeedback: 'La ligne sélectionnée est correcte.',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Sélectionnée',
            correctAnswer: 'Sélectionner cette affirmation',
            isCorrect: true,
            justificationProvided: true,
            justificationSufficient: true,
            status: 'correct',
            feedback: 'Correct : ton calcul montre que la moyenne est 11,40.',
            explanation: 'La somme vaut 57 et 57 divisé par 5 vaut 11,40.',
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('evaluated');
    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.justificationProvided).toBe(true);
  });

  it('builds grouped grading context with original row data separate from student OCR evidence', () => {
    const problemWithMisreadOcr = applyGroupedAnswers(baseProblem, {
      problemId: baseProblem.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'work.jpg',
          uploadedAt: '2026-04-30T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '18 + 23 + 10 + 7 + 13 = 53\n53 / 5 = 11.40',
        }],
      }],
    });

    const context = __problemSubmissionServiceTest.buildGroupedGradingContext(problemWithMisreadOcr);

    expect(context.originalProblemContext.selectedRows[0].originalSectionContext).toBe('12 ; 15 ; 10 ; 7 ; 13');
    expect(context.originalProblemContext.selectedRows[0].originalAssertion).toBe('La moyenne des prix est 11,40 €.');
    expect(JSON.stringify(context.originalProblemContext)).not.toContain('18 + 23');
    expect(JSON.stringify(context.studentAnswerEvidence)).toContain('18 + 23');
  });

  it('does not let OCR justification numbers override a true original mean assertion', () => {
    const problemWithMisreadOcr = applyGroupedAnswers(baseProblem, {
      problemId: baseProblem.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'work.jpg',
          uploadedAt: '2026-04-30T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '18 + 23 + 10 + 7 + 13 = 53\n53 / 5 = 11.40',
        }],
      }],
    });

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problemWithMisreadOcr, {
      status: 'evaluated',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Sélectionnée',
            correctAnswer: 'Ne pas sélectionner',
            isCorrect: false,
            justificationProvided: true,
            justificationSufficient: false,
            status: 'incorrect',
            feedback: 'L’affirmation est fausse car la moyenne est 14,20.',
            explanation: 'Somme = 18+23+10+7+13 = 71.',
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('evaluated');
    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.isCorrect).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.feedback).toContain('données originales');
  });

  it('uses raw problem text when section context is generic', () => {
    const problemWithGenericSection: ProblemSubmission = {
      ...baseProblem,
      rawText: `Exercice 1
Les prix sont : 12 ; 15 ; 10 ; 7 ; 13.
Affirmation A : La moyenne des prix est 11,40 €.`,
      sharedContext: undefined,
      statement: 'Les prix sont : 12 ; 15 ; 10 ; 7 ; 13.',
      sections: [{
        id: 'section-1',
        title: 'Affirmations',
        context: 'Affirmations',
        rows: [{
          ...baseProblem.sections[0].rows[0],
          relatedContext: undefined,
        }],
      }],
    };

    const answeredProblem = applyGroupedAnswers(problemWithGenericSection, {
      problemId: problemWithGenericSection.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'Response detail Problem 1.jpg',
          uploadedAt: '2026-05-01T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '18 + 23 + 10 + 7 + 13 : 53 =\n53 : 5 = 11.40',
        }],
      }],
    });

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(answeredProblem, {
      status: 'evaluated',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Sélectionnée',
            correctAnswer: 'Ne pas sélectionner',
            isCorrect: false,
            justificationProvided: true,
            justificationSufficient: false,
            status: 'incorrect',
            feedback: "L'affirmation est fausse. La justification contient des erreurs.",
            explanation: "La moyenne des prix donnés dans le problème original n'est pas 11.40 €.",
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('evaluated');
    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.isCorrect).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.explanation).toContain('problème original');
  });

  it('does not claim the original assertion is false when original context is missing and OCR evidence is inconsistent', () => {
    const contextlessProblem = applyGroupedAnswers({
      ...baseProblem,
      rawText: 'Affirmation A : La moyenne des prix est 11,40 €.',
      statement: 'Affirmation A : La moyenne des prix est 11,40 €.',
      sharedContext: undefined,
      sections: [{
        id: 'section-1',
        title: 'Affirmations',
        context: 'Affirmations',
        rows: [{
          ...baseProblem.sections[0].rows[0],
          relatedContext: undefined,
        }],
      }],
    }, {
      problemId: baseProblem.id,
      answers: [{
        rowId: 'row-A',
        label: 'A',
        selected: true,
        selectedOption: 'selected',
        doNotGrade: false,
        justification: '',
        justificationAttachments: [{
          id: 'attachment-1',
          type: 'image',
          filename: 'work.jpg',
          uploadedAt: '2026-05-01T00:00:00.000Z',
          extractionStatus: 'extracted',
          extractedText: '18 + 23 + 10 + 7 + 13 : 53 =\n53 : 5 = 11.40',
        }],
      }],
    });

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(contextlessProblem, {
      status: 'evaluated',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Sélectionnée',
            correctAnswer: 'Ne pas sélectionner',
            isCorrect: false,
            justificationProvided: true,
            justificationSufficient: false,
            status: 'incorrect',
            feedback: "L'affirmation est fausse.",
            explanation: "La moyenne des prix donnés dans le problème original n'est pas 11.40 €.",
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('evaluated');
    expect(result.sections[0].rows[0].evaluation?.status).toBe('partial');
    expect(result.sections[0].rows[0].evaluation?.feedback).not.toContain('fausse');
    expect(result.sections[0].rows[0].evaluation?.explanation).not.toContain("n'est pas 11.40");
  });

  it('merges numeric fallback context when AI extraction returns a generic section', () => {
    const fallbackProblem: ProblemSubmission = {
      ...baseProblem,
      rawText: `Exercice 1
Prix : 12 ; 15 ; 10 ; 7 ; 13.
Affirmation A : La moyenne des prix est 11,40 €.`,
      sharedContext: 'Prix : 12 ; 15 ; 10 ; 7 ; 13.',
      sections: [{
        id: 'fallback-section',
        context: 'Prix : 12 ; 15 ; 10 ; 7 ; 13.',
        rows: [{
          ...baseProblem.sections[0].rows[0],
          relatedContext: 'Prix : 12 ; 15 ; 10 ; 7 ; 13.',
        }],
      }],
    };

    const result = __problemSubmissionServiceTest.mergeExtractedProblem(fallbackProblem, {
      responseType: 'grouped_choice_problem',
      title: 'Affirmations',
      answerType: 'true_false',
      sections: [{
        id: 'section-1',
        title: 'Affirmations',
        context: 'Affirmations',
        rows: [{
          id: 'row-A',
          label: 'A',
          prompt: 'La moyenne des prix est 11,40 €.',
          answerType: 'true_false',
          options: ['Vrai', 'Faux'],
        }],
      }],
    });

    expect(result.sections[0].context).toContain('12 ; 15 ; 10 ; 7 ; 13');
    expect(result.sections[0].rows[0].relatedContext).toContain('12 ; 15 ; 10 ; 7 ; 13');
  });

  it('ignores evaluations for unselected rows', () => {
    const unselectedProblem: ProblemSubmission = {
      ...baseProblem,
      sections: [{
        ...baseProblem.sections[0],
        rows: [{
          ...baseProblem.sections[0].rows[0],
          selected: false,
          selectedOption: undefined,
          doNotGrade: true,
        }],
      }],
    };

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(unselectedProblem, {
      status: 'evaluated',
      sections: [{
        id: 'section-1',
        rows: [{
          id: 'row-A',
          label: 'A',
          evaluation: {
            selectedAnswer: 'Non sélectionnée',
            correctAnswer: 'Vrai',
            isCorrect: false,
            justificationProvided: false,
            status: 'incorrect',
            feedback: 'Should not be shown.',
          },
        }],
      }],
    }, 'fr');

    expect(result.status).toBe('error');
    expect(result.sections[0].rows[0].evaluation).toBeUndefined();
  });

  it('builds retry-practice context from selected evaluated rows only', () => {
    const groupedProblem: ProblemSubmission = {
      ...baseProblem,
      sections: [{
        id: 'section-1',
        context: '12 ; 15 ; 10 ; 7 ; 13',
        rows: [
          {
            ...baseProblem.sections[0].rows[0],
            selected: true,
            selectedOption: 'selected',
            evaluation: {
              selectedAnswer: 'Sélectionnée',
              correctAnswer: 'Sélectionner cette affirmation',
              isCorrect: true,
              justificationProvided: true,
              justificationSufficient: true,
              status: 'correct',
              feedback: 'Correct.',
              explanation: 'La moyenne vaut bien 11,4.',
            },
          },
          {
            id: 'row-B',
            label: 'B',
            prompt: 'La médiane des prix est 10 €.',
            answerType: 'true_false',
            options: ['Vrai', 'Faux'],
            selected: false,
            doNotGrade: true,
            requiresJustification: true,
          },
        ],
      }],
    };

    const context = __problemSubmissionServiceTest.buildGroupedRetryPracticeContext(groupedProblem);

    expect(context.selectedRows).toHaveLength(1);
    expect(context.selectedRows[0].label).toBe('A');
    expect(JSON.stringify(context)).toContain('La moyenne des prix est 11,40 €.');
    expect(JSON.stringify(context)).not.toContain('La médiane des prix est 10 €.');
  });

  it('builds retry-practice context for only the requested grouped row', () => {
    const groupedProblem = geometryGroupedProblem([
      {
        id: 'row-1',
        label: '1',
        prompt: 'Calculer le périmètre du carré EFGH.',
        answerType: 'text',
        rowKind: 'calculation',
        options: [],
        selected: true,
        studentAnswer: '12',
        evaluation: {
          selectedAnswer: '12',
          correctAnswer: '12 cm',
          isCorrect: true,
          justificationProvided: true,
          status: 'correct',
        },
      },
      {
        id: 'row-2',
        label: '2',
        prompt: 'Calculer AB.',
        answerType: 'text',
        rowKind: 'calculation',
        options: [],
        selected: true,
        studentAnswer: '13',
        evaluation: {
          selectedAnswer: '13',
          correctAnswer: '13 cm',
          isCorrect: true,
          justificationProvided: true,
          status: 'correct',
        },
      },
      {
        id: 'row-4',
        label: '4',
        prompt: 'Les périmètres de ABCD et EFGH sont-ils égaux ?',
        answerType: 'text',
        rowKind: 'text',
        options: [],
        selected: true,
        studentAnswer: 'OUI',
        evaluation: {
          selectedAnswer: 'OUI',
          correctAnswer: 'Non',
          isCorrect: false,
          justificationProvided: true,
          status: 'incorrect',
        },
      },
    ]);

    const context = __problemSubmissionServiceTest.buildGroupedRetryPracticeContext(groupedProblem, 'row-1');

    expect(context.requestedRowId).toBe('row-1');
    expect(context.selectedRows).toHaveLength(1);
    expect(context.selectedRows[0].rowId).toBe('row-1');
    expect(JSON.stringify(context)).toContain('Calculer le périmètre du carré EFGH.');
    expect(JSON.stringify(context)).not.toContain('Calculer AB.');
    expect(JSON.stringify(context)).not.toContain('Les périmètres de ABCD et EFGH');
  });

  it('marks geometry retry-practice context as needing a diagram', () => {
    const groupedProblem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '12',
      evaluation: {
        selectedAnswer: '12',
        correctAnswer: '12 cm',
        isCorrect: true,
        justificationProvided: true,
        status: 'correct',
      },
    }]);

    const context = __problemSubmissionServiceTest.buildGroupedRetryPracticeContext(groupedProblem, 'row-1');

    expect(context.wantsDiagram).toBe(true);
  });

  it('does not require a diagram for non-geometry retry-practice context', () => {
    const groupedProblem: ProblemSubmission = {
      ...baseProblem,
      sections: [{
        id: 'section-1',
        context: 'Prix : 12 ; 15 ; 10 ; 7 ; 13.',
        rows: [{
          ...baseProblem.sections[0].rows[0],
          selected: true,
          evaluation: {
            selectedAnswer: 'Sélectionnée',
            correctAnswer: 'Sélectionner cette affirmation',
            isCorrect: true,
            justificationProvided: true,
            status: 'correct',
          },
        }],
      }],
    };

    const context = __problemSubmissionServiceTest.buildGroupedRetryPracticeContext(groupedProblem, 'row-A');

    expect(context.wantsDiagram).toBe(false);
  });

  it('adds profile context to grouped retry-practice requests', () => {
    const groupedProblem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '12',
      evaluation: {
        selectedAnswer: '12',
        correctAnswer: '12 cm',
        isCorrect: true,
        justificationProvided: true,
        status: 'correct',
      },
    }]);

    const context = __problemSubmissionServiceTest.buildGroupedRetryPracticeContext(groupedProblem, 'row-1', {
      responseLanguage: 'French',
      schoolLevel: '6e',
      country: 'France',
      curriculum: 'Programme français',
      learningStyle: 'visual',
    });

    expect(context.profile).toEqual({
      responseLanguage: 'French',
      schoolLevel: '6e',
      country: 'France',
      curriculum: 'Programme français',
      learningStyle: 'visual',
    });
  });

  it('keeps retry-practice prompt teaching-oriented with changed examples and hidden unselected rows', () => {
    const prompt = __problemSubmissionServiceTest.groupedRetryPracticePrompt;

    expect(prompt).toContain('Explication');
    expect(prompt).toContain('TwoCard-style');
    expect(prompt).toContain('not a correction sheet');
    expect(prompt).toContain('transferable idea');
    expect(prompt).toContain('structurally similar worked example');
    expect(prompt).toContain('changed numbers');
    expect(prompt).toContain('step by step');
    expect(prompt).toContain('why each step is done');
    expect(prompt).toContain('likely misconception or trap');
    expect(prompt).toContain('without revealing the original final answer');
    expect(prompt).toContain('problemContext.wantsDiagram');
    expect(prompt).toContain('structured diagram spec');
    expect(prompt).toContain('labels and dimensions must match the similarProblem');
    expect(prompt).toContain('school level');
    expect(prompt).toContain('country/curriculum');
    expect(prompt).toContain('learning style');
    expect(prompt).toContain('response language');
    expect(prompt).toContain('Do NOT copy the exact original exercise text');
    expect(prompt).toContain('Do NOT reuse numbers, expressions, dimensions, labels, or concrete examples');
    expect(prompt).toContain('Do NOT reveal, mention, evaluate, correct, or explain unselected rows');
    expect(prompt).toContain('Do NOT solve the original row directly');
    expect(prompt).toContain('Do NOT give the original exercise');
    expect(prompt).toContain('Do NOT tell the student whether their original answer is correct');
    expect(prompt).toContain('guardian-facing hint');
    expect(prompt).toContain('parentHelpHint');
  });

  it('loads active problem explanation prompt from Supabase templates', async () => {
    const calls: Array<[string, unknown]> = [];
    const customPrompt = 'Custom problem explanation prompt from Supabase';
    const client = {
      from(table: string) {
        calls.push(['from', table]);
        return {
          select(columns: string) {
            calls.push(['select', columns]);
            return this;
          },
          eq(column: string, value: unknown) {
            calls.push([`eq:${column}`, value]);
            return this;
          },
          order(column: string, options: unknown) {
            calls.push([`order:${column}`, options]);
            return this;
          },
          limit(count: number) {
            calls.push(['limit', count]);
            return this;
          },
          async maybeSingle() {
            return { data: { prompt_content: customPrompt }, error: null };
          },
        };
      },
    };

    await expect(__problemSubmissionServiceTest.loadGroupedRetryPracticePrompt(client as any))
      .resolves.toBe(customPrompt);
    expect(calls).toContainEqual(['from', 'prompt_templates']);
    expect(calls).toContainEqual(['eq:usage_type', __problemSubmissionServiceTest.groupedRetryPracticeUsageType]);
    expect(calls).toContainEqual(['eq:is_active', true]);
    expect(calls).toContainEqual(['order:priority', { ascending: false }]);
    expect(calls).toContainEqual(['limit', 1]);
  });

  it('loads active grouped extraction prompt from Supabase templates', async () => {
    const calls: Array<[string, unknown]> = [];
    const customPrompt = 'Custom grouped extraction prompt from Supabase';
    const client = {
      from(table: string) {
        calls.push(['from', table]);
        return {
          select(columns: string) {
            calls.push(['select', columns]);
            return this;
          },
          eq(column: string, value: unknown) {
            calls.push([`eq:${column}`, value]);
            return this;
          },
          order(column: string, options: unknown) {
            calls.push([`order:${column}`, options]);
            return this;
          },
          limit(count: number) {
            calls.push(['limit', count]);
            return this;
          },
          async maybeSingle() {
            return { data: { prompt_content: customPrompt }, error: null };
          },
        };
      },
    };

    await expect(__problemSubmissionServiceTest.loadGroupedProblemExtractionPrompt(client as any))
      .resolves.toBe(customPrompt);
    expect(calls).toContainEqual(['eq:usage_type', __problemSubmissionServiceTest.groupedProblemExtractionUsageType]);
  });

  it('loads active unified grouped grading prompt from Supabase templates', async () => {
    const calls: Array<[string, unknown]> = [];
    const customPrompt = 'Custom grouped grading prompt from Supabase';
    const client = {
      from(table: string) {
        calls.push(['from', table]);
        return {
          select(columns: string) {
            calls.push(['select', columns]);
            return this;
          },
          eq(column: string, value: unknown) {
            calls.push([`eq:${column}`, value]);
            return this;
          },
          order(column: string, options: unknown) {
            calls.push([`order:${column}`, options]);
            return this;
          },
          limit(count: number) {
            calls.push(['limit', count]);
            return this;
          },
          async maybeSingle() {
            return { data: { prompt_content: customPrompt }, error: null };
          },
        };
      },
    };

    await expect(__problemSubmissionServiceTest.loadGroupedProblemGradingPrompt(client as any))
      .resolves.toBe(customPrompt);
    expect(calls).toContainEqual(['eq:usage_type', __problemSubmissionServiceTest.groupedProblemGradingUsageType]);
  });

  it('falls back to default grouped retry-practice prompt when no active template exists', async () => {
    const client = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      },
    };

    await expect(__problemSubmissionServiceTest.loadGroupedRetryPracticePrompt(client as any))
      .resolves.toBe(__problemSubmissionServiceTest.defaultGroupedRetryPracticePrompt);
  });

  it('falls back to default grouped retry-practice prompt when Supabase query errors', async () => {
    const client = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return { data: null, error: { message: 'database unavailable' } };
          },
        };
      },
    };

    await expect(__problemSubmissionServiceTest.loadGroupedRetryPracticePrompt(client as any))
      .resolves.toBe(__problemSubmissionServiceTest.defaultGroupedRetryPracticePrompt);
  });

  it('parses valid grouped retry-practice JSON', () => {
    const result = __problemSubmissionServiceTest.parseGroupedRetryPractice({
      concept: 'Calculer une moyenne',
      similarProblem: 'Prix: 8 ; 10 ; 12. Affirmation: la moyenne est 10.',
      method: 'On additionne 8 + 10 + 12 = 30, puis 30 / 3 = 10.',
      retryPrompt: 'Refais maintenant ton exercice avec la même méthode.',
      commonMistake: 'Ne divise pas par un mauvais nombre de valeurs.',
      parentHelpHint: 'Demandez à l’élève de nommer les étapes sans donner le résultat.',
    });

    expect(result?.concept).toBe('Calculer une moyenne');
    expect(result?.similarProblem).toContain('8 ; 10 ; 12');
    expect(result?.method).toContain('30 / 3');
    expect(result?.parentHelpHint).toContain('nommer les étapes');
  });

  it('parses valid grouped retry-practice JSON with a geometry diagram', () => {
    const result = __problemSubmissionServiceTest.parseGroupedRetryPractice({
      concept: 'Périmètre du carré',
      similarProblem: 'On considère le carré JKLM tel que JK = 5 cm. Calculer son périmètre.',
      diagram: {
        type: 'square',
        labels: ['J', 'K', 'L', 'M'],
        dimensions: { bottom: '5 cm', left: '5 cm' },
        caption: 'Carré JKLM',
      },
      method: 'Le périmètre vaut 4 × 5 = 20 cm.',
      retryPrompt: 'Refais maintenant ton exercice avec le côté donné.',
    });

    expect(result?.diagram?.type).toBe('square');
    expect(result?.diagram?.labels).toEqual(['J', 'K', 'L', 'M']);
    expect(result?.diagram?.dimensions?.bottom).toBe('5 cm');
  });

  it('ignores invalid retry-practice diagram data without rejecting the practice', () => {
    const result = __problemSubmissionServiceTest.parseGroupedRetryPractice({
      concept: 'Périmètre',
      similarProblem: 'Calculer un périmètre.',
      diagram: {
        type: 'hexagon',
        labels: ['A', 'B'],
      },
      method: 'On additionne les côtés.',
      retryPrompt: 'Essaie avec ton exercice.',
    });

    expect(result).not.toBeNull();
    expect(result?.diagram).toBeUndefined();
  });

  it('rejects malformed grouped retry-practice payloads', () => {
    expect(__problemSubmissionServiceTest.parseGroupedRetryPractice('plain text')).toBeNull();
    expect(__problemSubmissionServiceTest.parseGroupedRetryPractice({ concept: 'Moyenne' })).toBeNull();
    expect(__problemSubmissionServiceTest.hasValidGroupedRetryPractice({})).toBe(false);
  });

  it('builds grouped multi-part grading context with typed answers and construction proof', () => {
    const groupedProblem: ProblemSubmission = {
      id: 'problem-geometry',
      submissionId: 'submission-geometry',
      type: 'grouped_problem',
      rawText: 'PARTIE A : x = 1,5 cm.\n1) Calculer AB.\n2) Construire le rectangle ABCD.',
      attachments: [],
      title: 'Exercice 3',
      statement: 'Rectangle ABCD avec AD = x et AB = 16 - 2x.',
      sharedContext: 'Rectangle ABCD avec AD = x et AB = 16 - 2x.\nPARTIE A : x = 1,5 cm.',
      answerType: 'text',
      sections: [{
        id: 'section-A',
        title: 'PARTIE A',
        context: 'PARTIE A : x = 1,5 cm.',
        rows: [
          {
            id: 'row-1',
            label: '1',
            prompt: 'Calculer AB.',
            answerType: 'text',
            rowKind: 'calculation',
            options: [],
            selected: true,
            studentAnswer: '13 cm',
          },
          {
            id: 'row-2',
            label: '2',
            prompt: 'Construire le rectangle ABCD.',
            answerType: 'text',
            rowKind: 'construction',
            options: [],
            selected: true,
            studentAnswer: 'Construction jointe.',
            justificationAttachments: [{
              id: 'attachment-1',
              type: 'image',
              filename: 'construction.jpg',
              uploadedAt: '2026-05-01T00:00:00.000Z',
              extractionStatus: 'extracted',
              extractedText: 'AD = 1,5 cm ; AB = 13 cm.',
            }],
          },
        ],
      }],
      status: 'evaluating',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      keepGrouped: true,
    };

    const context = __problemSubmissionServiceTest.buildGroupedGradingContext(groupedProblem);

    expect(context.originalProblemContext.selectedRows).toHaveLength(2);
    expect(context.originalProblemContext.selectedRows[1].rowKind).toBe('construction');
    expect(context.studentAnswerEvidence[0].typedAnswer).toBe('13 cm');
    expect(context.studentAnswerEvidence[1].extractedAttachmentText[0].text).toContain('AB = 13 cm');
  });

  it('adds derived symbolic geometry context for grouped grading', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '12',
    }]);

    const context = __problemSubmissionServiceTest.buildGroupedGradingContext(problem);

    expect(context.originalProblemContext.derivedGeometryContext).toContain('x = 1,5');
    expect(context.originalProblemContext.derivedGeometryContext).toContain('EF = 3');
    expect(context.originalProblemContext.derivedGeometryContext).toContain('P(EFGH) = 12');
  });

  it('overrides a wrong AI grade when the square perimeter is deterministically correct', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '12',
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-1',
          label: '1',
          evaluation: {
            selectedAnswer: '12',
            correctAnswer: '16 cm',
            isCorrect: false,
            justificationProvided: true,
            status: 'incorrect',
            feedback: 'La réponse attendue est 16.',
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.correctAnswer).toBe('12 cm');
    expect(result.sections[0].rows[0].evaluation?.feedback).toContain('EFGH');
  });

  it('overrides a partial AI grade for a correct square perimeter when no evidence is required', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '12',
      requiresJustification: false,
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-1',
          label: '1',
          evaluation: {
            selectedAnswer: '12',
            correctAnswer: '12 cm',
            isCorrect: true,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'Le périmètre du carré EFGH est correct (12 cm), mais la justification est absente.',
            explanation: "Le périmètre d'un carré est 4 fois le côté.",
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.justificationProvided).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.justificationSufficient).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.correctAnswer).toBe('12 cm');
  });

  it('marks an incorrect square perimeter answer wrong with the deterministic expected value', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '16 cm',
    }]);

    const payload = __problemSubmissionServiceTest.buildDeterministicGeometryEvaluationPayload(problem, 'fr');

    expect(payload?.sections?.[0].rows[0].evaluation.status).toBe('incorrect');
    expect(payload?.sections?.[0].rows[0].evaluation.correctAnswer).toBe('12 cm');
  });

  it('does not grade a wrong square perimeter answer as a missing-justification problem', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-1',
      label: '1',
      prompt: 'Calculer le périmètre du carré EFGH.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '11',
      requiresJustification: false,
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-1',
          label: '1',
          evaluation: {
            selectedAnswer: '11',
            correctAnswer: '12 cm',
            isCorrect: false,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'The typed answer is a number but no justification was provided. The problem requires justification for this calculation row.',
            explanation: 'The student must show how the perimeter was calculated.',
          },
        }],
      }],
    }, 'fr');

    const evaluation = result.sections[0].rows[0].evaluation;
    expect(evaluation?.status).toBe('incorrect');
    expect(evaluation?.correctAnswer).toBe('12 cm');
    expect(evaluation?.feedback).toContain('La réponse attendue est 12 cm');
    expect(evaluation?.feedback).not.toMatch(/justification|provided|requires/i);
  });

  it('normalizes fallback AI missing-justification feedback to incorrect for no-proof calculation rows', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-5',
      label: '5',
      prompt: 'Calculer 5 + 7.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '11',
      requiresJustification: false,
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-5',
          label: '5',
          evaluation: {
            selectedAnswer: '11',
            correctAnswer: '12',
            isCorrect: false,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'No justification was provided for this calculation.',
            explanation: 'A calculation explanation is missing.',
          },
        }],
      }],
    }, 'en');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('incorrect');
    expect(result.sections[0].rows[0].evaluation?.justificationProvided).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.justificationSufficient).toBe(true);
  });

  it('grades AB from a decimal-comma variable and linear expression', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-2',
      label: '2',
      prompt: 'Calculer AB.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '13',
    }]);

    const payload = __problemSubmissionServiceTest.buildDeterministicGeometryEvaluationPayload(problem, 'fr');

    expect(payload?.sections?.[0].rows[0].evaluation.status).toBe('correct');
    expect(payload?.sections?.[0].rows[0].evaluation.correctAnswer).toBe('13 cm');
  });

  it('normalizes a correct AB calculation to correct when AI only complains about missing justification', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-2',
      label: '2',
      prompt: 'Calculer AB.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '13',
      requiresJustification: false,
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-2',
          label: '2',
          evaluation: {
            selectedAnswer: '13',
            correctAnswer: '13 cm',
            isCorrect: true,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'La réponse est correcte, mais il manque une justification.',
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.justificationProvided).toBe(true);
    expect(result.sections[0].rows[0].evaluation?.justificationSufficient).toBe(true);
  });

  it('overrides a wrong AI grade when AB is deterministically correct', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-2',
      label: '2',
      prompt: 'Calculer AB.',
      answerType: 'text',
      rowKind: 'calculation',
      options: [],
      selected: true,
      studentAnswer: '13',
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-2',
          label: '2',
          evaluation: {
            selectedAnswer: '13',
            correctAnswer: '10 cm',
            isCorrect: false,
            justificationProvided: true,
            status: 'incorrect',
            feedback: 'AB is given as 2x. With x = 5, AB = 10, not 13.',
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('correct');
    expect(result.sections[0].rows[0].evaluation?.correctAnswer).toBe('13 cm');
    expect(result.sections[0].rows[0].evaluation?.explanation).toContain('AB = 13 cm');
  });

  it('keeps construction rows partial when readable proof is missing', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-3',
      label: '3',
      prompt: 'Construire en vraie grandeur le rectangle ABCD.',
      answerType: 'text',
      rowKind: 'construction',
      options: [],
      selected: true,
      studentAnswer: 'Je l’ai construit.',
      requiresJustification: true,
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-3',
          label: '3',
          evaluation: {
            selectedAnswer: 'Je l’ai construit.',
            correctAnswer: 'Construction du rectangle ABCD en vraie grandeur.',
            isCorrect: true,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'Il faut une photo ou un fichier lisible de la construction.',
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('partial');
    expect(result.sections[0].rows[0].evaluation?.justificationProvided).toBe(false);
  });

  it('grades the rectangle and square perimeter equality question', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-4',
      label: '4',
      prompt: 'Les périmètres de ABCD et EFGH sont-ils égaux ?',
      answerType: 'text',
      rowKind: 'text',
      options: [],
      selected: true,
      studentAnswer: 'Non',
    }]);

    const payload = __problemSubmissionServiceTest.buildDeterministicGeometryEvaluationPayload(problem, 'fr');

    expect(payload?.sections?.[0].rows[0].evaluation.status).toBe('correct');
    expect(payload?.sections?.[0].rows[0].evaluation.correctAnswer).toBe('Non');
    expect(payload?.sections?.[0].rows[0].evaluation.explanation).toContain('P(ABCD) = 29');
    expect(payload?.sections?.[0].rows[0].evaluation.explanation).toContain('P(EFGH) = 12');
  });

  it('overrides AI/OCR values for the perimeter equality explanation', () => {
    const problem = geometryGroupedProblem([{
      id: 'row-4',
      label: '4',
      prompt: 'Les périmètres de ABCD et EFGH sont-ils égaux ?',
      answerType: 'text',
      rowKind: 'text',
      options: [],
      selected: true,
      studentAnswer: 'OUI',
    }]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-4',
          label: '4',
          evaluation: {
            selectedAnswer: 'OUI',
            correctAnswer: 'NON',
            isCorrect: false,
            justificationProvided: true,
            status: 'incorrect',
            feedback: 'The perimeters are not equal: ABCD perimeter = 30, EFGH perimeter = 16.',
            explanation: 'P(ABCD) = 2×(2x + x) = 30; P(EFGH) = 16.',
          },
        }],
      }],
    }, 'fr');

    expect(result.sections[0].rows[0].evaluation?.status).toBe('incorrect');
    expect(result.sections[0].rows[0].evaluation?.correctAnswer).toBe('Non');
    expect(result.sections[0].rows[0].evaluation?.explanation).toContain('P(ABCD) = 29');
    expect(result.sections[0].rows[0].evaluation?.explanation).toContain('P(EFGH) = 12');
  });

  it('merges local geometry rows with AI grading for unsupported construction rows', () => {
    const problem = geometryGroupedProblem([
      {
        id: 'row-1',
        label: '1',
        prompt: 'Calculer le périmètre du carré EFGH.',
        answerType: 'text',
        rowKind: 'calculation',
        options: [],
        selected: true,
        studentAnswer: '12',
      },
      {
        id: 'row-2',
        label: '2',
        prompt: 'Calculer AB.',
        answerType: 'text',
        rowKind: 'calculation',
        options: [],
        selected: true,
        studentAnswer: '13',
      },
      {
        id: 'row-3',
        label: '3',
        prompt: 'Construire en vraie grandeur le rectangle ABCD.',
        answerType: 'text',
        rowKind: 'construction',
        options: [],
        selected: true,
        studentAnswer: 'Construction jointe.',
      },
      {
        id: 'row-4',
        label: '4',
        prompt: 'Les périmètres de ABCD et EFGH sont-ils égaux ?',
        answerType: 'text',
        rowKind: 'text',
        options: [],
        selected: true,
        studentAnswer: 'OUI',
      },
    ]);

    const result = __problemSubmissionServiceTest.applyValidGroupedEvaluation(problem, {
      status: 'evaluated',
      sections: [{
        id: 'section-A',
        rows: [{
          id: 'row-3',
          label: '3',
          evaluation: {
            selectedAnswer: 'Construction jointe.',
            correctAnswer: 'Construction du rectangle ABCD.',
            isCorrect: true,
            justificationProvided: false,
            justificationSufficient: false,
            status: 'partial',
            feedback: 'Ajoute une preuve lisible.',
          },
        }],
      }],
    }, 'fr');

    const rows = result.sections[0].rows;
    expect(rows.find(row => row.id === 'row-1')?.evaluation?.status).toBe('correct');
    expect(rows.find(row => row.id === 'row-2')?.evaluation?.status).toBe('correct');
    expect(rows.find(row => row.id === 'row-3')?.evaluation?.status).toBe('partial');
    expect(rows.find(row => row.id === 'row-4')?.evaluation?.status).toBe('incorrect');
    expect(rows.find(row => row.id === 'row-4')?.evaluation?.explanation).toContain('P(ABCD) = 29');
  });

  it('builds retry grading context for retried rows only', () => {
    const groupedProblem: ProblemSubmission = {
      id: 'problem-geometry',
      submissionId: 'submission-geometry',
      type: 'grouped_problem',
      rawText: '1) Calculer le périmètre.\n2) Calculer AB.',
      attachments: [],
      title: 'Exercice 3',
      answerType: 'text',
      sections: [{
        id: 'section-A',
        rows: [
          {
            id: 'row-1',
            label: '1',
            prompt: 'Calculer le périmètre.',
            answerType: 'text',
            rowKind: 'calculation',
            options: [],
            selected: true,
            studentAnswer: '12 cm',
            evaluation: {
              selectedAnswer: '12 cm',
              correctAnswer: '12 cm',
              isCorrect: true,
              justificationProvided: true,
              status: 'correct',
            },
          },
          {
            id: 'row-2',
            label: '2',
            prompt: 'Calculer AB.',
            answerType: 'text',
            rowKind: 'calculation',
            options: [],
            selected: true,
            studentAnswer: '13 cm',
          },
        ],
      }],
      status: 'evaluating',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      keepGrouped: true,
    };

    const context = __problemSubmissionServiceTest.buildGroupedGradingContext(
      groupedProblem,
      new Set(['row-2'])
    );

    expect(context.originalProblemContext.selectedRows).toHaveLength(1);
    expect(context.originalProblemContext.selectedRows[0].rowId).toBe('row-2');
    expect(context.studentAnswerEvidence).toHaveLength(1);
    expect(context.studentAnswerEvidence[0].typedAnswer).toBe('13 cm');
  });
});
