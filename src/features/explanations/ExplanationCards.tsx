import React from "react";
import type { Step } from "./types";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useResolveText } from "@/hooks/useResolveText";
import { toChildFriendlyExplanationText } from "./childFriendlyText";

const ICON_LABELS: Record<Step["icon"], string> = {
  lightbulb: "💡",
  magnifier: "🔍",
  divide: "➗",
  checklist: "☑️",
  warning: "⚠️",
  target: "🎯",
};

const KIND_FALLBACK_TITLE_KEYS: Record<Step["kind"], string> = {
  concept: "exercises.explanation.headers.concept",
  example: "exercises.explanation.headers.example",
  method: "exercises.explanation.headers.method",
  strategy: "exercises.explanation.headers.method",
  pitfall: "exercises.explanation.headers.pitfall",
  check: "exercises.explanation.headers.check",
} as const;

export default function ExplanationCards({ steps }: { steps: Step[] }) {
  const { t } = useLanguage();
  const resolveText = useResolveText();

  if (!steps?.length) return null;

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const title = toChildFriendlyExplanationText(
          step.title?.trim() || t(KIND_FALLBACK_TITLE_KEYS[step.kind])
        );
        const body = toChildFriendlyExplanationText(resolveText(step.body || ""));
        const icon = ICON_LABELS[step.icon] || ICON_LABELS.lightbulb;

        if (!body) return null;

        return (
          <div key={`${step.kind}-${index}`} className="rounded-xl border bg-card p-4 shadow-sm">
            <h5 className="flex items-center gap-2 font-bold text-foreground">
              <span aria-hidden="true">{icon}</span>
              {title}
            </h5>
            <div className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
              {body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
