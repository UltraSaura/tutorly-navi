import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { trackLearningResourceEvent } from "@/services/learningAnalytics";
import type {
  CurriculumSkillMatch,
  LearningContextSource,
  LearningResourceRecommendation,
} from "@/types/smart-learning";
import {
  getSmartLearningResourcesCopy,
  getVisibleLearningResources,
} from "./smartLearningResourcesCopy";

type SmartLearningResourcesCardProps = {
  source: LearningContextSource;
  skillMatches: CurriculumSkillMatch[];
  recommendations: LearningResourceRecommendation[];
  loading?: boolean;
  error?: string;
  onVideoClick: (videoId: string) => void;
  onQuizClick: (quizId: string) => void;
  onPracticeClick?: () => void;
};

const iconFor = (type: LearningResourceRecommendation["type"]) => {
  if (type === "video") return "▶";
  if (type === "quiz") return "📝";
  return "✏";
};

const normalize = (value?: string) =>
  (value || "").toLowerCase().replace(/\s+/g, " ").trim();

const recommendationMatchesSkill = (
  recommendation: LearningResourceRecommendation,
  skillMatch?: CurriculumSkillMatch,
) => {
  if (!skillMatch) return true;
  if (skillMatch.topicId && recommendation.sourceId === skillMatch.topicId) return true;
  if (recommendation.skillTags.some((tag) => normalize(tag) === normalize(skillMatch.skillTag))) return true;
  const resourceText = normalize([
    recommendation.title,
    recommendation.description,
    ...recommendation.keywords,
    ...recommendation.skillTags,
    ...recommendation.matchReasons,
  ].filter(Boolean).join(" "));
  return skillMatch.keywords.some((keyword) => normalize(keyword).length >= 3 && resourceText.includes(normalize(keyword)));
};

export function SmartLearningResourcesCard({
  source,
  skillMatches,
  recommendations,
  loading,
  error,
  onVideoClick,
  onQuizClick,
  onPracticeClick,
}: SmartLearningResourcesCardProps) {
  const { language } = useLanguage();
  const copy = getSmartLearningResourcesCopy(language, source);
  const topicMatches = useMemo(
    () => skillMatches.slice(0, 3),
    [skillMatches]
  );
  const [selectedSkillTag, setSelectedSkillTag] = useState<string>("");
  const primarySkillMatch = topicMatches.find((match) => match.skillTag === selectedSkillTag) || topicMatches[0];
  const topic = primarySkillMatch?.studentFriendlyLabel || primarySkillMatch?.topic || "";
  const visibleRecommendations = useMemo(() => {
    const selectedRecommendations = recommendations.filter((recommendation) =>
      recommendationMatchesSkill(recommendation, primarySkillMatch)
    );
    return getVisibleLearningResources(selectedRecommendations.length > 0 ? selectedRecommendations : recommendations);
  }, [primarySkillMatch, recommendations]);
  const trackedImpressionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!topicMatches[0]) return;
    setSelectedSkillTag((current) =>
      topicMatches.some((match) => match.skillTag === current)
        ? current
        : topicMatches[0].skillTag
    );
  }, [topicMatches]);

  useEffect(() => {
    if (loading || error || !primarySkillMatch) return;

    const eventName = visibleRecommendations.length > 0
      ? "learning_resources_shown"
      : "resource_recommendation_empty";
    const key = [
      eventName,
      source,
      primarySkillMatch.skillTag,
      primarySkillMatch.topicId || "",
      primarySkillMatch.objectiveId || "",
      visibleRecommendations.map((recommendation) => `${recommendation.type}:${recommendation.id}`).join(","),
    ].join("|");

    if (trackedImpressionKeyRef.current === key) return;
    trackedImpressionKeyRef.current = key;

    trackLearningResourceEvent({
      eventName,
      source,
      skillMatch: primarySkillMatch,
      recommendationCount: visibleRecommendations.length,
    });
  }, [error, loading, primarySkillMatch, source, visibleRecommendations]);

  const trackClick = (recommendation: LearningResourceRecommendation) => {
    const base = {
      source,
      skillMatch: primarySkillMatch,
      recommendation,
      recommendationCount: visibleRecommendations.length,
    };

    trackLearningResourceEvent({
      ...base,
      eventName: "learning_resource_clicked",
    });

    trackLearningResourceEvent({
      ...base,
      eventName:
        recommendation.type === "video"
          ? "recommended_video_clicked"
          : recommendation.type === "quiz"
            ? "recommended_quiz_clicked"
            : "recommended_practice_clicked",
    });
  };

  const handlePracticeClick = () => {
    if (primarySkillMatch) {
      trackClick({
        id: `practice-${primarySkillMatch.skillTag}`,
        type: "practice",
        title: primarySkillMatch.studentFriendlyLabel,
        skillTags: [primarySkillMatch.skillTag],
        keywords: primarySkillMatch.keywords,
        matchScore: 0,
        matchReasons: [primarySkillMatch.studentFriendlyLabel],
        sourceId: primarySkillMatch.topicId,
      });
    }
    onPracticeClick?.();
  };

  if (error) return null;

  return (
    <Card className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{copy.title}</h4>
          {topicMatches.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">{copy.detectedTopic}</p>
              <div className="flex flex-wrap gap-2">
                {topicMatches.map((match) => {
                  const selected = match.skillTag === primarySkillMatch?.skillTag;
                  return (
                    <button
                      key={match.skillTag}
                      type="button"
                      onClick={() => setSelectedSkillTag(match.skillTag)}
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {match.studentFriendlyLabel || match.topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
            <Skeleton className="h-12 rounded-md" />
            <Skeleton className="h-12 rounded-md" />
          </div>
        ) : visibleRecommendations.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
            {onPracticeClick && (
              <Button type="button" variant="outline" size="sm" onClick={handlePracticeClick}>
                <span aria-hidden="true">✏</span>
                {copy.practice}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {visibleRecommendations.map((recommendation) => {
              const section =
                recommendation.type === "video"
                  ? copy.video
                  : recommendation.type === "quiz"
                    ? copy.quiz
                    : copy.practice;
              const click =
                recommendation.type === "video"
                  ? () => {
                      trackClick(recommendation);
                      onVideoClick(recommendation.id);
                    }
                  : recommendation.type === "quiz"
                    ? () => {
                        trackClick(recommendation);
                        onQuizClick(recommendation.id);
                      }
                    : () => {
                        trackClick(recommendation);
                        onPracticeClick?.();
                      };
              const reason = recommendation.matchReasons[0] || topic;

              return (
                <button
                  key={`${recommendation.type}-${recommendation.id}`}
                  type="button"
                  onClick={click}
                  className="flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 text-base" aria-hidden="true">{iconFor(recommendation.type)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium uppercase text-muted-foreground">{section}</span>
                    <span className="block truncate text-sm font-medium text-foreground">{recommendation.title}</span>
                    {reason && (
                      <span className="block text-xs text-muted-foreground">
                        {copy.matchReason} {reason}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
