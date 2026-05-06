import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SmartLearningResourcesCard } from "@/components/learning/SmartLearningResourcesCard";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useUserContext } from "@/hooks/useUserContext";
import { useHomeworkLearningResources } from "@/hooks/useHomeworkLearningResources";
import { resolveVideoLearningRoute } from "@/services/learningNavigation";
import type { SafeHomeworkLearningRow } from "@/services/homeworkLearningResources";

type HomeworkSmartLearningResourcesCardProps = {
  rows: SafeHomeworkLearningRow[];
  sourceId?: string;
  title?: string;
  onPracticeClick?: () => void;
};

export function HomeworkSmartLearningResourcesCard({
  rows,
  sourceId,
  title,
  onPracticeClick,
}: HomeworkSmartLearningResourcesCardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { userContext } = useUserContext();

  const input = useMemo(() => {
    if (rows.length === 0) return null;
    return {
      rows,
      sourceId,
      title,
      studentId: user?.id,
      subject: "math",
      gradeLevel: userContext?.student_level,
      country: userContext?.country,
      curriculum: userContext?.country ? `${userContext.country} curriculum` : undefined,
      responseLanguage: language,
      limit: 4,
    };
  }, [language, rows, sourceId, title, user?.id, userContext?.country, userContext?.student_level]);

  const {
    data,
    isLoading,
    error,
  } = useHomeworkLearningResources(input);

  const handleVideoClick = useCallback(async (videoId: string) => {
    const route = await resolveVideoLearningRoute(videoId);
    navigate(route);
  }, [navigate]);

  if (!input || (!isLoading && (data?.skillMatches.length || 0) === 0)) return null;

  return (
    <SmartLearningResourcesCard
      source="homework"
      skillMatches={data?.skillMatches || []}
      recommendations={data?.recommendations || []}
      loading={isLoading}
      error={error ? "failed" : undefined}
      onVideoClick={handleVideoClick}
      onQuizClick={(quizId) => {
        const params = new URLSearchParams(searchParams);
        params.set("quiz", quizId);
        navigate({ search: params.toString() }, { replace: true });
      }}
      onPracticeClick={onPracticeClick}
    />
  );
}
