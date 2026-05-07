import { useQuery } from "@tanstack/react-query";
import { BarChart3, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/SimpleLanguageContext";
import {
  getStudentLearningAnalyticsSummary,
  type StudentLearningAnalyticsSummary,
} from "@/services/adaptiveTeaching";
import {
  ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG,
  getFeatureFlagEnabled,
} from "@/services/featureFlags";
import type { LearningStyle } from "@/types/learning-style";

interface LearningInsightsCardProps {
  studentId?: string | null;
}

const supportMessages: Record<LearningStyle, { en: string; fr: string; suggestionEn: string; suggestionFr: string }> = {
  visual: {
    en: "Pictures and diagrams seem helpful for this student.",
    fr: "Les images et les schémas semblent aider cet élève.",
    suggestionEn: "Try asking the student to draw the problem or use a number line.",
    suggestionFr: "Essayez de demander à l’élève de dessiner le problème ou d’utiliser une droite graduée.",
  },
  auditory: {
    en: "Simple verbal explanations and memory phrases seem helpful.",
    fr: "Les explications orales simples et les phrases mémo semblent utiles.",
    suggestionEn: "Ask the student to explain the idea out loud in one sentence.",
    suggestionFr: "Demandez à l’élève d’expliquer l’idée à voix haute en une phrase.",
  },
  kinesthetic: {
    en: "Step-by-step action practice seems helpful.",
    fr: "Les exercices étape par étape semblent utiles.",
    suggestionEn: "Let the student build the problem with objects or write the steps in order.",
    suggestionFr: "Laissez l’élève construire le problème avec des objets ou écrire les étapes dans l’ordre.",
  },
  mixed: {
    en: "A mix of explanation and practice seems helpful.",
    fr: "Un mélange d’explications et d’exercices semble utile.",
    suggestionEn: "Use one picture, one spoken explanation, and one short practice question.",
    suggestionFr: "Utilisez une image, une explication orale et un petit exercice.",
  },
};

function totals(record: Record<string, { total: number; correct: number }>) {
  return Object.values(record).reduce(
    (acc, item) => ({
      total: acc.total + item.total,
      correct: acc.correct + item.correct,
    }),
    { total: 0, correct: 0 }
  );
}

function bestQuestionKind(record: Record<string, { total: number; correct: number; rate: number | null }>) {
  return Object.entries(record)
    .filter(([, value]) => value.total >= 2 && value.rate !== null)
    .sort(([, a], [, b]) => (b.rate || 0) - (a.rate || 0))[0];
}

function readinessText(summary: StudentLearningAnalyticsSummary, isFrench: boolean) {
  if (summary.readinessStatus === "ready") {
    return isFrench
      ? "Assez de données pour lire les tendances, avec prudence."
      : "Enough data to review trends carefully.";
  }

  if (summary.readinessStatus === "collecting_practice_data") {
    return isFrench
      ? "Données générales suffisantes, mais encore peu de réponses après un support."
      : "Enough general data, but still few answers after support.";
  }

  return isFrench
    ? "Pas encore assez de données. Continuez à observer avec un mélange d’explications et d’exercices."
    : "Not enough data yet. Keep using a mix of explanations and practice.";
}

export function LearningInsightsCard({ studentId }: LearningInsightsCardProps) {
  const { language } = useLanguage();
  const isFrench = /^fr/i.test(language);
  const { data: summary, isLoading } = useQuery({
    queryKey: ["student-learning-analytics-summary", studentId],
    queryFn: () => getStudentLearningAnalyticsSummary(studentId),
    enabled: !!studentId,
  });
  const { data: adaptiveEnabled = false } = useQuery({
    queryKey: ["feature-flag", ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG],
    queryFn: () => getFeatureFlagEnabled(ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG),
  });

  if (!studentId) return null;

  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isFrench ? "Aperçus d’apprentissage" : "Learning insights"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const supportStyle = summary.mostHelpfulSupportStyle;
  const supportCopy = supportStyle ? supportMessages[supportStyle] : null;
  const quiz = totals(summary.quizCorrectnessByQuestionKind);
  const miniPractice = totals(summary.miniPracticeCorrectnessByQuestionType);
  const easiestQuizKind = bestQuestionKind(summary.quizCorrectnessByQuestionKind);
  const strongestPracticeType = bestQuestionKind(summary.miniPracticeCorrectnessByQuestionType);
  const noEvidence = isFrench
    ? "Pas encore assez de preuves. Continuez à utiliser un mélange d’explications et d’exercices."
    : "Not enough evidence yet. Keep using a mix of explanations and practice.";
  const suggestedSupport = supportCopy
    ? (isFrench ? supportCopy.suggestionFr : supportCopy.suggestionEn)
    : (isFrench
        ? supportMessages.mixed.suggestionFr
        : supportMessages.mixed.suggestionEn);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {isFrench ? "Aperçus d’apprentissage" : "Learning insights"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4" />
            {isFrench ? "Préparation des données" : "Data readiness"}
          </h3>
          <p className="text-muted-foreground">{readinessText(summary, isFrench)}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {isFrench
                ? `${summary.totalRelevantEvents} événements`
                : `${summary.totalRelevantEvents} events`}
            </Badge>
            <Badge variant="secondary">
              {isFrench
                ? `${summary.answeredPracticeOrQuizEvents} réponses après support`
                : `${summary.answeredPracticeOrQuizEvents} answers after support`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {adaptiveEnabled
              ? (isFrench
                  ? "Les recommandations automatiques restent prudentes et dépendent du niveau de confiance."
                  : "Automatic recommendations remain cautious and depend on confidence.")
              : (isFrench
                  ? "Les recommandations automatiques sont désactivées. Ces aperçus sont seulement informatifs."
                  : "Automatic recommendations are off. These insights are for review only.")}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="h-4 w-4" />
            {isFrench ? "Ce qui semble aider" : "What seems to help"}
          </h3>
          <p className="text-muted-foreground">
            {supportCopy ? (isFrench ? supportCopy.fr : supportCopy.en) : noEvidence}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">
            {isFrench ? "Habitudes d’exercice" : "Practice patterns"}
          </h3>
          <div className="space-y-1 text-muted-foreground">
            {miniPractice.total > 0 && (
              <p>
                {isFrench
                  ? `Réussite mini-exercices : ${miniPractice.correct}/${miniPractice.total}.`
                  : `Mini-practice accuracy: ${miniPractice.correct}/${miniPractice.total}.`}
              </p>
            )}
            {quiz.total > 0 && (
              <p>
                {isFrench
                  ? `Réussite quiz : ${quiz.correct}/${quiz.total}.`
                  : `Quiz accuracy: ${quiz.correct}/${quiz.total}.`}
              </p>
            )}
            {easiestQuizKind && (
              <p>
                {isFrench
                  ? `Signal précoce : les questions ${easiestQuizKind[0]} semblent plus faciles.`
                  : `Early signal: ${easiestQuizKind[0]} questions seem easier.`}
              </p>
            )}
            {strongestPracticeType && (
              <p>
                {isFrench
                  ? `Signal précoce : les mini-exercices ${strongestPracticeType[0]} semblent utiles.`
                  : `Early signal: ${strongestPracticeType[0]} mini-practice seems useful.`}
              </p>
            )}
            {miniPractice.total === 0 && quiz.total === 0 && (
              <p>
                {isFrench
                  ? "Pas encore assez de réponses aux exercices ou quiz."
                  : "Not enough practice or quiz answers yet."}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            {isFrench ? "Support suggéré" : "Suggested support"}
          </h3>
          <p className="text-muted-foreground">{suggestedSupport}</p>
        </section>
      </CardContent>
    </Card>
  );
}
