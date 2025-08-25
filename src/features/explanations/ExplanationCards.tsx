import React from 'react';
import { Step } from './types';

interface ExplanationCardsProps {
  steps: Step[];
}

// Map StepIcon types to emoji representations
const iconEmojiMap = {
  magnifier: '🔍',
  checklist: '✅',
  divide: '➗',
  lightbulb: '💡',
  target: '🎯',
  warning: '⚠️',
};

const ExplanationCards: React.FC<ExplanationCardsProps> = ({ steps }) => {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <details
          key={index}
          className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <summary className="flex cursor-pointer items-center gap-3 text-lg font-semibold text-foreground list-none">
            <span className="text-2xl" role="img" aria-label={step.icon}>
              {iconEmojiMap[step.icon]}
            </span>
            <span className="flex-1">{step.title}</span>
            <span className="text-muted-foreground transition-transform duration-200 group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-4 pl-11 text-muted-foreground leading-relaxed">
            {step.body}
          </div>
        </details>
      ))}
    </div>
  );
};

export default ExplanationCards;