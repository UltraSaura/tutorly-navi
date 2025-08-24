import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Divide, Check, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExplanationStep } from '@/types/chat';
import { cn } from '@/lib/utils';

interface InlineExplanationProps {
  steps: ExplanationStep[];
  onRetry?: () => void;
  className?: string;
}

const getStepIcon = (icon?: string) => {
  switch (icon) {
    case 'magnifier':
      return <Search className="w-4 h-4 text-brand-primary" />;
    case 'divide':
      return <Divide className="w-4 h-4 text-brand-primary" />;
    case 'check':
      return <Check className="w-4 h-4 text-state-success" />;
    case 'calculator':
      return <Calculator className="w-4 h-4 text-brand-primary" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-brand-primary text-xs text-white flex items-center justify-center font-medium">?</div>;
  }
};

const InlineExplanation = ({ steps, onRetry, className }: InlineExplanationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (steps.length === 0) return null;

  return (
    <div className={cn("mt-3 border-t border-neutral-border pt-3", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-neutral-text hover:text-brand-primary transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Step-by-step explanation
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step.icon)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-neutral-text mb-1">
                    {index + 1}. {step.title}
                  </h4>
                  <p className="text-sm text-neutral-muted leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          
          {onRetry && (
            <div className="pt-2">
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="text-brand-primary border-brand-primary hover:bg-brand-primary hover:text-white"
              >
                Try again → +5 XP
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineExplanation;