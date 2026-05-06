import type { ProblemRowKind, ProblemRowStatus, ProblemSubmission } from "@/types/chat";
import type { CurriculumSkillMatch, LearningResourceRecommendation } from "@/types/smart-learning";
import {
  extractLearningContext,
  getRecommendedLearningResources,
} from "@/services/smartLearningResources";

export type SafeHomeworkLearningRow = {
  label?: string;
  prompt?: string;
  rowKind?: ProblemRowKind;
  detectedConcept?: string;
  gradingExplanation?: string;
  status?: ProblemRowStatus;
};

export type HomeworkLearningResourcesInput = {
  rows: SafeHomeworkLearningRow[];
  sourceId?: string;
  title?: string;
  subject?: string;
  gradeLevel?: string;
  country?: string;
  curriculum?: string;
  responseLanguage?: string;
  studentId?: string;
  limit?: number;
};

const MAX_ROWS_FOR_SKILL_EXTRACTION = 8;
const MAX_SKILLS = 3;

const clean = (value?: string | null) =>
  (value || "")
    .replace(/\s+/g, " ")
    .trim();

const usefulExplanation = (value?: string) => {
  const text = clean(value);
  if (!text) return undefined;
  if (text.length > 280) return `${text.slice(0, 277)}...`;
  return text;
};

const rowToLearningText = (row: SafeHomeworkLearningRow) =>
  [
    row.label ? `Label: ${row.label}` : "",
    row.rowKind ? `Kind: ${row.rowKind}` : "",
    row.prompt ? `Prompt: ${clean(row.prompt)}` : "",
    row.detectedConcept ? `Concept: ${clean(row.detectedConcept)}` : "",
    row.gradingExplanation ? `Feedback: ${usefulExplanation(row.gradingExplanation)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

export function buildSafeHomeworkLearningRows(problem: ProblemSubmission): SafeHomeworkLearningRow[] {
  return problem.sections.flatMap((section) =>
    section.rows
      .filter((row) => row.evaluation || row.prompt?.trim())
      .map((row) => ({
        label: clean(row.label),
        prompt: clean(row.prompt),
        rowKind: row.rowKind,
        gradingExplanation: usefulExplanation(row.evaluation?.explanation || row.evaluation?.feedback),
        status: row.evaluation?.status,
      }))
  );
}

function rowStruggled(row: SafeHomeworkLearningRow) {
  return !!row.status && row.status !== "correct";
}

function matchKey(match: CurriculumSkillMatch) {
  return match.topicId || match.objectiveId || match.skillTag || match.studentFriendlyLabel;
}

function aggregateSkillMatches(
  rowMatches: Array<{ row: SafeHomeworkLearningRow; matches: CurriculumSkillMatch[] }>,
  fallbackMatches: CurriculumSkillMatch[],
): CurriculumSkillMatch[] {
  const grouped = new Map<string, {
    match: CurriculumSkillMatch;
    confidenceTotal: number;
    confidenceMax: number;
    frequency: number;
    struggled: boolean;
  }>();

  for (const { row, matches } of rowMatches) {
    for (const match of matches.slice(0, 3)) {
      const key = matchKey(match);
      const existing = grouped.get(key);
      if (existing) {
        existing.confidenceTotal += match.confidence;
        existing.confidenceMax = Math.max(existing.confidenceMax, match.confidence);
        existing.frequency += 1;
        existing.struggled = existing.struggled || rowStruggled(row);
      } else {
        grouped.set(key, {
          match,
          confidenceTotal: match.confidence,
          confidenceMax: match.confidence,
          frequency: 1,
          struggled: rowStruggled(row),
        });
      }
    }
  }

  const ranked = Array.from(grouped.values())
    .map((item) => ({
      ...item,
      score: item.confidenceMax * 100 + item.frequency * 10 + (item.struggled ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      ...item.match,
      confidence: Math.max(item.confidenceMax, item.confidenceTotal / item.frequency),
    }));

  return (ranked.length > 0 ? ranked : fallbackMatches).slice(0, MAX_SKILLS);
}

export async function getHomeworkLearningResources({
  rows,
  sourceId,
  title,
  subject = "math",
  gradeLevel,
  country,
  curriculum,
  responseLanguage = "en",
  studentId,
  limit = 4,
}: HomeworkLearningResourcesInput): Promise<{
  skillMatches: CurriculumSkillMatch[];
  recommendations: LearningResourceRecommendation[];
}> {
  const safeRows = rows
    .map((row) => ({
      ...row,
      label: clean(row.label),
      prompt: clean(row.prompt),
      detectedConcept: clean(row.detectedConcept),
      gradingExplanation: usefulExplanation(row.gradingExplanation),
    }))
    .filter((row) => row.prompt || row.detectedConcept || row.gradingExplanation)
    .slice(0, MAX_ROWS_FOR_SKILL_EXTRACTION);

  if (safeRows.length === 0) return { skillMatches: [], recommendations: [] };

  try {
    const rowMatches = await Promise.all(
      safeRows.map(async (row) => ({
        row,
        matches: await extractLearningContext({
          source: "homework",
          sourceId,
          title,
          text: rowToLearningText(row),
          subject,
          gradeLevel,
          country,
          curriculum,
          responseLanguage,
        }),
      }))
    );

    const combinedText = safeRows.map(rowToLearningText).join("\n\n");
    const fallbackMatches = await extractLearningContext({
      source: "homework",
      sourceId,
      title,
      text: combinedText,
      subject,
      gradeLevel,
      country,
      curriculum,
      responseLanguage,
    });

    const skillMatches = aggregateSkillMatches(rowMatches, fallbackMatches);
    if (skillMatches.length === 0) return { skillMatches: [], recommendations: [] };

    const recommendations = await getRecommendedLearningResources({
      studentId,
      skillMatches,
      gradeLevel,
      country,
      language: responseLanguage,
      limit,
    });

    return { skillMatches, recommendations };
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[homework-learning] resources failed", error);
    return { skillMatches: [], recommendations: [] };
  }
}

export const __homeworkLearningResourcesTest = {
  aggregateSkillMatches,
  rowToLearningText,
};
