/**
 * KidExplanation — thin wrapper that delegates to KidExplanationFlow.
 *
 * Kept as a named export so existing imports in ExplanationRenderer don't break.
 */
import React from "react";
import { KidExplanationFlow } from "@/components/kids/KidExplanationFlow";
import type { Step } from "./types";
import type { RuntimeMiniPracticeContext } from "./runtimeMiniPractice";

export function KidExplanation({
  steps,
  miniPracticeContext,
  onPracticeMore,
  onViewLesson,
  canViewLesson,
}: {
  steps: Step[];
  miniPracticeContext?: RuntimeMiniPracticeContext;
  onPracticeMore?: () => void;
  onViewLesson?: () => void;
  canViewLesson?: boolean;
}) {
  return (
    <KidExplanationFlow
      steps={steps}
      miniPracticeContext={miniPracticeContext}
      onPracticeMore={onPracticeMore}
      onViewLesson={onViewLesson}
      canViewLesson={canViewLesson}
    />
  );
}
