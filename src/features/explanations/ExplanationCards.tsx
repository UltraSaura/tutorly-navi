import React from 'react';
import { Step } from './types';

interface ExplanationCardsProps {
  steps: Step[];
}

const ICONS: Record<Step["icon"], string> = {
  magnifier: "🔍", 
  checklist: "☑️", 
  divide: "➗",
  lightbulb: "💡", 
  target: "🎯", 
  warning: "⚠️"
};

const ExplanationCards: React.FC<ExplanationCardsProps> = ({ steps }) => {
  if (!steps?.length) return null;
  
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <details
          key={index}
          className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <summary className="flex cursor-pointer items-center gap-3 text-lg font-semibold text-foreground list-none">
            <span className="text-2xl" role="img" aria-label={step.icon}>
              {ICONS[step.icon] ?? "💡"}
            </span>
            <span className="flex-1">{step.title}</span>
            <span className="text-muted-foreground transition-transform duration-200 group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-4 pl-11 text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {step.body}
          </div>
        </details>
      ))}
    </div>
  );
};

export default ExplanationCards;