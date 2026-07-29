import type { TrainingQuestion as NewTrainingQuestion } from "@/types/training";
import type { TrainingQuestion as GuidanceTrainingQuestion } from "@/lib/trainingGuidance";

function toAnswerType(type: NewTrainingQuestion["type"]): GuidanceTrainingQuestion["answer_type"] {
  if (type === "numeric") return "numeric";
  if (type === "mcq") return "multiple_choice";
  if (type === "expression") return "math";
  return "short_answer";
}

function toQuestionType(answerType: GuidanceTrainingQuestion["answer_type"]): NewTrainingQuestion["type"] {
  if (answerType === "numeric") return "numeric";
  if (answerType === "multiple_choice") return "mcq";
  if (answerType === "math") return "expression";
  return "text";
}

export function toGuidanceQuestion(question: NewTrainingQuestion): GuidanceTrainingQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    answer_type: toAnswerType(question.type),
    choices: question.choices ?? null,
    expected_answer: undefined,
    guidance: question.guidance
      ? {
          hints: (question.guidance.hints ?? []).map((text, idx) => ({ level: idx + 1, text })),
          correct_feedback: question.guidance.feedback?.correct,
          almost_feedback: question.guidance.feedback?.almost,
          incorrect_feedback: question.guidance.feedback?.incorrect,
        }
      : null,
  };
}

export function toNewQuestion(question: GuidanceTrainingQuestion): NewTrainingQuestion {
  return {
    id: question.id,
    type: toQuestionType(question.answer_type),
    prompt: question.prompt,
    choices: Array.isArray(question.choices) ? (question.choices as unknown[]).map(String) : undefined,
    guidance: {
      hints: (question.guidance?.hints ?? []).map((h) => h.text),
      feedback: {
        correct: question.guidance?.correct_feedback ?? undefined,
        almost: question.guidance?.almost_feedback ?? undefined,
        incorrect: question.guidance?.incorrect_feedback ?? undefined,
      },
    },
  };
}

