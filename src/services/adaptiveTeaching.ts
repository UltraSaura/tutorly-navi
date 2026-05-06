import { supabase } from "@/integrations/supabase/client";
import { normalizeLearningStyle, type LearningStyle } from "@/types/learning-style";
import {
  ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG,
  getFeatureFlagEnabled,
} from "./featureFlags";

interface EffectiveLearningStyleInput {
  profileLearningStyle?: string | LearningStyle | null;
  studentId?: string | null;
  concept?: string | null;
  subject?: string | null;
}

interface StyleStats {
  relevantEvents: number;
  answeredAfterSupport: number;
  recommendedStyle?: LearningStyle;
  confidence: number;
}

export interface AdaptiveTeachingReadiness {
  relevantEvents: number;
  answeredAfterSupport: number;
  hasEnoughData: boolean;
}

export type AnalyticsReadinessStatus =
  | "not_enough_data"
  | "collecting_practice_data"
  | "ready";

interface CorrectnessSummary {
  total: number;
  correct: number;
  rate: number | null;
}

interface HintUsageSummary {
  total: number;
  hinted: number;
  rate: number | null;
}

export interface StudentLearningAnalyticsSummary {
  totalRelevantEvents: number;
  answeredPracticeOrQuizEvents: number;
  supportStyleCounts: Record<LearningStyle, number>;
  correctnessBySupportStyle: Record<LearningStyle, CorrectnessSummary>;
  hintUsageBySupportStyle: Record<LearningStyle, HintUsageSummary>;
  quizCorrectnessByQuestionKind: Record<string, CorrectnessSummary>;
  miniPracticeCorrectnessByQuestionType: Record<string, CorrectnessSummary>;
  mostHelpfulSupportStyle: LearningStyle | null;
  confidence: number;
  readinessStatus: AnalyticsReadinessStatus;
  evidenceMessage: string;
}

type LearningAnalyticsEventRow = {
  event_type?: string | null;
  learning_style_used?: string | null;
  support_type?: string | null;
  practice_style?: string | null;
  question_kind?: string | null;
  was_correct?: boolean | null;
  hint_used?: boolean | null;
};

export const MIN_RELEVANT_EVENTS = 20;
export const MIN_ANSWERED_AFTER_SUPPORT = 5;
const MIN_CONFIDENCE = 0.6;
const MIN_STYLE_ANSWER_SAMPLE = 3;
const MIN_STYLE_ADVANTAGE = 0.15;
const ANSWERED_AFTER_SUPPORT_EVENTS = [
  "runtime_mini_practice_answered",
  "quiz_answer_after_remediation",
] as const;
const ANSWERED_PRACTICE_OR_QUIZ_EVENTS = [
  "runtime_mini_practice_answered",
  "quiz_answer_submitted",
  "quiz_answer_after_remediation",
] as const;
const QUIZ_ANSWER_EVENTS = [
  "quiz_answer_submitted",
  "quiz_answer_after_remediation",
] as const;
const SUPPORT_STYLES: LearningStyle[] = ["visual", "auditory", "kinesthetic", "mixed"];

function emptyCorrectness(): CorrectnessSummary {
  return { total: 0, correct: 0, rate: null };
}

function emptyHintUsage(): HintUsageSummary {
  return { total: 0, hinted: 0, rate: null };
}

function incrementCorrectness(
  target: Record<string, CorrectnessSummary>,
  key: string,
  wasCorrect: boolean | null | undefined
) {
  if (typeof wasCorrect !== "boolean") return;
  const current = target[key] || emptyCorrectness();
  current.total += 1;
  if (wasCorrect) current.correct += 1;
  current.rate = current.correct / current.total;
  target[key] = current;
}

function incrementHintUsage(
  target: Record<string, HintUsageSummary>,
  key: string,
  hintUsed: boolean | null | undefined
) {
  if (typeof hintUsed !== "boolean") return;
  const current = target[key] || emptyHintUsage();
  current.total += 1;
  if (hintUsed) current.hinted += 1;
  current.rate = current.hinted / current.total;
  target[key] = current;
}

function eventStyle(event: LearningAnalyticsEventRow): LearningStyle {
  return normalizeLearningStyle(event.support_type || event.practice_style || event.learning_style_used);
}

function readinessStatus(totalRelevantEvents: number, answeredAfterSupport: number): AnalyticsReadinessStatus {
  if (totalRelevantEvents < MIN_RELEVANT_EVENTS) return "not_enough_data";
  if (answeredAfterSupport < MIN_ANSWERED_AFTER_SUPPORT) return "collecting_practice_data";
  return "ready";
}

export function summarizeLearningAnalyticsEvents(
  events: LearningAnalyticsEventRow[]
): StudentLearningAnalyticsSummary {
  const supportStyleCounts = Object.fromEntries(
    SUPPORT_STYLES.map(style => [style, 0])
  ) as Record<LearningStyle, number>;
  const correctnessBySupportStyle = Object.fromEntries(
    SUPPORT_STYLES.map(style => [style, emptyCorrectness()])
  ) as Record<LearningStyle, CorrectnessSummary>;
  const hintUsageBySupportStyle = Object.fromEntries(
    SUPPORT_STYLES.map(style => [style, emptyHintUsage()])
  ) as Record<LearningStyle, HintUsageSummary>;
  const quizCorrectnessByQuestionKind: Record<string, CorrectnessSummary> = {};
  const miniPracticeCorrectnessByQuestionType: Record<string, CorrectnessSummary> = {};

  let answeredPracticeOrQuizEvents = 0;
  let answeredAfterSupport = 0;

  events.forEach(event => {
    const style = eventStyle(event);
    supportStyleCounts[style] += 1;

    if (ANSWERED_PRACTICE_OR_QUIZ_EVENTS.includes(event.event_type as any)) {
      answeredPracticeOrQuizEvents += 1;
      incrementCorrectness(correctnessBySupportStyle, style, event.was_correct);
      incrementHintUsage(hintUsageBySupportStyle, style, event.hint_used);
    }

    if (ANSWERED_AFTER_SUPPORT_EVENTS.includes(event.event_type as any)) {
      answeredAfterSupport += 1;
    }

    if (QUIZ_ANSWER_EVENTS.includes(event.event_type as any) && event.question_kind) {
      incrementCorrectness(quizCorrectnessByQuestionKind, event.question_kind, event.was_correct);
    }

    if (event.event_type === "runtime_mini_practice_answered" && event.question_kind) {
      incrementCorrectness(miniPracticeCorrectnessByQuestionType, event.question_kind, event.was_correct);
    }
  });

  const rankedStyles = SUPPORT_STYLES
    .map(style => ({ style, ...correctnessBySupportStyle[style] }))
    .filter(score => score.total >= MIN_STYLE_ANSWER_SAMPLE && score.rate !== null)
    .sort((a, b) => (b.rate || 0) - (a.rate || 0));
  const best = rankedStyles[0];
  const second = rankedStyles[1];
  const confidence = best?.rate || 0;
  const advantage = best ? confidence - (second?.rate || 0) : 0;
  const status = readinessStatus(events.length, answeredAfterSupport);
  const mostHelpfulSupportStyle =
    status === "ready" &&
    best &&
    confidence >= MIN_CONFIDENCE &&
    advantage >= MIN_STYLE_ADVANTAGE
      ? best.style
      : null;

  return {
    totalRelevantEvents: events.length,
    answeredPracticeOrQuizEvents: answeredAfterSupport,
    supportStyleCounts,
    correctnessBySupportStyle,
    hintUsageBySupportStyle,
    quizCorrectnessByQuestionKind,
    miniPracticeCorrectnessByQuestionType,
    mostHelpfulSupportStyle,
    confidence,
    readinessStatus: status,
    evidenceMessage: mostHelpfulSupportStyle
      ? "early_signal"
      : "not_enough_evidence",
  };
}

async function getStyleStats(input: EffectiveLearningStyleInput): Promise<StyleStats> {
  if (!input.studentId) {
    return { relevantEvents: 0, answeredAfterSupport: 0, confidence: 0 };
  }

  let query = (supabase as any)
    .from("learning_interaction_events")
    .select("event_type, support_type, practice_style, was_correct, hint_used, time_to_answer_ms")
    .eq("student_id", input.studentId)
    .limit(200);

  if (input.subject) query = query.eq("subject", input.subject);
  if (input.concept) query = query.eq("concept", input.concept);

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    if (import.meta.env.DEV && error) {
      console.debug("[AdaptiveTeaching] Could not read analytics:", error.message);
    }
    return { relevantEvents: 0, answeredAfterSupport: 0, confidence: 0 };
  }

  const relevantEvents = data.length;
  const answeredEvents = data.filter((event: any) =>
    ANSWERED_AFTER_SUPPORT_EVENTS.includes(event.event_type)
  );
  const answeredAfterSupport = answeredEvents.length;

  const scores = new Map<LearningStyle, { total: number; correct: number }>();
  answeredEvents.forEach((event: any) => {
    const style = normalizeLearningStyle(event.support_type || event.practice_style);
    const current = scores.get(style) || { total: 0, correct: 0 };
    current.total += 1;
    if (event.was_correct === true) current.correct += 1;
    scores.set(style, current);
  });

  let recommendedStyle: LearningStyle | undefined;
  let confidence = 0;
  scores.forEach((score, style) => {
    const rate = score.total ? score.correct / score.total : 0;
    if (rate > confidence) {
      recommendedStyle = style;
      confidence = rate;
    }
  });

  return { relevantEvents, answeredAfterSupport, recommendedStyle, confidence };
}

export async function getAdaptiveTeachingReadiness(): Promise<AdaptiveTeachingReadiness> {
  try {
    const [
      { count: relevantEvents, error: relevantError },
      { count: answeredAfterSupport, error: answeredError },
    ] = await Promise.all([
      (supabase as any)
        .from("learning_interaction_events")
        .select("id", { count: "exact", head: true }),
      (supabase as any)
        .from("learning_interaction_events")
        .select("id", { count: "exact", head: true })
        .in("event_type", ANSWERED_AFTER_SUPPORT_EVENTS),
    ]);

    if (relevantError || answeredError) {
      if (import.meta.env.DEV) {
        console.debug("[AdaptiveTeaching] Could not read readiness:", relevantError?.message || answeredError?.message);
      }
      return { relevantEvents: 0, answeredAfterSupport: 0, hasEnoughData: false };
    }

    const relevant = relevantEvents || 0;
    const answered = answeredAfterSupport || 0;
    return {
      relevantEvents: relevant,
      answeredAfterSupport: answered,
      hasEnoughData: relevant >= MIN_RELEVANT_EVENTS && answered >= MIN_ANSWERED_AFTER_SUPPORT,
    };
  } catch (error) {
    if (import.meta.env.DEV) console.debug("[AdaptiveTeaching] Readiness check failed:", error);
    return { relevantEvents: 0, answeredAfterSupport: 0, hasEnoughData: false };
  }
}

export async function getStudentLearningAnalyticsSummary(
  studentId?: string | null
): Promise<StudentLearningAnalyticsSummary> {
  try {
    let query = (supabase as any)
      .from("learning_interaction_events")
      .select("event_type, learning_style_used, support_type, practice_style, question_kind, was_correct, hint_used")
      .limit(1000);

    if (studentId) query = query.eq("student_id", studentId);

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      if (import.meta.env.DEV && error) {
        console.debug("[AdaptiveTeaching] Could not read analytics summary:", error.message);
      }
      return summarizeLearningAnalyticsEvents([]);
    }

    return summarizeLearningAnalyticsEvents(data);
  } catch (error) {
    if (import.meta.env.DEV) console.debug("[AdaptiveTeaching] Analytics summary failed:", error);
    return summarizeLearningAnalyticsEvents([]);
  }
}

export async function getEffectiveLearningStyle({
  profileLearningStyle,
  studentId,
  concept,
  subject,
}: EffectiveLearningStyleInput): Promise<LearningStyle> {
  const profileStyle = normalizeLearningStyle(profileLearningStyle);
  const enabled = await getFeatureFlagEnabled(ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG);

  if (!enabled) return profileStyle;

  const stats = await getStyleStats({ profileLearningStyle, studentId, concept, subject });
  if (
    stats.relevantEvents < MIN_RELEVANT_EVENTS ||
    stats.answeredAfterSupport < MIN_ANSWERED_AFTER_SUPPORT ||
    !stats.recommendedStyle ||
    stats.confidence < MIN_CONFIDENCE
  ) {
    return profileStyle;
  }

  // Future rollout: callers should still keep mixed/varied support around 30%
  // instead of always using this returned recommendation.
  return stats.recommendedStyle;
}
