import React from 'react';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface AIResponseProps {
  messages: Message[];
  isLoading: boolean;
}

const AIResponse: React.FC<AIResponseProps> = ({ messages, isLoading }) => {
  const { t } = useLanguage();
  
  // Get the latest AI response message (skip welcome message)
  const latestAIResponse = messages
    .filter(msg => msg.role === 'assistant' && msg.id !== '1')
    .pop();

  // Get the latest user message to understand context
  const latestUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop();

  // Don't show anything if there's no user message yet
  if (!latestUserMessage && !isLoading) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-card border bg-neutral-surface border-neutral-border animate-pulse">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-button bg-neutral-bg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-neutral-bg rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-neutral-bg rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!latestAIResponse) return null;

  const content = latestAIResponse.content;
  
  // Determine the type of response based on content
  const isCorrect = /\bCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content);
  
  // Get appropriate styling matching ExerciseCard
  const getStatusStyles = () => {
    if (isCorrect) return 'bg-state-success/10 border-state-success';
    if (isIncorrect) return 'bg-state-danger/10 border-state-danger';
    return 'bg-brand-tint border-brand-primary/20';
  };

  // Simple content cleaning - just remove the status words
  const cleanContent = content
    .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
    .trim();

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Card - styled like ExerciseCard */}
          <div 
            className={cn(
              'p-4 rounded-card border transition-all duration-200 hover:shadow-md',
              getStatusStyles()
            )}
          >
            <div className="flex items-start gap-3">
              {/* Math Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
                'bg-neutral-surface border border-neutral-border text-blue-600'
              )}>
                <Calculator size={20} />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* User's Question */}
                {latestUserMessage && (
                  <div className="text-body font-semibold text-neutral-text mb-3">
                    {latestUserMessage.content}
                  </div>
                )}
                
                {/* Your Answer Badge (for incorrect answers) */}
                {isIncorrect && latestUserMessage && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-neutral-bg text-neutral-muted"
                    >
                      {t('exercise.yourAnswer')}: {latestUserMessage.content}
                    </Badge>
                  </div>
                )}
                
                {/* Status Badge */}
                {(isCorrect || isIncorrect) && (
                  <div className="mb-3">
                    {isCorrect && (
                      <Badge className="bg-state-success/20 text-state-success border-0">
                        <CheckCircle size={14} className="mr-1" />
                        Correct!
                      </Badge>
                    )}
                    {isIncorrect && (
                      <Badge className="bg-state-danger/20 text-state-danger border-0">
                        <XCircle size={14} className="mr-1" />
                        Incorrect
                      </Badge>
                    )}
                  </div>
                )}

                {/* AI Explanation - Simple display */}
                {cleanContent && (
                  <div className="mb-3 p-3 bg-neutral-bg rounded-md">
                    <p className="text-sm text-neutral-text whitespace-pre-wrap">
                      {cleanContent}
                    </p>
                  </div>
                )}

                {/* Correct Answer (for incorrect) */}
                {isIncorrect && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-state-success/10 text-state-success"
                    >
                      Correct answer: 15
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-0.5 h-6"
                  >
                    {t('exercise.showExplanation')}
                  </Button>
                  
                  {isIncorrect && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs px-2 py-0.5 h-6"
                    >
                      {t('exercise.tryAgain')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponse;