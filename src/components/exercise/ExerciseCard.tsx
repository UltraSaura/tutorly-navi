import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Book, FlaskConical, Languages } from 'lucide-react';

type SubjectType = 'math' | 'science' | 'english';
type StatusType = 'correct' | 'incorrect' | 'unanswered';

interface ExerciseCardProps {
  id: string;
  subject: SubjectType;
  prompt: string;
  userAnswer?: string;
  status: StatusType;
  score?: {
    got: number;
    total: number;
  };
  explanation?: string;
  onShowExplanation: (id: string) => void;
  onTryAgain: (id: string) => void;
}

const subjectIcons = {
  math: Book,
  science: FlaskConical,
  english: Languages,
};

const subjectColors = {
  math: 'text-blue-600',
  science: 'text-purple-600', 
  english: 'text-green-600',
};

const ExerciseCard = ({
  id,
  subject,
  prompt,
  userAnswer,
  status,
  score,
  explanation,
  onShowExplanation,
  onTryAgain
}: ExerciseCardProps) => {
  const SubjectIcon = subjectIcons[subject];
  
  const getStatusStyles = () => {
    switch (status) {
      case 'correct':
        return 'bg-state-success/10 border-state-success';
      case 'incorrect':
        return 'bg-state-danger/10 border-state-danger';
      case 'unanswered':
        return 'bg-brand-tint border-brand-primary/20';
      default:
        return 'bg-neutral-bg border-neutral-border';
    }
  };

  return (
    <div 
      className={cn(
        'p-6 rounded-card border transition-all duration-200 hover:shadow-md',
        getStatusStyles()
      )}
      role="article"
      aria-labelledby={`exercise-${id}-title`}
    >
      <div className="flex items-start gap-4">
        {/* Subject Icon */}
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-button flex items-center justify-center',
          'bg-neutral-surface border border-neutral-border',
          subjectColors[subject]
        )}>
          <SubjectIcon size={24} aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title/Prompt */}
          <h3 
            id={`exercise-${id}-title`}
            className="text-body font-semibold text-neutral-text mb-3 line-clamp-2"
            title={prompt}
          >
            {prompt}
          </h3>
          
          {/* User Answer */}
          {userAnswer && (
            <div className="mb-4">
              <Badge 
                variant="secondary" 
                className="px-3 py-1 bg-neutral-bg text-neutral-muted"
              >
                Your answer: {userAnswer}
              </Badge>
            </div>
          )}
          
          {/* Score and OCR Badge */}
          <div className="mb-4 flex items-center gap-2">
            {score && (
              <span className="text-caption text-neutral-muted">
                Score: {score.got}/{score.total}
              </span>
            )}
            {explanation?.includes('OCR Correction:') && (
              <Badge 
                variant="secondary" 
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                OCR corrected
              </Badge>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowExplanation(id)}
              className="text-caption"
              aria-label={`Show explanation for exercise ${id}`}
            >
              Show explanation
            </Button>
            
            {status !== 'correct' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onTryAgain(id)}
                className="text-caption"
                aria-label={`Try again for exercise ${id}`}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;