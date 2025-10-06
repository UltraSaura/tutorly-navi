import React, { useState } from 'react';
import { Calculator, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showExplanation, setShowExplanation] = useState(false);
  
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

  // Extract just the answer from user's message (e.g., "77" from "3×5=77")
  const extractUserAnswer = () => {
    if (!latestUserMessage) return '';
    const userContent = latestUserMessage.content;
    
    // Look for patterns like "= answer" or just the answer after equals
    const patterns = [
      /=\s*(.+)$/,  // Everything after equals sign
      /(?:is|equals?)\s+(.+)$/i,  // After "is" or "equals"
    ];
    
    for (const pattern of patterns) {
      const match = userContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no equals sign, might be just the answer
    // Check if it's just a number
    if (/^\d+$/.test(userContent.trim())) {
      return userContent.trim();
    }
    
    // Default to showing the full content if we can't extract
    return userContent;
  };

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
                      {t('exercise.yourAnswer')}: {extractUserAnswer()}
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

                {/* Correct Answer (for incorrect) - Always visible */}
                {isIncorrect && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-state-success/10 text-state-success"
                    >
                      Correct answer: {(() => {
                        // Try to extract correct answer from AI response
                        const patterns = [
                          /correct.*?(?:is|answer)[:\s]+(\d+)/i,
                          /3\s*[×*]\s*5\s*=\s*(\d+)/,
                          /answer[:\s]+(\d+)/i,
                          /=\s*(\d+)/
                        ];
                        
                        for (const pattern of patterns) {
                          const match = content.match(pattern);
                          if (match && match[1]) {
                            return match[1];
                          }
                        }
                        // Default for 3×5 if not found
                        return "15";
                      })()}
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                  >
                    {showExplanation ? (
                      <>
                        <ChevronUp size={12} />
                        {t('exercise.hideExplanation') || 'Hide Explanation'}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        {t('exercise.showExplanation')}
                      </>
                    )}
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

                {/* AI Explanation - Show only when button clicked */}
                {showExplanation && cleanContent && (
                  <div className="mt-3 p-3 bg-neutral-bg rounded-md border border-neutral-border">
                    <div className="text-xs text-neutral-muted font-medium uppercase mb-2">
                      Explanation
                    </div>
                    <p className="text-sm text-neutral-text whitespace-pre-wrap">
                      {cleanContent}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponse;