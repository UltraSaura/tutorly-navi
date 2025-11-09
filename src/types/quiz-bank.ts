import type { VisualUnion } from "@/lib/quiz/visual-types";

export type Choice = { id: string; label: string; correct?: boolean };

export type BaseQ = {
  id: string;
  prompt: string;
  hint?: string;
  points?: number;
  tags?: string[];
};

export type SingleQ = BaseQ & { kind: "single"; choices: Choice[] };
export type MultiQ = BaseQ & { kind: "multi"; choices: Choice[] };
export type NumericQ = BaseQ & { kind: "numeric"; answer: number; range?: { min: number; max: number } };
export type OrderingQ = BaseQ & { kind: "ordering"; items: string[]; correctOrder: string[] };
export type VisualQ = BaseQ & { kind: "visual"; visual: VisualUnion };

export type Question = SingleQ | MultiQ | NumericQ | OrderingQ | VisualQ;

export type QuizBank = {
  quizBankId: string;
  title: string;
  description?: string;
  timeLimitSec?: number;
  shuffle?: boolean;
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
    questions: Array.isArray(bank.questions) ? bank.questions : [],
  };
}
