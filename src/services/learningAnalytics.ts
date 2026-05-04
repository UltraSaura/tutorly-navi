import { supabase } from "@/integrations/supabase/client";
import { normalizeLearningStyle, type LearningStyle } from "@/types/learning-style";

export type LearningInteractionEventType =
  | "explanation_opened"
  | "explanation_style_support_viewed"
  | "explanation_check_started"
  | "runtime_mini_practice_generated"
  | "runtime_mini_practice_answered"
  | "runtime_mini_practice_hint_clicked"
  | "runtime_mini_practice_try_again_clicked"
  | "runtime_mini_practice_try_another_clicked"
  | "quiz_started"
  | "quiz_question_viewed"
  | "quiz_answer_submitted"
  | "quiz_wrong_answer"
  | "quiz_hint_clicked"
  | "quiz_completed"
  | "quiz_remediation_clicked"
  | "quiz_remediation_opened"
  | "quiz_answer_after_remediation"
  | "grouped_retry_opened"
  | "grouped_learning_style_support_viewed"
  | "learning_preference_changed";

export type LearningSupportType = LearningStyle;
export type PracticeStyle = LearningStyle;

export interface LearningInteractionEventInput {
  studentId?: string | null;
  eventType: LearningInteractionEventType;
  learningStyleUsed?: string | LearningStyle | null;
  supportType?: string | LearningSupportType | null;
  practiceStyle?: string | PracticeStyle | null;
  subject?: string | null;
  concept?: string | null;
  skillTag?: string | null;
  topicId?: string | null;
  objectiveId?: string | null;
  quizId?: string | null;
  questionId?: string | null;
  questionKind?: string | null;
  visualSubtype?: string | null;
  difficulty?: string | null;
  wasCorrect?: boolean | null;
  attemptNumber?: number | null;
  hintUsed?: boolean | null;
  timeToAnswerMs?: number | null;
  metadata?: Record<string, unknown>;
}

const ALLOWED_STYLE_VALUES = new Set(["visual", "auditory", "kinesthetic", "mixed"]);
const ALLOWED_QUESTION_KINDS = new Set([
  "single",
  "multi",
  "numeric",
  "ordering",
  "visual",
  "multiple_choice",
  "short_answer",
]);

const SENSITIVE_METADATA_KEYS = new Set([
  "answer",
  "studentAnswer",
  "student_answer",
  "prompt",
  "rawPrompt",
  "rawResponse",
  "aiResponse",
  "fullText",
  "email",
  "name",
]);

function nullableText(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function nullableUuid(value: unknown): string | null {
  const text = nullableText(value, 80);
  return text && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function styleValue(value: unknown): LearningStyle | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeLearningStyle(value);
  return ALLOWED_STYLE_VALUES.has(normalized) ? normalized : null;
}

function questionKindValue(value: unknown): string | null {
  const kind = nullableText(value, 40);
  return kind && ALLOWED_QUESTION_KINDS.has(kind) ? kind : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};

  const cleanEntries = Object.entries(metadata)
    .filter(([key, value]) => !SENSITIVE_METADATA_KEYS.has(key) && value !== undefined)
    .slice(0, 20)
    .map(([key, value]) => {
      if (typeof value === "string") return [key, value.slice(0, 160)] as const;
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value] as const;
      if (Array.isArray(value)) return [key, value.slice(0, 10).map(item => String(item).slice(0, 80))] as const;
      return [key, String(value).slice(0, 160)] as const;
    });

  return Object.fromEntries(cleanEntries);
}

export async function trackLearningInteractionEvent(
  input: LearningInteractionEventInput
): Promise<void> {
  try {
    const explicitStudentId = nullableUuid(input.studentId);
    const studentId = explicitStudentId || (await supabase.auth.getUser()).data.user?.id;
    if (!studentId) return;

    const payload = {
      student_id: studentId,
      event_type: input.eventType,
      learning_style_used: styleValue(input.learningStyleUsed),
      support_type: styleValue(input.supportType),
      practice_style: styleValue(input.practiceStyle),
      subject: nullableText(input.subject),
      concept: nullableText(input.concept),
      skill_tag: nullableText(input.skillTag),
      topic_id: nullableUuid(input.topicId),
      objective_id: nullableUuid(input.objectiveId),
      quiz_id: nullableText(input.quizId, 120),
      question_id: nullableText(input.questionId, 120),
      question_kind: questionKindValue(input.questionKind),
      visual_subtype: nullableText(input.visualSubtype, 80),
      difficulty: nullableText(input.difficulty, 80),
      was_correct: typeof input.wasCorrect === "boolean" ? input.wasCorrect : null,
      attempt_number: numberValue(input.attemptNumber),
      hint_used: typeof input.hintUsed === "boolean" ? input.hintUsed : null,
      time_to_answer_ms: numberValue(input.timeToAnswerMs),
      metadata: sanitizeMetadata(input.metadata),
    };

    const { error } = await (supabase as any)
      .from("learning_interaction_events")
      .insert(payload);

    if (error && import.meta.env.DEV) {
      console.debug("[LearningAnalytics] Event not recorded:", error.message);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[LearningAnalytics] Event tracking failed:", error);
    }
  }
}

export function trackLearningInteraction(input: LearningInteractionEventInput): void {
  void trackLearningInteractionEvent(input);
}

// Future adaptive scoring can aggregate by student_id + concept/skill_tag and compare:
// correctness after support, hint reduction, answer-time changes, and repeated mistakes.
// Keep mixed practice in the rotation so analytics suggest support, not fixed learner labels.
