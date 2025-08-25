import React from "react";
import type { Step } from "./types";

const ICON: Record<Step["icon"], string> = {
  lightbulb:"💡", magnifier:"🔍", divide:"➗", checklist:"☑️", warning:"⚠️", target:"🎯"
};
const KIND: Record<Step["kind"], string> = {
  concept:"Concept", example:"Example", strategy:"Strategy", pitfall:"Pitfall", check:"Check"
};

export default function ExplanationCards({ steps }: { steps: Step[] }) {
  if (!steps?.length) return null;
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <details key={i} className="rounded-xl border p-3 bg-white">
          <summary className="cursor-pointer font-medium flex items-center gap-2">
            <span aria-hidden>{ICON[s.icon] ?? "💡"}</span>
            <span>{s.title}</span>
            <span className="ml-2 text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">{KIND[s.kind]}</span>
          </summary>
          <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{s.body}</p>
        </details>
      ))}
    </div>
  );
}