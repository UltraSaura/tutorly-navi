import React from "react";
import type { Step } from "./types";
import type { RuntimeMiniPracticeContext } from "./runtimeMiniPractice";
import type { LearningMode } from "@/domain/learningMode";
import { KidExplanation } from "./KidExplanation";
import ExplanationCards from "./ExplanationCards";

interface ExplanationRendererProps {
  mode: LearningMode;
  steps: Step[];
  miniPracticeContext?: RuntimeMiniPracticeContext;
  onPracticeMore?: () => void;
  onViewLesson?: () => void;
  canViewLesson?: boolean;
}

export function ExplanationRenderer({
  mode,
  steps,
  miniPracticeContext,
  onPracticeMore,
  onViewLesson,
  canViewLesson,
}: ExplanationRendererProps) {
  console.log("DEBUG COMPONENT:", {
    mode,
    usingKidRenderer: mode === "kid"
  });
  if (mode === "kid") {
    return (
      <KidExplanation 
        steps={steps} 
        miniPracticeContext={miniPracticeContext} 
        onPracticeMore={onPracticeMore}
        onViewLesson={onViewLesson}
        canViewLesson={canViewLesson}
      />
    );
  }

  return (
    <ExplanationCards 
      steps={steps} 
      miniPracticeContext={miniPracticeContext} 
    />
  );
}
