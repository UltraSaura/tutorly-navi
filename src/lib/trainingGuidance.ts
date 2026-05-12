export type TrainingAnswerType = 'numeric' | 'short_answer' | 'multiple_choice' | 'free_response' | 'math';

export interface TrainingGuidanceHint {
  level: number;
  text: string;
}

export interface TrainingQuestionGuidance {
  hints?: TrainingGuidanceHint[];
  correct_feedback?: string;
  almost_feedback?: string;
  incorrect_feedback?: string;
}

export interface TrainingQuestion {
  id: string;
  label?: string;
  prompt: string;
  answer_type: TrainingAnswerType;
  choices?: unknown[] | null;
  expected_answer?: unknown | null;
  guidance?: TrainingQuestionGuidance | null;
}

export interface GuidanceQuestionState {
  answer: string;
  is_correct: boolean | null;
  hint_level: number;
  feedback: string | null;
}

export type GuidanceStateMap = Record<string, GuidanceQuestionState>;

export function questionStateKey(itemId: string, questionId: string): string {
  return `${itemId}:${questionId}`;
}

export function initialQuestionState(): GuidanceQuestionState {
  return {
    answer: '',
    is_correct: null,
    hint_level: 0,
    feedback: null,
  };
}

export function updateQuestionAnswer(
  states: GuidanceStateMap,
  key: string,
  answer: string,
): GuidanceStateMap {
  const current = states[key] ?? initialQuestionState();
  return {
    ...states,
    [key]: {
      ...current,
      answer,
      is_correct: null,
      feedback: null,
    },
  };
}

export function revealNextHint(
  states: GuidanceStateMap,
  key: string,
  maxHintLevel: number,
): GuidanceStateMap {
  const current = states[key] ?? initialQuestionState();
  return {
    ...states,
    [key]: {
      ...current,
      hint_level: Math.min(current.hint_level + 1, Math.max(maxHintLevel, 0)),
    },
  };
}

export function applyCheckFeedback(
  states: GuidanceStateMap,
  key: string,
  result: { isCorrect: boolean | null; feedback: string },
): GuidanceStateMap {
  const current = states[key] ?? initialQuestionState();
  return {
    ...states,
    [key]: {
      ...current,
      is_correct: result.isCorrect,
      feedback: result.feedback,
    },
  };
}

export function evaluateTrainingAnswer({
  answer,
  expectedAnswer,
  guidance,
  fallbackCorrect = 'Bonne réponse.',
  fallbackAlmost = 'Tu es proche.',
  fallbackIncorrect = 'Essaie d’abord de répondre à cette question.',
}: {
  answer: string;
  expectedAnswer: unknown;
  guidance?: TrainingQuestionGuidance | null;
  fallbackCorrect?: string;
  fallbackAlmost?: string;
  fallbackIncorrect?: string;
}): { isCorrect: boolean | null; feedback: string } {
  const normalizedAnswer = normalizeAnswer(answer);
  if (normalizedAnswer.length === 0) {
    return { isCorrect: null, feedback: fallbackIncorrect };
  }

  const accepted = getAcceptedAnswers(expectedAnswer);
  if (accepted.length === 0) {
    return {
      isCorrect: null,
      feedback: guidance?.almost_feedback ?? fallbackAlmost,
    };
  }

  const isCorrect = accepted.some((value) => normalizeAnswer(value) === normalizedAnswer);
  if (isCorrect) {
    return {
      isCorrect: true,
      feedback: guidance?.correct_feedback ?? fallbackCorrect,
    };
  }

  const isAlmost = accepted.some((value) => {
    const normalizedExpected = normalizeAnswer(value);
    return normalizedAnswer.length > 0 && (
      normalizedExpected.includes(normalizedAnswer)
      || normalizedAnswer.includes(normalizedExpected)
      || numericDistance(normalizedAnswer, normalizedExpected) <= 0.25
    );
  });

  return {
    isCorrect: false,
    feedback: isAlmost
      ? guidance?.almost_feedback ?? fallbackAlmost
      : guidance?.incorrect_feedback ?? fallbackIncorrect,
  };
}

function getAcceptedAnswers(expectedAnswer: unknown): string[] {
  if (expectedAnswer === null || expectedAnswer === undefined) return [];
  if (typeof expectedAnswer === 'string' || typeof expectedAnswer === 'number' || typeof expectedAnswer === 'boolean') {
    return [String(expectedAnswer)];
  }
  if (Array.isArray(expectedAnswer)) return expectedAnswer.map(String);
  if (typeof expectedAnswer === 'object') {
    const record = expectedAnswer as Record<string, unknown>;
    const accepted = Array.isArray(record.accepted) ? record.accepted.map(String) : [];
    if (record.value !== undefined && record.value !== null) accepted.unshift(String(record.value));
    return accepted;
  }
  return [];
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(',', '.');
}

function numericDistance(left: string, right: string): number {
  const a = Number(left.replace(/[^0-9.-]/g, ''));
  const b = Number(right.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b);
}
