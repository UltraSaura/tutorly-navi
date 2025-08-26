import React from "react";
import type { Step } from "./types";

const SECTION_CONFIG = {
  concept: { emoji: "💡", title: "Concept" },
  example: { emoji: "🔍", title: "Example" },
  strategy: { emoji: "☑️", title: "Strategy" },
  pitfall: { emoji: "⚠️", title: "Pitfall" },
  check: { emoji: "🎯", title: "Check yourself" }
} as const;

export default function ExplanationCards({ steps }: { steps: Step[] }) {
  if (!steps?.length) return null;

  // Group steps by kind
  const groupedSteps = steps.reduce((acc, step) => {
    if (!acc[step.kind]) {
      acc[step.kind] = [];
    }
    acc[step.kind].push(step);
    return acc;
  }, {} as Record<Step["kind"], Step[]>);

  // Define order of sections
  const sectionOrder: Step["kind"][] = ["concept", "example", "strategy", "pitfall", "check"];

  return (
    <div className="space-y-6">
      {sectionOrder.map((kind) => {
        const sectionSteps = groupedSteps[kind];
        if (!sectionSteps?.length) return null;

        const config = SECTION_CONFIG[kind];
        
        return (
          <div key={kind} className="space-y-3">
            <h5 className="flex items-center gap-2 font-bold text-foreground">
              <span>{config.emoji}</span>
              {config.title}
            </h5>
            <div className="space-y-2">
              {sectionSteps.map((step, index) => (
                <div key={index} className="text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}