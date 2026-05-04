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

const MIN_RELEVANT_EVENTS = 20;
const MIN_ANSWERED_AFTER_SUPPORT = 5;
const MIN_CONFIDENCE = 0.6;
const ANSWERED_AFTER_SUPPORT_EVENTS = [
  "runtime_mini_practice_answered",
  "quiz_answer_after_remediation",
] as const;

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
