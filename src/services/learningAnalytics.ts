import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  CurriculumSkillMatch,
  LearningContextSource,
  LearningResourceRecommendation,
} from "@/types/smart-learning";

export type LearningResourceAnalyticsEvent =
  | "learning_resources_shown"
  | "learning_resource_clicked"
  | "recommended_video_clicked"
  | "recommended_quiz_clicked"
  | "recommended_practice_clicked"
  | "resource_recommendation_empty";

type LearningResourceAnalyticsInput = {
  eventName: LearningResourceAnalyticsEvent;
  source: LearningContextSource;
  skillMatch?: CurriculumSkillMatch;
  recommendation?: LearningResourceRecommendation;
  recommendationCount?: number;
};

export function buildLearningResourceAnalyticsMetadata({
  source,
  skillMatch,
  recommendation,
  recommendationCount,
}: Omit<LearningResourceAnalyticsInput, "eventName">): Record<string, Json> {
  const metadata: Record<string, Json> = {
    source,
  };

  if (skillMatch?.skillTag) metadata.skillTag = skillMatch.skillTag;
  if (skillMatch?.topicId) metadata.topicId = skillMatch.topicId;
  if (skillMatch?.objectiveId) metadata.objectiveId = skillMatch.objectiveId;
  if (typeof recommendationCount === "number") metadata.recommendationCount = recommendationCount;

  if (recommendation) {
    metadata.resourceType = recommendation.type;
    metadata.resourceId = recommendation.id;
    metadata.matchScore = recommendation.matchScore;
  }

  return metadata;
}

export function trackLearningResourceEvent(input: LearningResourceAnalyticsInput) {
  void (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("learning_interaction_events").insert({
        user_id: user.id,
        event_name: input.eventName,
        metadata: buildLearningResourceAnalyticsMetadata(input),
      });

      if (error && import.meta.env.DEV) {
        console.warn("[learning-analytics] event insert failed", error.message);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[learning-analytics] event tracking failed", error);
      }
    }
  })();
}
