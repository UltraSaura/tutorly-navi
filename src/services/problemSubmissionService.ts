import { GroupedAnswerPayload, GroupedRetryPractice, ProblemRow, ProblemRowEvaluation, ProblemSubmission } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import {
  applyGroupedAnswers,
  applyGroupedEvaluation,
  cleanGroupedProblemDisplayText,
  createProblemSubmissionFromText,
} from '@/utils/problemSubmission';

const GROUPED_GRADING_TIMEOUT_MS = 20000;
const GROUPED_RETRY_PRACTICE_TIMEOUT_MS = 20000;
const GROUPED_RETRY_PRACTICE_USAGE_TYPE = 'grouped_retry_practice';

const GROUPED_GRADING_PROMPT = `You are grading a grouped homework problem.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.
Use ONLY originalProblemContext to decide whether a selected assertion is mathematically true.
Use studentAnswerEvidence ONLY to judge whether the student's justification is present and sufficient.
Never replace or reinterpret original problem values using numbers from the student's justification/OCR.
If studentAnswerEvidence contains different numbers from originalProblemContext, treat that as a justification issue only; do not use those numbers to decide the assertion truth.
Only grade rows selected by the student.
Do not evaluate, mention, correct, reveal, or explain unselected rows.
Return evaluations only for selected row IDs.
The student is selecting assertions they believe are correct. A selected row means "I think this assertion is correct".
Unselected rows are intentionally not answered and must remain private/neutral.
Check both the selected assertion and the justification when justification is required.
The justification may be typed text OR extracted text from uploaded justification attachments.
Use each selected row's studentAnswerEvidence.extractedAttachmentText as student work evidence.
Do not say "no justification was provided" when a selected row has readable extracted attachment text.

For selected assertions:
- if the assertion is mathematically correct and justification is sufficient => status "correct"
- if the assertion is mathematically correct but justification is missing or weak => status "partial"
- if the assertion is mathematically false => status "incorrect"
Never return status for unselected rows.

Return exactly this JSON shape:
{
  "status": "evaluated",
  "overallFeedback": "summary of selected rows only",
  "missingAnswers": [],
  "recommendedNextAction": "string",
  "sections": [
    {
      "id": "section id from input",
      "rows": [
        {
          "id": "row id from input",
          "label": "row label from input",
          "evaluation": {
            "selectedAnswer": "Sélectionnée",
            "correctAnswer": "Sélectionner cette affirmation",
            "isCorrect": true,
            "justificationProvided": true,
            "justificationSufficient": true,
            "status": "correct",
            "feedback": "specific feedback",
            "explanation": "short explanation",
            "score": 1
          }
        }
      ]
    }
  ]
}`;

const GROUPED_MULTIPART_GRADING_PROMPT = `You are grading a grouped multi-part homework problem.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.
Use originalProblemContext as the source of truth for the exercise statement, values, diagrams described by OCR, shared context, and row prompts.
Use studentAnswerEvidence only as the student's submitted work.
Only grade rows present in studentAnswerEvidence.
For calculation/text rows, grade the typedAnswer against the row prompt and shared context.
Do not require typed explanations, uploaded proof, or justification for calculation/text rows unless requiresJustification is explicitly true.
For calculation/text rows with no proof required, never return partial/incomplete solely because justification is absent.
Grade the typed answer first; mention missing justification only when requiresJustification is true.
When a calculation/text row has a correct typedAnswer and requiresJustification is false, return status "correct" even if the student did not explain the calculation.
For symbolic geometry rows, compute section variables first (for example x = 1,5), then compute dimensions (for example EF = 2x) before deciding the expected answer.
For construction rows, use typedAnswer plus extractedAttachmentText as proof. If no readable construction proof is present, return status "partial" or "incomplete" and ask for a clearer photo/file.
Keep feedback row-specific and do not split the parent problem into independent exercises.

Return exactly this JSON shape:
{
  "status": "evaluated",
  "overallFeedback": "summary of submitted rows only",
  "missingAnswers": [],
  "recommendedNextAction": "string",
  "sections": [
    {
      "id": "section id from input",
      "rows": [
        {
          "id": "row id from input",
          "label": "row label from input",
          "evaluation": {
            "selectedAnswer": "student answer summary",
            "correctAnswer": "expected result or method summary",
            "isCorrect": true,
            "justificationProvided": true,
            "justificationSufficient": true,
            "status": "correct",
            "feedback": "specific feedback",
            "explanation": "short explanation",
            "score": 1
          }
        }
      ]
    }
  ]
}`;

const PROBLEM_EXTRACTION_PROMPT = `You are extracting a complete homework problem for a tutoring app.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.
Preserve the original grouped structure. Do not split assertions or numbered sub-questions into separate exercises.
Detect grouped answer choices like Vrai/Faux, QCM, yes/no, and repeated row choices.
Detect multi-part geometry/construction/calculation problems with shared context and numbered questions.
Preserve labels A, B, C, D and shared contexts.
For true/false assertions, keep the student-facing prompts as assertions; do not rewrite them as tasks like "calculate the average".
Return this JSON shape:
{
  "responseType": "grouped_choice_problem|grouped_problem",
  "problemId": "string",
  "title": "string",
  "problemStatement": "string",
  "instructions": "string",
  "answerType": "true_false|text",
  "requiresJustification": true,
  "options": ["Vrai", "Faux"],
  "keepGrouped": true,
  "sections": [
    {
      "id": "section-1",
      "title": "string",
      "context": "shared context",
      "rows": [
        {
          "id": "row-A",
          "label": "A",
          "prompt": "original assertion text or numbered question text",
          "answerType": "true_false|text",
          "rowKind": "choice|calculation|construction|text",
          "options": ["Vrai", "Faux"],
          "requiresJustification": true
        }
      ]
    }
  ]
}`;

export const DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT = `You are creating an "Explication" for ONE selected row in a grouped homework problem.
Return ONLY valid JSON. Do not use markdown fences. Do not include prose outside JSON.

Teaching goal:
- Create a specialized TwoCard-style teaching response, not a correction sheet.
- Teach the transferable idea behind the selected/evaluated row so the student can retry the original exercise independently.
- Adapt vocabulary, explanation length, and examples to the provided profile: school level, country/curriculum, learning style, and response language.
- Use warm, student-friendly language. Be concrete and concise.

Required teaching sequence:
- concept: explain the underlying idea in student-friendly language. Do not state the original answer.
- similarProblem: create ONE structurally similar worked example using changed numbers or a different concrete context. It must practice the same concept but must not copy the original wording or values.
- diagram: if problemContext.wantsDiagram is true or the selected row is geometry, include a simple structured diagram spec for the similar example. The labels and dimensions must match the similarProblem. For non-geometry rows, omit diagram or set it to null. Do not draw SVG or return markdown images.
- method: solve the similarProblem only, step by step. Explain why each step is done, not just the calculation.
- commonMistake: name the likely misconception or trap and how to avoid it.
- retryPrompt: invite the student to return to their original exercise and apply the same method without revealing the original final answer.
- parentHelpHint: give a short guardian-facing hint, but do not address it to the student.

Strict privacy and learning rules:
- Do NOT copy the exact original exercise text.
- Do NOT reuse numbers, expressions, dimensions, labels, or concrete examples from the original selected row or shared context.
- Do NOT reveal, mention, evaluate, correct, or explain unselected rows.
- Do NOT solve the original row directly.
- Do NOT give the original exercise's final answer as the teaching content.
- Do NOT tell the student whether their original answer is correct inside this teaching response.
- Keep all teaching content focused on the similar example and transferable method.

Return exactly this JSON shape:
{
  "concept": "student-friendly explanation of the underlying idea, not the original answer",
  "similarProblem": "one structurally similar worked example with changed numbers/context",
  "diagram": {
    "type": "rectangle|square|triangle|circle",
    "labels": ["A", "B", "C", "D"],
    "dimensions": { "bottom": "6 cm", "left": "3 cm" },
    "caption": "optional short caption"
  },
  "method": "step-by-step reasoning for the similar problem only, including why each step is done",
  "retryPrompt": "short prompt encouraging the student to retry the original exercise without revealing its answer",
  "commonMistake": "likely misconception or trap and how to avoid it",
  "parentHelpHint": "optional short guardian guidance, not for display in the student app"
}`;

async function loadGroupedRetryPracticePrompt(
  client: Pick<typeof supabase, 'from'> = supabase
): Promise<string> {
  try {
    const { data, error } = await client
      .from('prompt_templates')
      .select('prompt_content')
      .eq('usage_type', GROUPED_RETRY_PRACTICE_USAGE_TYPE)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[problemSubmissionService] Failed to load grouped retry practice prompt:', error);
      return DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT;
    }

    const prompt = typeof data?.prompt_content === 'string' ? data.prompt_content.trim() : '';
    return prompt || DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT;
  } catch (error) {
    console.warn('[problemSubmissionService] Unexpected grouped retry practice prompt load failure:', error);
    return DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT;
  }
}

function extractJsonObject(content: unknown): any | null {
  if (!content) return null;
  if (typeof content === 'object') return content;
  if (typeof content !== 'string') return null;

  try {
    const fenced = content.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : content;
    return JSON.parse(candidate);
  } catch {
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function selectedEvaluatedRowsForRetryPractice(problem: ProblemSubmission, rowId?: string) {
  return problem.sections.flatMap(section =>
    section.rows
      .filter(row => row.selected && row.evaluation && (!rowId || row.id === rowId))
      .map(row => ({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionContext: section.context,
        rowId: row.id,
        label: row.label,
        prompt: row.prompt,
        relatedContext: row.relatedContext,
        justification: row.justification,
        justificationAttachments: (row.justificationAttachments || []).map(attachment => ({
          filename: attachment.filename,
          extractedText: attachment.extractedText,
          extractionStatus: attachment.extractionStatus,
        })),
        evaluationStatus: row.evaluation?.status,
        feedback: row.evaluation?.feedback,
        explanation: row.evaluation?.explanation,
      }))
  );
}

type GroupedRetryPracticeProfile = {
  responseLanguage?: string;
  schoolLevel?: string;
  country?: string;
  curriculum?: string;
  learningStyle?: string;
};

function buildGroupedRetryPracticeContext(
  problem: ProblemSubmission,
  rowId?: string,
  profile?: GroupedRetryPracticeProfile
) {
  const selectedRows = selectedEvaluatedRowsForRetryPractice(problem, rowId);
  const geometrySignals = selectedRows
    .map(row => [row.prompt, row.relatedContext, row.sectionContext, row.feedback, row.explanation].filter(Boolean).join(' '))
    .join(' ')
    .toLowerCase();

  return {
    problemId: problem.id,
    title: problem.title,
    instructions: problem.instructions,
    answerType: problem.answerType,
    selectionMode: problem.selectionMode,
    requestedRowId: rowId,
    profile: {
      responseLanguage: profile?.responseLanguage || 'English',
      schoolLevel: profile?.schoolLevel || 'High School',
      country: profile?.country || 'your country',
      curriculum: profile?.curriculum || 'local curriculum',
      learningStyle: profile?.learningStyle || 'balanced',
    },
    wantsDiagram: /\b(rectangle|square|carr[ée]|triangle|circle|cercle|p[ée]rim[èe]tre|aire|surface|geometry|g[ée]om[ée]tr)/i.test(geometrySignals),
    selectedRows,
  };
}

function hasValidGroupedRetryPractice(payload: any): payload is GroupedRetryPractice {
  return !!payload &&
    typeof payload === 'object' &&
    typeof payload.concept === 'string' &&
    payload.concept.trim().length > 0 &&
    typeof payload.similarProblem === 'string' &&
    payload.similarProblem.trim().length > 0 &&
    typeof payload.method === 'string' &&
    payload.method.trim().length > 0 &&
    typeof payload.retryPrompt === 'string' &&
    payload.retryPrompt.trim().length > 0;
}

function parseGroupedRetryPractice(payload: any): GroupedRetryPractice | null {
  const parsed = payload?.retryPractice || payload?.groupedRetryPractice || payload;
  if (!hasValidGroupedRetryPractice(parsed)) return null;

  return {
    concept: parsed.concept.trim(),
    similarProblem: parsed.similarProblem.trim(),
    diagram: parseRetryPracticeDiagram(parsed.diagram),
    method: parsed.method.trim(),
    retryPrompt: parsed.retryPrompt.trim(),
    commonMistake: typeof parsed.commonMistake === 'string' ? parsed.commonMistake.trim() : undefined,
    parentHelpHint: typeof parsed.parentHelpHint === 'string' ? parsed.parentHelpHint.trim() : undefined,
  };
}

function parseRetryPracticeDiagram(diagram: any): GroupedRetryPractice['diagram'] | undefined {
  if (!diagram || typeof diagram !== 'object') return undefined;
  const allowedTypes = ['rectangle', 'square', 'triangle', 'circle'];
  if (!allowedTypes.includes(diagram.type)) return undefined;

  const labels = Array.isArray(diagram.labels)
    ? diagram.labels
        .filter((label: unknown): label is string => typeof label === 'string' && label.trim().length > 0)
        .slice(0, 8)
        .map((label: string) => label.trim().slice(0, 12))
    : undefined;

  const dimensions = diagram.dimensions && typeof diagram.dimensions === 'object'
    ? Object.fromEntries(
        Object.entries(diagram.dimensions)
          .filter((entry): entry is [string, string] =>
            typeof entry[0] === 'string' &&
            typeof entry[1] === 'string' &&
            entry[0].trim().length > 0 &&
            entry[1].trim().length > 0
          )
          .slice(0, 8)
          .map(([key, value]) => [key.trim().slice(0, 20), value.trim().slice(0, 32)])
      )
    : undefined;

  return {
    type: diagram.type,
    labels: labels && labels.length > 0 ? labels : undefined,
    dimensions: dimensions && Object.keys(dimensions).length > 0 ? dimensions : undefined,
    caption: typeof diagram.caption === 'string' && diagram.caption.trim()
      ? diagram.caption.trim().slice(0, 120)
      : undefined,
  };
}

function shouldGradeRow(row: { selected?: boolean; evaluation?: unknown }, retryRowIds?: Set<string>): boolean {
  if (!row.selected) return false;
  return retryRowIds && retryRowIds.size > 0 ? retryRowIds.has((row as any).id) : true;
}

function selectedRowsForGroupedGrading(problem: ProblemSubmission, retryRowIds?: Set<string>) {
  return problem.sections.flatMap(section =>
    section.rows
      .filter(row => shouldGradeRow(row, retryRowIds))
      .map(row => ({
        sectionId: section.id,
        sectionTitle: section.title,
        originalSectionContext: section.context,
        rowId: row.id,
        label: row.label,
        originalAssertion: row.prompt,
        originalPrompt: row.prompt,
        originalRelatedContext: row.relatedContext,
        originalProblemSources: buildOriginalProblemSources(problem, section.context, row.relatedContext, row.prompt, row.label),
        answerType: row.answerType,
        rowKind: row.rowKind,
        requiresJustification: row.requiresJustification ?? problem.requiresJustification,
      }))
  );
}

function studentEvidenceForGroupedGrading(problem: ProblemSubmission, retryRowIds?: Set<string>) {
  return problem.sections.flatMap(section =>
    section.rows
      .filter(row => shouldGradeRow(row, retryRowIds))
      .map(row => ({
        rowId: row.id,
        label: row.label,
        selected: true,
        selectedOption: row.selectedOption,
        typedAnswer: row.studentAnswer || '',
        typedJustification: row.justification || '',
        extractedAttachmentText: (row.justificationAttachments || [])
          .filter(attachment =>
            attachment.extractionStatus === 'extracted' &&
            attachment.extractedText?.trim() &&
            isReliableJustificationOcr(attachment)
          )
          .map(attachment => ({
            filename: attachment.filename,
            text: attachment.extractedText,
            normalizedText: attachment.normalizedText,
            confidence: attachment.ocrConfidence,
          })),
        unreadableAttachments: (row.justificationAttachments || [])
          .filter(attachment => attachment.extractionStatus === 'failed' || !isReliableJustificationOcr(attachment))
          .map(attachment => ({
            filename: attachment.filename,
            error: attachment.error || (attachment.ocrWarnings || []).join(' ') || (
              typeof attachment.ocrConfidence === 'number' && attachment.ocrConfidence < 0.65
                ? 'OCR confidence is too low to use as definitive grading evidence.'
                : undefined
            ),
          })),
      }))
  );
}

function buildGroupedGradingContext(problem: ProblemSubmission, retryRowIds?: Set<string>) {
  return {
    problemId: problem.id,
    originalProblemContext: {
      title: problem.title,
      instructions: problem.instructions,
      rawText: problem.rawText,
      statement: problem.statement,
      sharedContext: problem.sharedContext,
      derivedGeometryContext: buildDerivedGeometryContext(problem, retryRowIds),
      selectedRows: selectedRowsForGroupedGrading(problem, retryRowIds),
    },
    studentAnswerEvidence: studentEvidenceForGroupedGrading(problem, retryRowIds),
  };
}

function parseLocaleNumber(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'));
}

function extractNumbers(text?: string): number[] {
  if (!text) return [];
  return Array.from(text.matchAll(/-?\d+(?:[,.]\d+)?/g))
    .map(match => parseLocaleNumber(match[0]))
    .filter(Number.isFinite);
}

function nearlyEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function normalizeTextForGeometry(text?: string): string {
  return cleanGroupedProblemDisplayText(text)
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

function parseVariablesFromGeometryText(text: string): Record<string, number> {
  const variables: Record<string, number> = {};
  Array.from(text.matchAll(/\b([a-z])\s*=\s*(-?\d+(?:[,.]\d+)?)/gi)).forEach(match => {
    variables[match[1].toLowerCase()] = parseLocaleNumber(match[2]);
  });
  return variables;
}

function evaluateLinearExpression(expression: string, variables: Record<string, number>): number | null {
  const compact = expression
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/,/g, '.')
    .replace(/(?:cm|m|mm|km)$/i, '')
    .replace(/[.;]+$/g, '');

  if (!compact || /[^0-9a-z.+-]/i.test(compact)) return null;

  const terms = compact.replace(/-/g, '+-').split('+').filter(Boolean);
  if (terms.length === 0) return null;

  return terms.reduce<number | null>((sum, term) => {
    if (sum === null) return null;
    const variableMatch = term.match(/^(-?\d*(?:\.\d+)?)?([a-z])$/i);
    if (variableMatch) {
      const variable = variableMatch[2].toLowerCase();
      if (!(variable in variables)) return null;
      const coefficientText = variableMatch[1];
      const coefficient = coefficientText === '' || coefficientText === undefined
        ? 1
        : coefficientText === '-'
          ? -1
          : Number(coefficientText);
      return Number.isFinite(coefficient) ? sum + coefficient * variables[variable] : null;
    }

    const constant = Number(term);
    return Number.isFinite(constant) ? sum + constant : null;
  }, 0);
}

function parseDimensionsFromGeometryText(text: string, variables: Record<string, number>): Record<string, number> {
  const dimensions: Record<string, number> = {};
  const normalized = text
    .replace(/\bet\s+(?=[A-Z]{2}\s*=)/g, '; ')
    .replace(/\band\s+(?=[A-Z]{2}\s*=)/gi, '; ');

  normalized.split(/[;\n]/).forEach(part => {
    const match = part.match(/\b([A-Z]{2})\s*=\s*([^;.]+)/);
    if (!match) return;
    const value = evaluateLinearExpression(match[2], variables);
    if (value !== null) dimensions[match[1].toUpperCase()] = value;
  });

  return dimensions;
}

function parseShapesFromGeometryText(text: string): Record<string, 'rectangle' | 'square'> {
  const shapes: Record<string, 'rectangle' | 'square'> = {};
  Array.from(text.matchAll(/\brectangle\s+([A-Z]{4})\b/gi)).forEach(match => {
    shapes[match[1].toUpperCase()] = 'rectangle';
  });
  Array.from(text.matchAll(/\bcarr[ée]e?\s+([A-Z]{4})\b/gi)).forEach(match => {
    shapes[match[1].toUpperCase()] = 'square';
  });
  Array.from(text.matchAll(/\bsquare\s+([A-Z]{4})\b/gi)).forEach(match => {
    shapes[match[1].toUpperCase()] = 'square';
  });
  return shapes;
}

function dimensionValue(dimensions: Record<string, number>, segment: string): number | undefined {
  const key = segment.toUpperCase();
  const reversed = key.split('').reverse().join('');
  return dimensions[key] ?? dimensions[reversed];
}

function adjacentSegments(shapeName: string): string[] {
  const letters = shapeName.toUpperCase().split('');
  return letters.map((letter, index) => `${letter}${letters[(index + 1) % letters.length]}`);
}

function squareSide(shapeName: string, dimensions: Record<string, number>): number | null {
  for (const segment of adjacentSegments(shapeName)) {
    const value = dimensionValue(dimensions, segment);
    if (typeof value === 'number') return value;
  }
  return null;
}

function rectangleSides(shapeName: string, dimensions: Record<string, number>): [number, number] | null {
  const values = adjacentSegments(shapeName)
    .map(segment => dimensionValue(dimensions, segment))
    .filter((value): value is number => typeof value === 'number');

  const unique = values.filter((value, index) =>
    values.findIndex(candidate => nearlyEqual(candidate, value)) === index
  );
  return unique.length >= 2 ? [unique[0], unique[1]] : null;
}

function perimeterForShape(
  shapeName: string,
  shapeKind: 'rectangle' | 'square',
  dimensions: Record<string, number>
): number | null {
  if (shapeKind === 'square') {
    const side = squareSide(shapeName, dimensions);
    return side === null ? null : 4 * side;
  }

  const sides = rectangleSides(shapeName, dimensions);
  return sides === null ? null : 2 * (sides[0] + sides[1]);
}

function geometrySourcesForRow(problem: ProblemSubmission, sectionContext?: string, row?: ProblemRow): string {
  return [
    problem.rawText,
    problem.statement,
    problem.sharedContext,
    sectionContext,
    row?.relatedContext,
    row?.prompt,
  ]
    .filter((source): source is string => !!source?.trim())
    .map(normalizeTextForGeometry)
    .join('\n');
}

function buildGeometryModel(text: string) {
  const variables = parseVariablesFromGeometryText(text);
  const dimensions = parseDimensionsFromGeometryText(text, variables);
  const shapes = parseShapesFromGeometryText(text);
  const perimeters = Object.fromEntries(
    Object.entries(shapes)
      .map(([name, kind]) => [name, perimeterForShape(name, kind, dimensions)] as const)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
  );

  return { variables, dimensions, shapes, perimeters };
}

function parseNumericStudentAnswer(answer?: string): number | null {
  if (!answer) return null;
  const match = answer.match(/-?\d+(?:[,.]\d+)?/);
  return match ? parseLocaleNumber(match[0]) : null;
}

function parseYesNoStudentAnswer(answer?: string): boolean | null {
  if (!answer) return null;
  const normalized = stripAccents(answer.toLowerCase());
  if (/\b(oui|yes|egal|egaux|equal|same)\b/.test(normalized)) return true;
  if (/\b(non|no|different|pas egaux|ne sont pas)\b/.test(normalized)) return false;
  return null;
}

function shapeNamesInPrompt(prompt: string, shapes: Record<string, 'rectangle' | 'square'>): string[] {
  const names = Object.keys(shapes);
  return names.filter(name => prompt.includes(name));
}

function expectedGeometryValueForRow(problem: ProblemSubmission, sectionContext: string | undefined, row: ProblemRow):
  | { kind: 'number'; expected: number; explanation: string }
  | { kind: 'boolean'; expected: boolean; explanation: string }
  | null {
  if (row.rowKind && row.rowKind !== 'calculation' && row.rowKind !== 'text') return null;

  const prompt = normalizeTextForGeometry(row.prompt);
  const normalizedPrompt = stripAccents(prompt.toLowerCase());
  const model = buildGeometryModel(geometrySourcesForRow(problem, sectionContext, row));

  const segmentMatch = prompt.match(/\b(?:calculer|calculate)\s+([A-Z]{2})\b/i);
  if (segmentMatch) {
    const segment = segmentMatch[1].toUpperCase();
    const expected = dimensionValue(model.dimensions, segment);
    if (typeof expected === 'number') {
      return {
        kind: 'number',
        expected,
        explanation: `${segment} = ${formatNumber(expected)} cm.`,
      };
    }
  }

  if (/\bperim/.test(normalizedPrompt) && /\b(carre|square)\b/.test(normalizedPrompt)) {
    const explicitShape = shapeNamesInPrompt(prompt, model.shapes)
      .find(name => model.shapes[name] === 'square');
    const squareName = explicitShape || Object.entries(model.shapes).find(([, kind]) => kind === 'square')?.[0];
    if (!squareName) return null;
    const expected = model.perimeters[squareName];
    const side = squareSide(squareName, model.dimensions);
    if (typeof expected === 'number' && side !== null) {
      return {
        kind: 'number',
        expected,
        explanation: `Le côté du carré ${squareName} vaut ${formatNumber(side)} cm, donc son périmètre vaut 4 × ${formatNumber(side)} = ${formatNumber(expected)} cm.`,
      };
    }
  }

  if (/\bperim/.test(normalizedPrompt) && /\begaux?\b/.test(normalizedPrompt)) {
    const names = shapeNamesInPrompt(prompt, model.shapes);
    if (names.length >= 2 && names.every(name => typeof model.perimeters[name] === 'number')) {
      const [first, second] = names;
      const expected = nearlyEqual(model.perimeters[first], model.perimeters[second]);
      return {
        kind: 'boolean',
        expected,
        explanation: `P(${first}) = ${formatNumber(model.perimeters[first])} cm et P(${second}) = ${formatNumber(model.perimeters[second])} cm.`,
      };
    }
  }

  return null;
}

function deterministicGeometryEvaluationForRow(
  problem: ProblemSubmission,
  sectionContext: string | undefined,
  row: ProblemRow,
  language: string
): ProblemRowEvaluation | null {
  const expected = expectedGeometryValueForRow(problem, sectionContext, row);
  if (!expected) return null;

  if (expected.kind === 'number') {
    const submitted = parseNumericStudentAnswer(row.studentAnswer);
    if (submitted === null) return null;
    const isCorrect = nearlyEqual(submitted, expected.expected);
    const correctAnswer = `${formatNumber(expected.expected)} cm`;
    return {
      selectedAnswer: row.studentAnswer || '',
      correctAnswer,
      isCorrect,
      justificationProvided: true,
      justificationSufficient: true,
      status: isCorrect ? 'correct' : 'incorrect',
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? (language === 'fr' ? `Correct : ${expected.explanation}` : `Correct: ${expected.explanation}`)
        : (language === 'fr'
          ? `La réponse attendue est ${correctAnswer}. ${expected.explanation}`
          : `The expected answer is ${correctAnswer}. ${expected.explanation}`),
      explanation: expected.explanation,
    };
  }

  const submitted = parseYesNoStudentAnswer(row.studentAnswer);
  if (submitted === null) return null;
  const isCorrect = submitted === expected.expected;
  return {
    selectedAnswer: row.studentAnswer || '',
    correctAnswer: expected.expected ? 'Oui' : 'Non',
    isCorrect,
    justificationProvided: true,
    justificationSufficient: true,
    status: isCorrect ? 'correct' : 'incorrect',
    score: isCorrect ? 1 : 0,
    feedback: isCorrect
      ? (language === 'fr' ? `Correct : ${expected.explanation}` : `Correct: ${expected.explanation}`)
      : (language === 'fr'
        ? `La réponse attendue est ${expected.expected ? 'Oui' : 'Non'}. ${expected.explanation}`
        : `The expected answer is ${expected.expected ? 'Yes' : 'No'}. ${expected.explanation}`),
    explanation: expected.explanation,
  };
}

function buildDeterministicGeometryEvaluationPayload(
  problem: ProblemSubmission,
  language: string,
  retryRowIds?: Set<string>
): Partial<ProblemSubmission> | null {
  const sections = problem.sections
    .map(section => ({
      id: section.id,
      rows: section.rows
        .filter(row => shouldGradeRow(row, retryRowIds))
        .map(row => ({
          id: row.id,
          label: row.label,
          evaluation: deterministicGeometryEvaluationForRow(problem, section.context, row, language),
        }))
        .filter((row): row is { id: string; label: string; evaluation: ProblemRowEvaluation } => !!row.evaluation),
    }))
    .filter(section => section.rows.length > 0);

  if (sections.length === 0) return null;

  return {
    status: 'evaluated',
    overallFeedback: language === 'fr'
      ? 'Correction locale appliquée pour les calculs de géométrie reconnus.'
      : 'Local grading applied for recognized geometry calculations.',
    missingAnswers: [],
    sections,
  };
}

function targetGroupedRowCount(problem: ProblemSubmission, retryRowIds?: Set<string>): number {
  return problem.sections.reduce((count, section) =>
    count + section.rows.filter(row => shouldGradeRow(row, retryRowIds)).length,
  0);
}

function mergeDeterministicGeometryEvaluations(problem: ProblemSubmission, payload: any, language: string): any {
  if (problem.type !== 'grouped_problem') return payload;
  const deterministic = buildDeterministicGeometryEvaluationPayload(problem, language);
  if (!deterministic?.sections) return payload;

  const byRow = new Map<string, any>();
  deterministic.sections.forEach(section => {
    section.rows.forEach(row => {
      byRow.set(String(row.id), { ...row, sectionId: section.id });
      if (row.label) byRow.set(String(row.label), { ...row, sectionId: section.id });
    });
  });
  const usedRows = new Set<string>();
  const payloadSectionIds = new Set((payload.sections || []).map((section: any) => section.id));

  return {
    ...payload,
    sections: (payload.sections || []).map((section: any) => ({
      ...section,
      rows: [
        ...(section.rows || []).map((row: any) => {
          const deterministicRow = byRow.get(String(row.id)) || byRow.get(String(row.label));
          if (deterministicRow) {
            usedRows.add(String(deterministicRow.id));
            return deterministicRow;
          }
          return row;
        }),
        ...Array.from(byRow.values()).filter(row => {
          const shouldAppend = row.sectionId === section.id && !usedRows.has(String(row.id));
          if (shouldAppend) usedRows.add(String(row.id));
          return shouldAppend;
        }),
      ],
    })).concat(
      (deterministic.sections || [])
        .filter(section => !payloadSectionIds.has(section.id))
        .map(section => ({
          id: section.id,
          rows: section.rows,
        }))
    ),
  };
}

function deterministicEvaluationRowIds(payload: Partial<ProblemSubmission> | null): Set<string> {
  return new Set((payload?.sections || []).flatMap(section =>
    (section.rows || []).map(row => row.id)
  ));
}

function rowsToGrade(problem: ProblemSubmission, retryRowIds?: Set<string>): ProblemRow[] {
  return problem.sections.flatMap(section => section.rows.filter(row => shouldGradeRow(row, retryRowIds)));
}

function unsupportedRowIdsForAi(problem: ProblemSubmission, deterministicPayload: Partial<ProblemSubmission> | null, retryRowIds?: Set<string>): Set<string> {
  const deterministicIds = deterministicEvaluationRowIds(deterministicPayload);
  return new Set(rowsToGrade(problem, retryRowIds)
    .filter(row => !deterministicIds.has(row.id))
    .map(row => row.id));
}

function feedbackOnlyComplainsAboutMissingJustification(evaluation: ProblemRowEvaluation): boolean {
  const text = [
    evaluation.feedback,
    evaluation.explanation,
  ].filter(Boolean).join(' ');
  if (!text.trim()) return false;
  const normalized = stripAccents(text.toLowerCase());
  return /(justification|preuve|evidence|proof|explain|explication)/.test(normalized) &&
    /(missing|absent|provided|requires?|necessaire|necessite|manque|aucune|no\s+justification|sans\s+justification)/.test(normalized);
}

function typedAnswerMatchesEvaluationCorrectAnswer(row: ProblemRow, evaluation: ProblemRowEvaluation): boolean | null {
  const typedNumeric = parseNumericStudentAnswer(row.studentAnswer);
  const expectedNumeric = parseNumericStudentAnswer(evaluation.correctAnswer);
  if (typedNumeric !== null && expectedNumeric !== null) {
    return nearlyEqual(typedNumeric, expectedNumeric);
  }

  const typedYesNo = parseYesNoStudentAnswer(row.studentAnswer);
  const expectedYesNo = parseYesNoStudentAnswer(evaluation.correctAnswer);
  if (typedYesNo !== null && expectedYesNo !== null) {
    return typedYesNo === expectedYesNo;
  }

  return null;
}

function normalizeNoEvidenceNeededMultipartEvaluations(problem: ProblemSubmission, payload: any): any {
  if (problem.type !== 'grouped_problem') return payload;

  const rowsByKey = new Map<string, ProblemRow>();
  problem.sections.forEach(section => {
    section.rows.forEach(row => {
      rowsByKey.set(row.id, row);
      if (row.label) rowsByKey.set(row.label, row);
    });
  });

  return {
    ...payload,
    sections: (payload.sections || []).map((section: any) => ({
      ...section,
      rows: (section.rows || []).map((evaluationRow: any) => {
        const originalRow = rowsByKey.get(evaluationRow.id) || rowsByKey.get(String(evaluationRow.label));
        const evaluation = evaluationRow.evaluation as ProblemRowEvaluation | undefined;
        const requiresProof = originalRow?.rowKind === 'construction' || originalRow?.requiresJustification === true;
        const isNoProofAnswerRow =
          originalRow &&
          !requiresProof &&
          (originalRow.rowKind === 'calculation' || originalRow.rowKind === 'text' || !originalRow.rowKind);
        const canNormalize =
          evaluation &&
          isNoProofAnswerRow &&
          evaluation.isCorrect === true &&
          evaluation.status !== 'correct';

        if (canNormalize) {
          return {
            ...evaluationRow,
            evaluation: {
              ...evaluation,
              status: 'correct',
              justificationProvided: true,
              justificationSufficient: true,
              score: typeof evaluation.score === 'number' && evaluation.score > 0 ? 1 : evaluation.score ?? 1,
            },
          };
        }

        const shouldRemoveMissingJustificationPartial =
          evaluation &&
          isNoProofAnswerRow &&
          (evaluation.status === 'partial' || evaluation.status === 'incomplete') &&
          feedbackOnlyComplainsAboutMissingJustification(evaluation);

        if (!shouldRemoveMissingJustificationPartial || !originalRow || !evaluation) {
          return evaluationRow;
        }

        const answerMatches = typedAnswerMatchesEvaluationCorrectAnswer(originalRow, evaluation);
        if (answerMatches === true || evaluation.isCorrect === true) {
          return {
            ...evaluationRow,
            evaluation: {
              ...evaluation,
              isCorrect: true,
              status: 'correct',
              justificationProvided: true,
              justificationSufficient: true,
              score: 1,
            },
          };
        }

        if (answerMatches === false || evaluation.isCorrect === false) {
          return {
            ...evaluationRow,
            evaluation: {
              ...evaluation,
              isCorrect: false,
              status: 'incorrect',
              justificationProvided: true,
              justificationSufficient: true,
              score: 0,
            },
          };
        }

        return {
          ...evaluationRow,
          evaluation: {
            ...evaluation,
            justificationProvided: true,
            justificationSufficient: true,
          },
        };
      }),
    })),
  };
}

function buildDerivedGeometryContext(problem: ProblemSubmission, retryRowIds?: Set<string>): string | undefined {
  const text = problem.sections.flatMap(section =>
    section.rows
      .filter(row => shouldGradeRow(row, retryRowIds))
      .map(row => geometrySourcesForRow(problem, section.context, row))
  ).join('\n');
  const model = buildGeometryModel(text);
  const parts = [
    ...Object.entries(model.variables).map(([key, value]) => `${key} = ${formatNumber(value)}`),
    ...Object.entries(model.dimensions).map(([key, value]) => `${key} = ${formatNumber(value)}`),
    ...Object.entries(model.perimeters).map(([key, value]) => `P(${key}) = ${formatNumber(value)}`),
  ];

  return parts.length > 0 ? [...new Set(parts)].join('; ') : undefined;
}

function trimSourceBeforeAssertion(source: string, prompt: string, label?: string): string {
  const promptIndex = source.indexOf(prompt);
  if (promptIndex > 0) return source.slice(0, promptIndex);

  if (label) {
    const assertionPattern = new RegExp(`\\bAffirmation\\s+${label}\\b`, 'i');
    const assertionIndex = source.search(assertionPattern);
    if (assertionIndex > 0) return source.slice(0, assertionIndex);
  }

  return source;
}

function hasUsefulNumericContext(text?: string): boolean {
  return extractNumbers(text).length >= 2;
}

function removeOneAssertedValue(numbers: number[], assertedValue: number): number[] {
  const index = numbers.findIndex(value => nearlyEqual(value, assertedValue));
  if (index === -1) return numbers;
  return numbers.filter((_, numberIndex) => numberIndex !== index);
}

function meanMatchesAssertedValue(numbers: number[], assertedValue: number): boolean {
  if (numbers.length < 2) return false;

  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (nearlyEqual(mean, assertedValue)) return true;

  // Raw OCR often includes exercise numbers or later assertion values. Use a
  // contiguous run so original value lists embedded in a full problem still work.
  for (let start = 0; start < numbers.length; start += 1) {
    for (let end = start + 3; end <= Math.min(numbers.length, start + 12); end += 1) {
      const window = numbers.slice(start, end);
      const windowMean = window.reduce((sum, value) => sum + value, 0) / window.length;
      if (nearlyEqual(windowMean, assertedValue)) return true;
    }
  }

  return false;
}

function buildOriginalProblemSources(
  problem: ProblemSubmission,
  sectionContext?: string,
  rowRelatedContext?: string,
  prompt?: string,
  label?: string
): string[] {
  const rawSources = [
    sectionContext,
    rowRelatedContext,
    problem.sharedContext,
    problem.statement,
    problem.rawText,
  ];

  return [...new Set(rawSources
    .filter((source): source is string => !!source?.trim())
    .map(source => prompt ? trimSourceBeforeAssertion(source, prompt, label) : source)
    .filter(source => source.trim().length > 0))];
}

function meanAssertionTruthFromSources(sources: string[], prompt: string): boolean | null {
  if (!/\b(moyenne|mean)\b/i.test(prompt)) return null;

  const promptNumbers = extractNumbers(prompt);
  if (promptNumbers.length === 0) return null;
  const assertedValue = promptNumbers[promptNumbers.length - 1];
  const candidateResults = sources
    .map(source => extractNumbers(source))
    .map(numbers => removeOneAssertedValue(numbers, assertedValue))
    .filter(numbers => numbers.length >= 2)
    .map(numbers => meanMatchesAssertedValue(numbers, assertedValue));

  if (candidateResults.some(Boolean)) return true;
  if (candidateResults.length > 0) return false;
  return null;
}

function rowHasJustificationEvidence(problem: ProblemSubmission, rowId: string, label?: string): boolean {
  return problem.sections.some(section =>
    section.rows.some(row =>
      row.selected &&
      (row.id === rowId || (label && row.label === label)) &&
      (!!row.justification?.trim() ||
        (row.justificationAttachments || []).some(attachment =>
          attachment.extractionStatus === 'extracted' &&
          !!attachment.extractedText?.trim() &&
          isReliableJustificationOcr(attachment)
        ))
    )
  );
}

function isReliableJustificationOcr(attachment: {
  extractedText?: string;
  normalizedText?: string;
  ocrConfidence?: number;
  ocrWarnings?: string[];
}): boolean {
  const text = attachment.normalizedText || attachment.extractedText || '';
  const warnings = (attachment.ocrWarnings || []).join(' ').toLowerCase();
  if (!text.trim()) return false;
  if (typeof attachment.ocrConfidence === 'number' && attachment.ocrConfidence < 0.65) return false;
  if (/\?/.test(text)) return false;
  if (/inconsistent|incoh[ée]rent|uncertain|low confidence|faible confiance|à vérifier|a verifier/.test(warnings)) return false;
  return true;
}

function rowStudentEvidenceTexts(problem: ProblemSubmission, rowId: string, label?: string): string[] {
  return problem.sections.flatMap(section =>
    section.rows
      .filter(row => row.selected && (row.id === rowId || (label && row.label === label)))
      .flatMap(row => [
        row.justification,
        ...(row.justificationAttachments || []).map(attachment => attachment.extractedText),
      ])
      .filter((text): text is string => !!text?.trim())
  );
}

function evaluationClaimsAssertionFalse(evaluation: any): boolean {
  const text = [evaluation?.feedback, evaluation?.explanation, evaluation?.correctAnswer]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\bfalse\b|\bfausse\b|\bfaux\b|ne pas sélectionner|do not select/.test(text);
}

function evidenceHasArithmeticInconsistency(texts: string[]): boolean {
  return texts.some(text => {
    const firstEquation = text.match(/((?:-?\d+(?:[,.]\d+)?\s*[+]\s*)+-?\d+(?:[,.]\d+)?)\s*[:=]\s*(-?\d+(?:[,.]\d+)?)/);
    if (!firstEquation) return false;

    const addends = extractNumbers(firstEquation[1]);
    const expectedSum = parseLocaleNumber(firstEquation[2]);
    if (addends.length < 2 || !Number.isFinite(expectedSum)) return false;

    const actualSum = addends.reduce((sum, value) => sum + value, 0);
    return !nearlyEqual(actualSum, expectedSum);
  });
}

function enforceDeterministicSelectedAssertionTruth(problem: ProblemSubmission, payload: any): any {
  const selectedRows = new Map<string, { sources: string[]; prompt: string; label: string }>();
  problem.sections.forEach(section => {
    section.rows.forEach(row => {
      if (row.selected) {
        const value = {
          sources: buildOriginalProblemSources(problem, section.context, row.relatedContext, row.prompt, row.label),
          prompt: row.prompt,
          label: row.label,
        };
        selectedRows.set(row.id, value);
        selectedRows.set(row.label, value);
      }
    });
  });

  return {
    ...payload,
    sections: (payload.sections || []).map((section: any) => ({
      ...section,
      rows: (section.rows || []).map((row: any) => {
        const source = selectedRows.get(row.id) || selectedRows.get(String(row.label));
        const evaluation = row.evaluation;
        if (!source || !evaluation) return row;

        const truth = meanAssertionTruthFromSources(source.sources, source.prompt);
        if (truth !== true || evaluation.status !== 'incorrect') {
          const evidenceTexts = rowStudentEvidenceTexts(problem, row.id, String(row.label));
          const shouldNeutralizeOcrBasedFalseClaim =
            truth === null &&
            evaluation.status === 'incorrect' &&
            rowHasJustificationEvidence(problem, row.id, String(row.label)) &&
            evaluationClaimsAssertionFalse(evaluation) &&
            evidenceHasArithmeticInconsistency(evidenceTexts);

          if (!shouldNeutralizeOcrBasedFalseClaim) return row;

          return {
            ...row,
            evaluation: {
              ...evaluation,
              isCorrect: undefined,
              justificationProvided: true,
              justificationSufficient: false,
              status: 'partial',
              score: 0.5,
              feedback: 'La justification lue par OCR semble incohérente ou incomplète. Vérifie l’image ou réessaie avec une photo plus lisible.',
              explanation: 'Je ne peux pas conclure que l’affirmation originale est fausse à partir d’une justification OCR incohérente.',
            },
          };
        }

        const hasEvidence = rowHasJustificationEvidence(problem, row.id, String(row.label));
        return {
          ...row,
          evaluation: {
            ...evaluation,
            selectedAnswer: evaluation.selectedAnswer || 'Sélectionnée',
            correctAnswer: evaluation.correctAnswer || 'Sélectionner cette affirmation',
            isCorrect: true,
            justificationProvided: hasEvidence,
            justificationSufficient: hasEvidence ? true : evaluation.justificationSufficient,
            status: hasEvidence ? 'correct' : 'partial',
            score: hasEvidence ? 1 : evaluation.score,
            feedback: hasEvidence
              ? 'Affirmation sélectionnée correcte. La vérité de l’affirmation a été vérifiée avec les données originales du problème.'
              : 'Affirmation sélectionnée correcte, mais une justification lisible est nécessaire.',
            explanation: 'Pour cette affirmation, la correction utilise les nombres du problème original, pas les nombres éventuellement mal lus dans la justification.',
          },
        };
      }),
    })),
  };
}

function fallbackContextForExtractedSection(fallback: ProblemSubmission, sectionIndex: number): string | undefined {
  return fallback.sections[sectionIndex]?.context ||
    fallback.sections[sectionIndex]?.rows.find(row => hasUsefulNumericContext(row.relatedContext))?.relatedContext ||
    fallback.sharedContext ||
    fallback.rawText;
}

function cleanExtractedField(value?: string): string | undefined {
  const cleaned = cleanGroupedProblemDisplayText(value);
  return cleaned || undefined;
}

function firstPartieLine(value?: string): string | undefined {
  const cleaned = cleanExtractedField(value);
  return cleaned?.split('\n').map(line => line.trim()).find(line => /^PARTIE\s+[A-Z]\s*:/i.test(line));
}

function cleanExtractedRowPrompt(value?: string): string {
  const cleaned = cleanGroupedProblemDisplayText(value);
  const numberedMatches = [...cleaned.matchAll(/(?:^|\n)\s*(\d+)\s*[\).]\s*([^\n]+)/g)];
  if (numberedMatches.length > 0) {
    return numberedMatches[numberedMatches.length - 1][2].replace(/\s+/g, ' ').trim();
  }
  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
  return lines[lines.length - 1] || cleaned;
}

function mergeExtractedProblem(fallback: ProblemSubmission, aiPayload: any): ProblemSubmission {
  const extracted = aiPayload?.problemSubmission || aiPayload;
  if (!extracted || !['grouped_choice_problem', 'grouped_problem'].includes(extracted.responseType)) return fallback;
  const isMultipart = extracted.responseType === 'grouped_problem';
  const sharedContext = isMultipart
    ? cleanExtractedField(fallback.sharedContext || extracted.sharedContext || extracted.context)
    : cleanExtractedField(extracted.sharedContext || extracted.context || fallback.sharedContext);

  return {
    ...fallback,
    type: extracted.responseType,
    title: cleanExtractedField(extracted.title) || fallback.title,
    statement: extracted.problemStatement || extracted.statement || fallback.statement,
    instructions: cleanExtractedField(extracted.instructions) || fallback.instructions,
    sharedContext,
    answerType: extracted.answerType || fallback.answerType,
    selectionMode: isMultipart ? undefined : 'select_correct',
    requiresJustification: isMultipart ? false : (extracted.requiresJustification ?? fallback.requiresJustification),
    sections: Array.isArray(extracted.sections) && extracted.sections.length > 0
      ? extracted.sections.map((section: any, sectionIndex: number) => ({
          id: section.id || `${fallback.id}-section-${sectionIndex + 1}`,
          title: isMultipart
            ? (firstPartieLine(section.title || section.context || section.sharedContext) || cleanExtractedField(section.title))
            : cleanExtractedField(section.title),
          label: section.label,
          context: isMultipart
            ? (firstPartieLine(section.context || section.sharedContext || section.title) || fallback.sections[sectionIndex]?.context)
            : hasUsefulNumericContext(section.context || section.sharedContext)
              ? cleanExtractedField(section.context || section.sharedContext)
              : cleanExtractedField(fallbackContextForExtractedSection(fallback, sectionIndex)),
          rows: (section.rows || section.questions || section.assertions || []).map((row: any, rowIndex: number) => ({
            id: row.id || `${fallback.id}-row-${sectionIndex + 1}-${row.label || rowIndex + 1}`,
            label: String(row.label || rowIndex + 1),
            prompt: isMultipart
              ? cleanExtractedRowPrompt(row.prompt || row.statement || row.question || '')
              : cleanExtractedField(row.prompt || row.statement || row.question) || '',
            relatedContext: isMultipart
              ? (firstPartieLine(section.context || section.sharedContext || section.title) || fallback.sections[sectionIndex]?.context)
              : hasUsefulNumericContext(row.relatedContext || section.context)
                ? cleanExtractedField(row.relatedContext || section.context)
                : cleanExtractedField(fallbackContextForExtractedSection(fallback, sectionIndex)),
            answerType: row.answerType || extracted.answerType || fallback.answerType || (isMultipart ? 'text' : 'true_false'),
            rowKind: row.rowKind || (isMultipart ? 'text' : 'choice'),
            options: row.options || extracted.options || (extracted.answerType === 'true_false' ? ['Vrai', 'Faux'] : []),
            requiresJustification: row.requiresJustification ?? (isMultipart ? row.rowKind === 'construction' : extracted.requiresJustification ?? fallback.requiresJustification),
          })).filter((row: any) => row.prompt),
        })).filter((section: any) => section.rows.length > 0)
      : fallback.sections,
    keepGrouped: true,
    status: 'awaiting_student_answer',
    updatedAt: new Date().toISOString(),
  };
}

function groupedGradingError(problem: ProblemSubmission, message: string): ProblemSubmission {
  return {
    ...problem,
    status: 'error',
    error: message,
    updatedAt: new Date().toISOString(),
  };
}

function getGroupedGradingUnavailableMessage(language: string): string {
  return language === 'fr'
    ? 'Le service de correction n’a pas renvoyé une correction groupée exploitable. Tes réponses sont conservées, tu peux réessayer.'
    : 'The grading service did not return a usable grouped correction. Your answers are saved, and you can try again.';
}

function hasValidGroupedEvaluation(payload: any): boolean {
  if (!payload || !Array.isArray(payload.sections)) return false;

  return payload.sections.some((section: any) =>
    Array.isArray(section?.rows) &&
    section.rows.some((row: any) => {
      const evaluation = row?.evaluation;
      return evaluation &&
        typeof evaluation === 'object' &&
        typeof evaluation.status === 'string';
    })
  );
}

function selectedRowIds(problem: ProblemSubmission): Set<string> {
  return new Set(
    problem.sections.flatMap(section =>
      section.rows.filter(row => row.selected).map(row => row.id)
    )
  );
}

function selectedRowLabels(problem: ProblemSubmission): Set<string> {
  return new Set(
    problem.sections.flatMap(section =>
      section.rows.filter(row => row.selected).map(row => row.label)
    )
  );
}

function filterEvaluationToSelectedRows(problem: ProblemSubmission, payload: any): any {
  const ids = selectedRowIds(problem);
  const labels = selectedRowLabels(problem);

  return {
    ...payload,
    missingAnswers: [],
    sections: (payload.sections || [])
      .map((section: any) => ({
        ...section,
        rows: (section.rows || []).filter((row: any) =>
          ids.has(row.id) || labels.has(String(row.label))
        ),
      }))
      .filter((section: any) => section.rows.length > 0),
  };
}

function applyValidGroupedEvaluation(
  problem: ProblemSubmission,
  parsed: any,
  language: string
): ProblemSubmission {
  const deterministicGeometryPayload = problem.type === 'grouped_problem'
    ? buildDeterministicGeometryEvaluationPayload(problem, language)
    : null;
  const deterministicRowCount = deterministicGeometryPayload?.sections?.reduce((count, section) => count + section.rows.length, 0) || 0;
  const allRowsHaveDeterministicGrades =
    deterministicRowCount > 0 && deterministicRowCount === targetGroupedRowCount(problem);

  if (!hasValidGroupedEvaluation(parsed)) {
    if (allRowsHaveDeterministicGrades && deterministicGeometryPayload) {
      return applyGroupedEvaluation(problem, deterministicGeometryPayload);
    }
    return groupedGradingError(problem, getGroupedGradingUnavailableMessage(language));
  }

  const selectedOnly = filterEvaluationToSelectedRows(problem, parsed);
  if (!hasValidGroupedEvaluation(selectedOnly)) {
    if (allRowsHaveDeterministicGrades && deterministicGeometryPayload) {
      return applyGroupedEvaluation(problem, deterministicGeometryPayload);
    }
    return groupedGradingError(problem, getGroupedGradingUnavailableMessage(language));
  }

  return applyGroupedEvaluation(
    problem,
    problem.type === 'grouped_problem'
      ? normalizeNoEvidenceNeededMultipartEvaluations(
          problem,
          mergeDeterministicGeometryEvaluations(problem, selectedOnly, language)
        )
      : enforceDeterministicSelectedAssertionTruth(problem, selectedOnly)
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error('GROUPED_GRADING_TIMEOUT'));
    }, timeoutMs);

    promise
      .then(value => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(error => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function extractProblemSubmission(input: {
  rawText: string;
  attachments?: ProblemSubmission['attachments'];
  selectedModelId: string;
  language: string;
}): Promise<ProblemSubmission> {
  const fallback = createProblemSubmissionFromText({
    rawText: input.rawText,
    attachments: input.attachments,
    extractedText: input.rawText,
  });

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Extract this grouped homework problem. Return only the required JSON.\n\n${input.rawText}`,
        modelId: input.selectedModelId,
        isUnified: true,
        language: input.language,
        customPrompt: PROBLEM_EXTRACTION_PROMPT,
        problemContext: fallback,
        maxTokens: 2500,
      },
    });

    if (error || !data) return fallback;
    const parsed = extractJsonObject(data.problemSubmission || data.content || data);
    return mergeExtractedProblem(fallback, parsed);
  } catch (error) {
    console.warn('[problemSubmissionService] Problem extraction AI failed, using heuristic fallback:', error);
    return fallback;
  }
}

export async function gradeGroupedProblem(input: {
  problem: ProblemSubmission;
  payload: GroupedAnswerPayload;
  selectedModelId: string;
  language: string;
}): Promise<ProblemSubmission> {
  const answeredProblem = applyGroupedAnswers(input.problem, input.payload);
  const retryRowIds = input.payload.isRetry ? new Set(input.payload.retryRowIds || []) : undefined;
  const deterministicGeometryPayload = answeredProblem.type === 'grouped_problem'
    ? buildDeterministicGeometryEvaluationPayload(answeredProblem, input.language, retryRowIds)
    : null;
  const deterministicRowCount = deterministicGeometryPayload?.sections?.reduce((count, section) => count + section.rows.length, 0) || 0;
  const allTargetRowsHaveDeterministicGrades =
    deterministicRowCount > 0 && deterministicRowCount === targetGroupedRowCount(answeredProblem, retryRowIds);
  const aiRowIds = answeredProblem.type === 'grouped_problem'
    ? unsupportedRowIdsForAi(answeredProblem, deterministicGeometryPayload, retryRowIds)
    : retryRowIds;

  if (allTargetRowsHaveDeterministicGrades && deterministicGeometryPayload) {
    return applyGroupedEvaluation(answeredProblem, deterministicGeometryPayload);
  }

  const gradingContext = buildGroupedGradingContext(answeredProblem, aiRowIds);
  const gradingPrompt = answeredProblem.type === 'grouped_problem'
    ? GROUPED_MULTIPART_GRADING_PROMPT
    : GROUPED_GRADING_PROMPT;

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('ai-chat', {
        body: {
          message: `Grade this grouped problem. Return only the required JSON.\n\n${JSON.stringify(gradingContext)}`,
          modelId: input.selectedModelId,
          isUnified: true,
          language: input.language,
          customPrompt: gradingPrompt,
          problemContext: gradingContext,
          maxTokens: 3000,
        },
      }),
      GROUPED_GRADING_TIMEOUT_MS
    );

    if (error || !data) {
      return groupedGradingError(
        answeredProblem,
        input.language === 'fr'
          ? 'La correction prend trop de temps ou a échoué. Tes réponses sont conservées, tu peux réessayer.'
          : 'Grading took too long or failed. Your answers are saved, and you can try again.'
      );
    }
    const parsed = extractJsonObject(data.problemEvaluation || data.content || data);
    return applyValidGroupedEvaluation(answeredProblem, parsed, input.language);
  } catch (error) {
    console.warn('[problemSubmissionService] Grouped grading AI failed:', error);
    return groupedGradingError(
      answeredProblem,
      input.language === 'fr'
        ? 'La correction prend trop de temps. Tes réponses sont conservées, tu peux réessayer.'
        : 'Grading is taking too long. Your answers are saved, and you can try again.'
    );
  }
}

export async function generateGroupedRetryPractice(input: {
  problem: ProblemSubmission;
  rowId?: string;
  selectedModelId: string;
  language: string;
  schoolLevel?: string;
  country?: string;
  curriculum?: string;
  learningStyle?: string;
}): Promise<GroupedRetryPractice> {
  const context = buildGroupedRetryPracticeContext(input.problem, input.rowId, {
    responseLanguage: input.language === 'fr' ? 'French' : 'English',
    schoolLevel: input.schoolLevel,
    country: input.country,
    curriculum: input.curriculum,
    learningStyle: input.learningStyle,
  });
  if (context.selectedRows.length === 0) {
    throw new Error('No evaluated selected rows are available for retry practice.');
  }

  const customPrompt = await loadGroupedRetryPracticePrompt();

  const { data, error } = await withTimeout(
    supabase.functions.invoke('ai-chat', {
      body: {
        message: `Create an Explication for this grouped row. Return only the required JSON.\n\n${JSON.stringify(context)}`,
        modelId: input.selectedModelId,
        isUnified: true,
        language: input.language,
        customPrompt,
        problemContext: context,
        maxTokens: 1800,
      },
    }),
    GROUPED_RETRY_PRACTICE_TIMEOUT_MS
  );

  if (error || !data) {
    throw new Error('Failed to generate similar practice.');
  }

  const parsed = parseGroupedRetryPractice(
    extractJsonObject(data.retryPractice || data.content || data)
  );
  if (!parsed) {
    throw new Error('The practice service did not return a usable similar example.');
  }

  return parsed;
}

export const __problemSubmissionServiceTest = {
  applyValidGroupedEvaluation,
  buildDeterministicGeometryEvaluationPayload,
  buildDerivedGeometryContext,
  buildGroupedGradingContext,
  buildGroupedRetryPracticeContext,
  deterministicGeometryEvaluationForRow,
  enforceDeterministicSelectedAssertionTruth,
  expectedGeometryValueForRow,
  extractJsonObject,
  defaultGroupedRetryPracticePrompt: DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT,
  groupedRetryPracticePrompt: DEFAULT_GROUPED_RETRY_PRACTICE_PROMPT,
  groupedRetryPracticeUsageType: GROUPED_RETRY_PRACTICE_USAGE_TYPE,
  groupedGradingError,
  hasValidGroupedEvaluation,
  hasValidGroupedRetryPractice,
  loadGroupedRetryPracticePrompt,
  mergeExtractedProblem,
  normalizeNoEvidenceNeededMultipartEvaluations,
  parseGroupedRetryPractice,
};
