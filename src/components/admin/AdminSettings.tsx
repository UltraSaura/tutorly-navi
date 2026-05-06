import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG,
  listFeatureFlags,
  updateFeatureFlagEnabled,
} from "@/services/featureFlags";
import { getStudentLearningAnalyticsSummary } from "@/services/adaptiveTeaching";
import { useLanguage } from "@/context/SimpleLanguageContext";
import type { LearningStyle } from "@/types/learning-style";

const supportStyleLabels: Record<LearningStyle, { en: string; fr: string }> = {
  visual: { en: "picture-based support", fr: "les supports visuels" },
  auditory: { en: "word-and-sound support", fr: "les supports avec les mots et le son" },
  kinesthetic: { en: "hands-on practice", fr: "les exercices pratiques" },
  mixed: { en: "mixed support", fr: "les supports variés" },
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const isFrench = /^fr/i.test(language);
  const { data: flags = [] } = useQuery({
    queryKey: ["app-feature-flags"],
    queryFn: listFeatureFlags,
  });
  const { data: analyticsSummary } = useQuery({
    queryKey: ["adaptive-teaching-summary"],
    queryFn: () => getStudentLearningAnalyticsSummary(),
  });

  const updateFlag = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      updateFeatureFlagEnabled(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-teaching-summary"] });
      toast.success("Feature flag updated");
    },
    onError: (error: any) => {
      if (import.meta.env.DEV) {
        console.debug("[AdminSettings] Feature flag update failed", error);
      }
      toast.error(error?.message || "Failed to update feature flag");
    },
  });

  const adaptiveFlag = flags.find(flag => flag.key === ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG);
  const enabled = Boolean(adaptiveFlag?.enabled);
  const isReady = analyticsSummary?.readinessStatus === "ready";
  const strongestSupport = analyticsSummary?.mostHelpfulSupportStyle
    ? supportStyleLabels[analyticsSummary.mostHelpfulSupportStyle][isFrench ? "fr" : "en"]
    : null;
  const title = isFrench
    ? "Recommandations pédagogiques adaptatives"
    : "Adaptive teaching recommendations";
  const description = isFrench
    ? "Quand cette option est activée, Tutorly peut utiliser les données d’apprentissage pour privilégier doucement les formats qui semblent aider chaque élève."
    : "When enabled, Tutorly can use learning analytics to gently prioritize the teaching formats that seem to help each student.";
  const status = !enabled
    ? (isFrench
        ? "Désactivé. Les données d’apprentissage sont toujours collectées."
        : "Off. Analytics are still being collected.")
    : isReady
      ? (isFrench
          ? "Activé. Les recommandations peuvent être utilisées lorsque la confiance est suffisante."
          : "On. Recommendations can be used when confidence is high.")
      : (isFrench
          ? "Activé. Collecte de données supplémentaires avant d’utiliser les recommandations."
          : "On. Collecting more data before recommendations can be used.");
  const metrics = analyticsSummary
    ? (isFrench
        ? `Données collectées : ${analyticsSummary.totalRelevantEvents} événements, ${analyticsSummary.answeredPracticeOrQuizEvents} réponses à des exercices/quiz.`
        : `Data collected: ${analyticsSummary.totalRelevantEvents} events, ${analyticsSummary.answeredPracticeOrQuizEvents} answered practice/quiz events.`)
    : null;
  const evidence = strongestSupport
    ? (isFrench
        ? `Signal précoce : ${strongestSupport} semblent utiles.`
        : `Early signal: ${strongestSupport} seems helpful.`)
    : (isFrench
        ? "Pas encore assez de preuves pour une recommandation."
        : "Not enough evidence for a recommendation yet.");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Configure guarded system behavior and rollout switches.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">
                {status}
              </p>
              {metrics && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {metrics}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {evidence}
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={updateFlag.isPending}
              onCheckedChange={(checked) =>
                updateFlag.mutate({
                  key: ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG,
                  enabled: checked,
                })
              }
              aria-label="Adaptive teaching recommendations"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
