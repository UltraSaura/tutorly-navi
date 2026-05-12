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
}

export function ExplanationRenderer({
  mode,
  steps,
  miniPracticeContext,
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
