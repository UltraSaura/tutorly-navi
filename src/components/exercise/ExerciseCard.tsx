import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Book, FlaskConical, Languages, Send } from 'lucide-react';

type SubjectType = 'math' | 'science' | 'english';
type StatusType = 'correct' | 'incorrect' | 'unanswered';

interface ExerciseCardProps {
  id: string;
  subject: SubjectType;
  prompt: string;
  userAnswer?: string;
  status: StatusType;
  explanation?: string;
  onShowExplanation: (id: string) => void;
  onTryAgain: (id: string) => void;
  onSubmitAnswer?: (id: string, answer: string) => void;
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
  explanation,
  onShowExplanation,
  onTryAgain,
  onSubmitAnswer
}: ExerciseCardProps) => {
  const [inputAnswer, setInputAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmitAnswer = async () => {
    if (!inputAnswer.trim() || !onSubmitAnswer) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(id, inputAnswer.trim());
      setInputAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className={cn(
        'p-4 rounded-card border transition-all duration-200 hover:shadow-md',
        getStatusStyles()
      )}
      role="article"
      aria-labelledby={`exercise-${id}-title`}
    >
      <div className="flex items-start gap-3">
        {/* Subject Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
          'bg-neutral-surface border border-neutral-border',
          subjectColors[subject]
        )}>
          <SubjectIcon size={20} aria-hidden="true" />
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
            <div className="mb-3">
              <Badge 
                variant="secondary" 
                className="px-3 py-1 bg-neutral-bg text-neutral-muted"
              >
                Your answer: {userAnswer}
              </Badge>
            </div>
          )}
          
          {/* Answer Input for Unanswered Exercises */}
          {status === 'unanswered' && onSubmitAnswer && (
            <div className="mb-2 space-y-1">
              <Textarea
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value)}
                placeholder="Enter your answer here..."
                className="min-h-[50px]"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!inputAnswer.trim() || isSubmitting}
                className="w-full h-6 text-xs px-2 py-0.5"
              >
                <Send size={14} className="mr-1" />
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {status !== 'unanswered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowExplanation(id)}
                className="text-xs px-2 py-0.5 h-6"
                aria-label={`Show explanation for exercise ${id}`}
              >
                Show explanation
              </Button>
            )}
            
            {status === 'incorrect' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onTryAgain(id)}
                className="text-xs px-2 py-0.5 h-6"
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