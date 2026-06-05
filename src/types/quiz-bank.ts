import type { VisualUnion } from "@/lib/quiz/visual-types";

export type Choice = { id: string; label: string; correct?: boolean };

export type QuizBankSourceType = 'manual' | 'video_transcript' | 'multi_video_transcript' | 'topic_generated';

export type BaseQ = {
  id: string;
  prompt: string;
  hint?: string;
  points?: number;
  tags?: string[];
  /** Optional read-only visual shown above the question (e.g. a cake/pie diagram for fraction questions) */
  context_visual?: VisualUnion;
};

export type SingleQ = BaseQ & { kind: "single"; choices: Choice[] };
export type MultiQ = BaseQ & { kind: "multi"; choices: Choice[] };
export type NumericQ = BaseQ & { kind: "numeric"; answer: number; range?: { min: number; max: number }; answerFormat?: "number" | "fraction"; fractionAnswer?: { numerator: number; denominator: number }; dragOptions?: number[] };
export type OrderingQ = BaseQ & { kind: "ordering"; items: string[]; correctOrder: string[] };
export type VisualQ = BaseQ & { kind: "visual"; visual: VisualUnion };
export type OperationPoseeQ = BaseQ & {
  kind: "operation-posee";
  operation: "addition" | "subtraction";
  topNumber: number;
  bottomNumber: number;
  locale?: "fr" | "en";
};

export interface SliderQuestion {
  id: string;
  kind: "slider";
  prompt: string;
  min: number;
  max: number;
  step: number;
  answer: number;
  tolerance: number;
  unit?: string;
  trackLabel?: string;
  hint?: string;
  locale?: string;
  points?: number;
  tags?: string[];
}

export interface MatchQuestion {
  id: string;
  kind: "match";
  prompt: string;
  pairs: Array<{
    leftId: string;
    left: string;
    rightId: string;
    right: string;
  }>;
  /** When true, fraction/decimal text is hidden on items that render a pie — students must count slices */
  hide_labels?: boolean;
  hint?: string;
  locale?: string;
  points?: number;
  tags?: string[];
}

export interface FillExprQuestion {
  id: string;
  kind: "fill-expr";
  prompt: string;
  template: string;
  blanks: string[];
  chips: string[];
  answers: Record<string, string>;
  hint?: string;
  locale?: string;
  points?: number;
  tags?: string[];
}

export type Question = SingleQ | MultiQ | NumericQ | OrderingQ | VisualQ | OperationPoseeQ | SliderQuestion | MatchQuestion | FillExprQuestion;

export type QuizBank = {
  quizBankId: string;
  title: string;
  description?: string;
  timeLimitSec?: number;
  shuffle?: boolean;
  language?: string;
  sourceLanguage?: string;
  schoolLevels?: string[];
  subjectId?: string | null;
  primaryTopicId?: string | null;
  sourceTopicIds?: string[];
  questions: Question[];
};

export type BankAssignment = {
  id: string;
  bankId: string;
  topicId?: string;
  triggerAfterNVideos?: number;
  videoIds?: string[];
  minCompletedInSet?: number;
  isActive: boolean;
};

export const DEFAULT_BANK: QuizBank = {
  quizBankId: "__empty__",
  title: "Quiz unavailable",
  description: "",
  timeLimitSec: 0,
  shuffle: false,
  questions: [],
};

export function ensureQuizBank(bank?: Partial<QuizBank> | null): QuizBank {
  if (!bank) return DEFAULT_BANK;
  return {
    quizBankId: bank.quizBankId ?? DEFAULT_BANK.quizBankId,
    title: bank.title ?? DEFAULT_BANK.title,
    description: bank.description ?? DEFAULT_BANK.description,
    timeLimitSec: bank.timeLimitSec ?? DEFAULT_BANK.timeLimitSec,
    shuffle: bank.shuffle ?? DEFAULT_BANK.shuffle,
    language: bank.language,
    sourceLanguage: bank.sourceLanguage,
    schoolLevels: Array.isArray(bank.schoolLevels) ? bank.schoolLevels : [],
    subjectId: bank.subjectId ?? null,
    primaryTopicId: bank.primaryTopicId ?? null,
    sourceTopicIds: Array.isArray(bank.sourceTopicIds) ? bank.sourceTopicIds : [],
    questions: Array.isArray(bank.questions) ? bank.questions : [],
  };
}
