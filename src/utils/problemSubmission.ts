import {
  GroupedAnswerPayload,
  ProblemAttachment,
  ProblemRow,
  ProblemSection,
  ProblemSubmission,
} from '@/types/chat';
import { classifyProblemSubmission } from './problemClassifier';

const TRUE_FALSE_OPTIONS = ['Vrai', 'Faux'];

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

export function cleanGroupedProblemDisplayText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeDisplayLine(line: string): string {
  return normalizeLine(cleanGroupedProblemDisplayText(line));
}

function normalizeForDedupe(text: string): string {
  return cleanGroupedProblemDisplayText(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueDisplayLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  lines.forEach(line => {
    const cleaned = normalizeDisplayLine(line);
    const key = normalizeForDedupe(cleaned);
    if (!cleaned || seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result;
}

function stripRepeatedProblemPreludeFromBlock(block: string): string {
  const cleaned = cleanGroupedProblemDisplayText(block);
  const lastPartieIndex = Math.max(
    cleaned.lastIndexOf('PARTIE A'),
    cleaned.lastIndexOf('Partie A'),
    cleaned.lastIndexOf('PARTIE B'),
    cleaned.lastIndexOf('Partie B')
  );
  if (lastPartieIndex >= 0) {
    return cleaned.slice(lastPartieIndex);
  }
  const lastExerciseIndex = Math.max(cleaned.lastIndexOf('Exercice '), cleaned.lastIndexOf('Exercise '));
  return lastExerciseIndex > 0 ? cleaned.slice(lastExerciseIndex) : cleaned;
}

function getAttachmentType(fileType?: string, filename?: string): ProblemAttachment['type'] {
  const lowerName = (filename || '').toLowerCase();
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  if (fileType?.includes('word') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return 'document';
  return 'other';
}

export function createProblemAttachment(
  file: Pick<File, 'name' | 'type'>,
  url?: string,
  extractedText?: string,
  extractionStatus: ProblemAttachment['extractionStatus'] = extractedText ? 'extracted' : 'pending'
): ProblemAttachment {
  return {
    id: makeId('attachment'),
    type: getAttachmentType(file.type, file.name),
    filename: file.name,
    url,
    extractedText,
    uploadedAt: new Date().toISOString(),
    extractionStatus,
  };
}

function extractTitle(text: string): string | undefined {
  return text.split('\n').map(normalizeDisplayLine).find(line => /^Exercice\b|^Exercise\b|^Probl[èe]me\b/i.test(line));
}

function extractInstructions(text: string): string | undefined {
  const lines = text.split('\n').map(normalizeLine).filter(Boolean);
  return lines
    .filter(line =>
      /vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux|pour\s+chaque\s+affirmation|chaque\s+r[ée]ponse\s+doit|QCM|choisir|coche|justifi/i.test(line)
    )
    .join('\n') || undefined;
}

function collectContext(text: string, fromIndex: number, toIndex: number): string {
  return text
    .slice(fromIndex, toIndex)
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)
    .filter(line => !/^Exercice\b/i.test(line))
    .filter(line => !/vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux|affirmation\s+[A-Z]|chaque\s+r[ée]ponse|justifi/i.test(line))
    .join('\n');
}

function parseTrueFalseSections(text: string): ProblemSection[] {
  const affirmationPattern = /\bAffirmation\s+([A-Z])\s*[:：]\s*([\s\S]*?)(?=\n\s*\bAffirmation\s+[A-Z]\s*[:：]|\n\s*\d+\s*[\).]|\bAffirmation\s+[A-Z]\s*[:：]|$)/gi;
  const matches = [...text.matchAll(affirmationPattern)];
  if (matches.length === 0) return [];

  const sections: ProblemSection[] = [];
  let currentSection: ProblemSection | null = null;
  let previousIndex = 0;

  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0;
    const prelude = collectContext(text, previousIndex, matchIndex);
    const numberedContext = prelude.match(/(?:^|\n)?\s*(\d+)\s*[\).]\s*([\s\S]*)/);

    if (!currentSection || numberedContext || index === 0) {
      const context = numberedContext ? normalizeLine(numberedContext[2]) : prelude;
      currentSection = {
        id: makeId('section'),
        label: numberedContext?.[1],
        title: numberedContext ? `Section ${numberedContext[1]}` : undefined,
        context,
        rows: [],
      };
      sections.push(currentSection);
    } else if (prelude && currentSection.context && !currentSection.context.includes(prelude)) {
      currentSection.context = [currentSection.context, prelude].filter(Boolean).join('\n');
    }

    const label = match[1].toUpperCase();
    const prompt = normalizeLine(match[2])
      .replace(/\b(?:réponse|reponse|answer|choix)\s*[:\-]?\s*(?:vrai|faux|true|false)\b/gi, '')
      .trim();

    if (prompt) {
      currentSection.rows.push({
        id: makeId(`row-${label}`),
        label,
        prompt,
        relatedContext: currentSection.context,
        answerType: 'true_false',
        rowKind: 'choice',
        options: TRUE_FALSE_OPTIONS,
        requiresJustification: /justifi/i.test(text),
      });
    }

    previousIndex = matchIndex + match[0].length;
  });

  return sections.filter(section => section.rows.length > 0);
}

function parseMultipleChoiceSections(text: string): ProblemSection[] {
  const questionPattern = /(?:^|\n)\s*(\d+|[a-z])[\).]\s*([^\n]+(?:\n(?!\s*(?:\d+|[a-z])[\).]).*)*)/gi;
  const matches = [...text.matchAll(questionPattern)];
  const rows: ProblemRow[] = [];

  matches.forEach(match => {
    const label = match[1];
    const block = normalizeLine(match[2]);
    const options = [...block.matchAll(/\b([A-D])\s*[\).:-]\s*([^A-D\n]+?)(?=\s+\b[A-D]\s*[\).:-]|$)/g)]
      .map(optionMatch => `${optionMatch[1]}. ${normalizeLine(optionMatch[2])}`);

    if (options.length >= 2) {
      rows.push({
        id: makeId(`row-${label}`),
        label,
        prompt: block.replace(/\b[A-D]\s*[\).:-]\s*[^A-D\n]+/g, '').trim() || block,
        answerType: 'multiple_choice',
        rowKind: 'choice',
        options,
        requiresJustification: /justifi/i.test(text),
      });
    }
  });

  return rows.length
    ? [{ id: makeId('section'), context: undefined, rows }]
    : [];
}

function detectRowKind(prompt: string): ProblemRow['rowKind'] {
  if (/\b(construire|tracer|dessiner|vraie\s+grandeur|construction)\b/i.test(prompt)) {
    return 'construction';
  }
  if (/\b(calculer|calcule|d[ée]terminer|trouver|p[ée]rim[èe]tre|aire|longueur|mesure|valeur)\b/i.test(prompt)) {
    return 'calculation';
  }
  return 'text';
}

function parseNumberedRows(block: string, sectionContext?: string): ProblemRow[] {
  const cleanedBlock = stripRepeatedProblemPreludeFromBlock(block);
  const rowPattern = /(?:^|\n)\s*(\d+)\s*[\).]\s*([\s\S]*?)(?=\n\s*\d+\s*[\).]|$)/g;
  const rowsByLabel = new Map<string, ProblemRow>();

  [...cleanedBlock.matchAll(rowPattern)]
    .map((match): ProblemRow | null => {
      const label = match[1];
      const prompt = normalizeDisplayLine(match[2]);
      if (!prompt) return null;
      const rowKind = detectRowKind(prompt);
      return {
        id: makeId(`row-${label}`),
        label,
        prompt,
        relatedContext: sectionContext,
        answerType: 'text' as const,
        rowKind,
        options: [],
        requiresJustification: rowKind === 'construction',
      };
    })
    .filter((row): row is ProblemRow => row !== null)
    .forEach(row => {
      if (!rowsByLabel.has(row.label)) rowsByLabel.set(row.label, row);
    });

  return Array.from(rowsByLabel.values());
}

function contextBeforeFirstNumberedRow(text: string): string | undefined {
  const firstRowIndex = text.search(/(?:^|\n)\s*\d+\s*[\).]/m);
  if (firstRowIndex <= 0) return undefined;
  return uniqueDisplayLines(text
    .slice(0, firstRowIndex)
    .split('\n'))
    .filter(line => !/^Exercice\b/i.test(line))
    .join('\n') || undefined;
}

function parseGroupedProblemSections(text: string): ProblemSection[] {
  const cleanedText = cleanGroupedProblemDisplayText(text);
  const sectionPattern = /(?:^|\n)\s*(PARTIE\s+[A-Z]\s*:[^\n]*)([\s\S]*?)(?=\n\s*PARTIE\s+[A-Z]\s*:|$)/gi;
  const matches = [...cleanedText.matchAll(sectionPattern)];
  const sectionsByTitle = new Map<string, ProblemSection>();

  if (matches.length > 0) {
    matches.forEach((match, index) => {
        const title = normalizeDisplayLine(match[1]);
        const rows = parseNumberedRows(match[2], title);
        if (!rows.length) return;
        const key = normalizeForDedupe(title);
        const existing = sectionsByTitle.get(key);
        if (existing) {
          const existingLabels = new Set(existing.rows.map(row => row.label));
          existing.rows.push(...rows.filter(row => !existingLabels.has(row.label)));
          return;
        }
        sectionsByTitle.set(key, {
          id: makeId(`section-${index + 1}`),
          title,
          context: title,
          rows,
        });
      });
    return Array.from(sectionsByTitle.values());
  }

  const context = contextBeforeFirstNumberedRow(cleanedText);
  const rows = parseNumberedRows(cleanedText, context);
  return rows.length
    ? [{
        id: makeId('section'),
        context,
        rows,
      }]
    : [];
}

function extractGroupedSharedContext(text: string, sections: ProblemSection[]): string | undefined {
  const cleanedText = cleanGroupedProblemDisplayText(text);
  const firstSectionIndex = cleanedText.search(/(?:^|\n)\s*PARTIE\s+[A-Z]\s*:/i);
  const firstQuestionIndex = cleanedText.search(/(?:^|\n)\s*\d+\s*[\).]/m);
  const boundaryCandidates = [firstSectionIndex, firstQuestionIndex].filter(index => index > 0);
  const boundary = boundaryCandidates.length ? Math.min(...boundaryCandidates) : -1;
  const prelude = firstSectionIndex > 0
    ? cleanedText.slice(0, boundary)
    : (sections.length > 0 ? contextBeforeFirstNumberedRow(cleanedText) : undefined);
  return uniqueDisplayLines((prelude || '').split('\n'))
    .filter(line => !/^Exercice\b/i.test(line))
    .join('\n') || undefined;
}

function createComplexSections(text: string): ProblemSection[] {
  return [{
    id: makeId('section'),
    context: text.trim(),
    rows: [],
  }];
}

export function createProblemSubmissionFromText(input: {
  rawText: string;
  attachments?: ProblemAttachment[];
  extractedText?: string;
}): ProblemSubmission {
  const rawText = input.rawText.trim();
  const classification = classifyProblemSubmission(rawText, { hasAttachments: !!input.attachments?.length });
  const now = new Date().toISOString();
  const sections =
    classification.type === 'grouped_choice_problem'
      ? parseTrueFalseSections(rawText).concat(parseMultipleChoiceSections(rawText))
      : classification.type === 'grouped_problem'
        ? parseGroupedProblemSections(rawText)
      : createComplexSections(rawText);
  const hasTrueFalseRows = sections.some(section => section.rows.some(row => row.answerType === 'true_false'));
  const isGroupedProblem = classification.type === 'grouped_problem';
  const sharedContext = isGroupedProblem
    ? extractGroupedSharedContext(rawText, sections)
    : sections.map(section => section.context).filter(Boolean).join('\n\n') || undefined;

  return {
    id: makeId('problem'),
    submissionId: makeId('submission'),
    type: classification.type,
    rawText,
    attachments: input.attachments || [],
    extractedText: input.extractedText,
    title: extractTitle(rawText) || (classification.type === 'grouped_choice_problem' ? 'Exercice : Vrai ou Faux' : 'Problème'),
    statement: rawText,
    instructions: extractInstructions(rawText),
    sharedContext,
    answerType: hasTrueFalseRows ? 'true_false' : classification.type === 'grouped_choice_problem' ? 'multiple_choice' : 'text',
    selectionMode: classification.type === 'grouped_choice_problem' ? 'select_correct' : undefined,
    requiresJustification: isGroupedProblem ? false : /justifi/i.test(rawText),
    sections,
    status: sections.length > 0 && classification.type !== 'simple_exercise'
      ? 'awaiting_student_answer'
      : 'needs_more_information',
    createdAt: now,
    updatedAt: now,
    keepGrouped: classification.type !== 'simple_exercise',
  };
}

export function applyGroupedAnswers(problem: ProblemSubmission, payload: GroupedAnswerPayload): ProblemSubmission {
  const answerByRow = new Map(payload.answers.map(answer => [answer.rowId, answer]));
  const isMultipart = problem.type === 'grouped_problem';
  const retryRowIds = new Set(payload.retryRowIds || []);
  const isRetry = payload.isRetry === true;

  return {
    ...problem,
    studentAnswer: payload,
    sections: problem.sections.map(section => ({
      ...section,
      rows: section.rows.map(row => {
        const answer = answerByRow.get(row.id);
        if (isRetry && !retryRowIds.has(row.id)) {
          return row;
        }
        return answer
          ? {
              ...row,
              selected: true,
              doNotGrade: false,
              selectedOption: answer.selectedOption,
              studentAnswer: answer.answer,
              justification: answer.justification,
              justificationAttachments: answer.justificationAttachments,
              evaluation: undefined,
            }
          : {
              ...row,
              selected: false,
              doNotGrade: true,
              selectedOption: undefined,
              studentAnswer: undefined,
              justification: undefined,
              justificationAttachments: undefined,
              evaluation: undefined,
            };
      }),
    })),
    status: isMultipart && payload.answers.length === 0 ? 'awaiting_student_answer' : 'evaluating',
    error: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function applyGroupedEvaluation(problem: ProblemSubmission, evaluation: Partial<ProblemSubmission>): ProblemSubmission {
  const evaluationRows = new Map<string, ProblemRow>();
  evaluation.sections?.forEach(section => {
    section.rows.forEach(row => {
      evaluationRows.set(row.id, row);
      if (row.label) evaluationRows.set(row.label, row);
    });
  });

  return {
    ...problem,
    sections: problem.sections.map(section => ({
      ...section,
      rows: section.rows.map(row => {
        const evaluated = evaluationRows.get(row.id) || evaluationRows.get(row.label);
        return row.selected && evaluated?.evaluation
          ? { ...row, evaluation: evaluated.evaluation }
          : row;
      }),
    })),
    overallFeedback: evaluation.overallFeedback,
    missingAnswers: undefined,
    recommendedNextAction: evaluation.recommendedNextAction,
    status: evaluation.status || 'evaluated',
    error: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export const __problemSubmissionTest = {
  createProblemSubmissionFromText,
  parseGroupedProblemSections,
};
