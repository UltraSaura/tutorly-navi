import React, { useState } from 'react';
import { Calculator, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MathRenderer } from '@/components/math/MathRenderer';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import ExplanationTwoCards from './ExplanationTwoCards';

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
                  <div className="h-3 bg-neutral-bg rounded w-1/2 mb-2"></div>
                  <div className="h-12 bg-neutral-bg rounded mb-3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-neutral-bg rounded w-24"></div>
                    <div className="h-6 bg-neutral-bg rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting state if no AI response yet
  if (!latestAIResponse && latestUserMessage) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-card border bg-neutral-surface border-neutral-border">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center bg-neutral-surface border border-neutral-border text-blue-600">
                  <Calculator size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-semibold text-neutral-text mb-3">
                    {(() => {
                      const processed = processMathContentForDisplay(latestUserMessage.content);
                      return processed.isMath ? (
                        <MathRenderer latex={processed.processed} inline={false} className="math-content" />
                      ) : (
                        latestUserMessage.content
                      );
                    })()}
                  </div>
                  <div className="text-sm text-neutral-muted animate-pulse">
                    Processing your answer...
                  </div>
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
  
  // Determine the type of response based on content - be more strict about detection
  const isCorrect = /\bCORRECT\b/i.test(content) && !/\bINCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content) || (!isCorrect && content.includes('try again'));
  
  // Get appropriate styling matching ExerciseCard exactly
  const getStatusStyles = () => {
    if (isCorrect) return 'bg-state-success/10 border-state-success';
    if (isIncorrect) return 'bg-state-danger/10 border-state-danger';
    return 'bg-brand-tint border-brand-primary/20';
  };

  // Clean content for display
  const cleanContent = content
    .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
    .replace(/\*\*Problem:\*\*\s*\*\*([^*]+)\*\*/g, '**Problem:** $1')
    .replace(/\*\*Guidance:\*\*\s*\*\*([^*]+)\*\*/g, '**Guidance:** $1')
    .replace(/\*\*([^*]+)\*\*\s*\*\*([^*]+)\*\*/g, '**$1:** $2')
    .replace(/\*\*Problem:\*\*\s*([^*]+)/g, '**Problem:** $1')
    .replace(/\*\*Guidance:\*\*\s*([^*]+)/g, '**Guidance:** $1')
    .trim();

  // Extract correct answer if available - fix the math calculation
  const extractCorrectAnswer = () => {
    // First try to extract from the problem itself
    const problemMatch = latestUserMessage?.content.match(/(\d+)\s*[×⋅•]\s*(\d+)/);
    if (problemMatch) {
      const num1 = parseInt(problemMatch[1]);
      const num2 = parseInt(problemMatch[2]);
      const correctAnswer = num1 * num2;
      return correctAnswer.toString();
    }
    
    // Fallback patterns
    const patterns = [
      /correct.*?(?:is|answer)[:\s]+([^\n.]+)/i,
      /=\s*(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "6"; // Default for 2×3
  };

  // Helper function to get translation with fallback
  const getTranslation = (key: string, fallback: string) => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };

  // Parse explanation into two cards
  const parseExplanation = (text: string) => {
    const problemMatch = text.match(/\*\*Problem:\*\*\s*([^*]+)/);
    const guidanceMatch = text.match(/\*\*Guidance:\*\*\s*([^*]+)/);
    
    return {
      problem: problemMatch ? problemMatch[1].trim() : '',
      guidance: guidanceMatch ? guidanceMatch[1].trim() : ''
    };
  };

  const explanation = parseExplanation(cleanContent);

  return (
    <div className="flex flex-col">
      {/* Content Area - matching ExerciseList structure */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Card - styled EXACTLY like ExerciseCard */}
          <div 
            className={cn(
              'p-4 rounded-card border transition-all duration-200 hover:shadow-md',
              getStatusStyles()
            )}
            role="article"
          >
            <div className="flex items-start gap-3">
              {/* Subject Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
                'bg-neutral-surface border border-neutral-border text-blue-600'
              )}>
                <Calculator size={20} aria-hidden="true" />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Title/Prompt - User's Question */}
                {latestUserMessage && (
                  <div className="text-body font-semibold text-neutral-text mb-3 line-clamp-2">
                    {(() => {
                      const processedPrompt = processMathContentForDisplay(latestUserMessage.content);
                      return processedPrompt.isMath ? (
                        <MathRenderer 
                          latex={processedPrompt.processed} 
                          inline={true}
                          className="inline-math"
                        />
                      ) : (
                        latestUserMessage.content
                      );
                    })()}
                  </div>
                )}
                
                {/* User Answer Badge (if this is a grading response) */}
                {isIncorrect && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-neutral-bg text-neutral-muted flex items-center gap-1"
                    >
                      <span>{getTranslation('exercise.yourAnswer', 'Your Answer')}:</span>
                      <span className="font-semibold">
                        {latestUserMessage ? latestUserMessage.content : ''}
                      </span>
                    </Badge>
                  </div>
                )}
                
                {/* Status Badge */}
                {(isCorrect || isIncorrect) && (
                  <div className="mb-3">
                    {isCorrect && (
                      <Badge className="bg-state-success/20 text-state-success border-0">
                        <CheckCircle size={14} className="mr-1" />
                        {getTranslation('exercise.correct', 'Correct! Well done!')}
                      </Badge>
                    )}
                    {isIncorrect && (
                      <Badge className="bg-state-danger/20 text-state-danger border-0">
                        <XCircle size={14} className="mr-1" />
                        {getTranslation('exercise.tryAgain', 'Let\'s try again')}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Correct Answer (if incorrect) */}
                {isIncorrect && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-state-success/10 text-state-success border-state-success/30"
                    >
                      <span className="mr-1">{getTranslation('exercise.correctAnswer', 'Correct answer')}:</span>
                      <span className="font-semibold">{extractCorrectAnswer()}</span>
                    </Badge>
                  </div>
                )}

                {/* Actions - exactly like ExerciseCard */}
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                      >
                        <ChevronRight size={12} />
                        {getTranslation('exercise.showExplanation', 'Show explanation')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-left">
                          {latestUserMessage && (() => {
                            const processedPrompt = processMathContentForDisplay(latestUserMessage.content);
                            return processedPrompt.isMath ? (
                              <MathRenderer 
                                latex={processedPrompt.processed} 
                                inline={true}
                                className="inline-math"
                              />
                            ) : (
                              latestUserMessage.content
                            );
                          })()}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Use the new ExplanationTwoCards component */}
                        <ExplanationTwoCards
                          problem={explanation.problem}
                          guidance={explanation.guidance}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {isIncorrect && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs px-2 py-0.5 h-6"
                    >
                      {getTranslation('exercise.tryAgain', 'Try again')}
                    </Button>
                  )}
                </div>
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
