import { cleanText } from "../utils/cleanText.ts";

export interface ParsedQuestionCorrection {
  exercise_number: number;
  question_id: string;
  correct_answer: string;
  answer_type: "numeric" | "mcq" | "text";
  explanation_steps: string[];
}

export interface ParsedCorrectionBundle {
  corrections: ParsedQuestionCorrection[];
}

export function parseCorrections(rawText: string): ParsedCorrectionBundle {
  const normalized = rawText.replace(/\r/g, "\n").replace(/\f/g, "\n\n");
  const exerciseBlocks = splitByExercise(normalized);
  const corrections: ParsedQuestionCorrection[] = [];

  for (const block of exerciseBlocks) {
    const questionBlocks = splitByQuestion(block.text);
    for (const qBlock of questionBlocks) {
      const correction = parseQuestionBlock(qBlock.text, block.exerciseNumber, qBlock.questionId);
      if (correction) corrections.push(correction);
    }
  }

  return { corrections };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ExerciseBlock {
  exerciseNumber: number;
  text: string;
}

interface QuestionBlock {
  questionId: string;
  text: string;
}

function splitByExercise(text: string): ExerciseBlock[] {
  const marker = /(?:^|\n)\s*(?:Exercice|EXERCICE)\s+(\d+)\b[^\n]*/gi;
  const matches = [...text.matchAll(marker)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return {
      exerciseNumber: Number.parseInt(match[1] ?? "0", 10),
      text: text.slice(start, end).trim(),
    };
  }).filter((block) => block.exerciseNumber > 0 && block.text.length > 0);
}

function splitByQuestion(text: string): QuestionBlock[] {
  // Match numbered questions: "1.", "2.", "1)", "2)" at start of line
  const numbered = /(?:^|\n)\s*(\d{1,2})\s*[.)]\s+/g;
  const numMatches = [...text.matchAll(numbered)];

  if (numMatches.length >= 1) {
    return numMatches.map((match, index) => {
      const qNum = match[1] ?? String(index + 1);
      const textStart = (match.index ?? 0) + match[0].length;
      const textEnd = numMatches[index + 1]?.index ?? text.length;
      const block = text.slice(textStart, textEnd).trim();

      // Check for lettered sub-questions inside this block
      const lettered = splitLettered(block, qNum);
      return lettered.length > 0 ? lettered : [{ questionId: qNum, text: block }];
    }).flat();
  }

  // Fallback: try lettered only (a., b., c.)
  const lettered = splitLettered(text, "");
  if (lettered.length > 0) return lettered;

  // No question structure — treat whole block as one question
  if (text.trim().length > 0) return [{ questionId: "1", text: text.trim() }];
  return [];
}

function splitLettered(text: string, prefix: string): QuestionBlock[] {
  const marker = /(?:^|\n)\s*([a-z])\s*[.)]\s+/gi;
  const matches = [...text.matchAll(marker)].filter((m) => {
    const letter = (m[1] ?? "").toLowerCase();
    return letter >= "a" && letter <= "h";
  });
  if (matches.length < 2) return [];

  return matches.map((match, index) => {
    const letter = (match[1] ?? "").toLowerCase();
    const textStart = (match.index ?? 0) + match[0].length;
    const textEnd = matches[index + 1]?.index ?? text.length;
    return {
      questionId: prefix ? `${prefix}${letter}` : letter,
      text: text.slice(textStart, textEnd).trim(),
    };
  });
}

function parseQuestionBlock(
  text: string,
  exerciseNumber: number,
  questionId: string,
): ParsedQuestionCorrection | null {
  if (!text || text.length < 2) return null;

  const clean = cleanText(text);
  const mcqAnswer = extractMcqAnswer(clean);
  if (mcqAnswer !== null) {
    return {
      exercise_number: exerciseNumber,
      question_id: questionId,
      correct_answer: mcqAnswer,
      answer_type: "mcq",
      explanation_steps: extractSteps(clean, 4),
    };
  }

  const numericAnswer = extractNumericAnswer(clean);
  if (numericAnswer !== null) {
    return {
      exercise_number: exerciseNumber,
      question_id: questionId,
      correct_answer: numericAnswer,
      answer_type: "numeric",
      explanation_steps: extractSteps(clean, 4),
    };
  }

  // Text answer: use first sentence as the answer
  const firstSentence = (clean.split(/[.!?]/)[0] ?? clean).trim();
  if (firstSentence.length === 0) return null;

  return {
    exercise_number: exerciseNumber,
    question_id: questionId,
    correct_answer: firstSentence,
    answer_type: "text",
    explanation_steps: extractSteps(clean, 4),
  };
}

/** Detect a standalone MCQ letter answer: "Réponse A", "La réponse est B", or trailing "A." / "B." */
function extractMcqAnswer(text: string): string | null {
  const explicit = text.match(/[Rr]éponse\s*:?\s*([A-D])\b/);
  if (explicit?.[1]) return explicit[1].toUpperCase();

  const trailing = text.match(/\b([A-D])\s*[.)]?\s*$/);
  if (trailing?.[1] && /[Rr]éponse|correct|bonne/.test(text)) return trailing[1].toUpperCase();

  return null;
}

/**
 * Extract the last numeric result from a correction block.
 * Handles comma-decimals, units (°C, %, m, cm, …), and spreadsheet formulas.
 */
function extractNumericAnswer(text: string): string | null {
  // Spreadsheet formula
  const formula = text.match(/=\s*[A-Z]+\s*\([^)]+\)/i);
  if (formula?.[0]) return formula[0].replace(/\s+/g, "");

  // Number with optional unit (last occurrence wins)
  const withUnit = [
    ...text.matchAll(/(\d[\d\s]*(?:[,\.]\d+)?)\s*(°C|%|m²|m³|cm|mm|km|kg|g|L|l|€)\b/g),
  ];
  if (withUnit.length > 0) {
    const last = withUnit[withUnit.length - 1];
    return `${(last[1] ?? "").replace(/\s/g, "")} ${last[2] ?? ""}`.trim();
  }

  // Plain number (last occurrence)
  const plain = [...text.matchAll(/\b(\d+(?:[,\.]\d+)?)\b/g)];
  if (plain.length > 0) {
    return (plain[plain.length - 1][1] ?? "").replace(",", ".");
  }

  return null;
}

/** Split text into method steps (sentence-level), clamped to maxSteps. */
function extractSteps(text: string, maxSteps: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÈÊÀÇ])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  // If we can't split by sentences, try by newlines
  const source = sentences.length >= 2 ? sentences : text.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 8);
  return source.slice(0, maxSteps);
}
