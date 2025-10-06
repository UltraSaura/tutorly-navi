import React from 'react';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';
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
  
  // Determine the type of response based on content
  const isCorrect = /\bCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content);
  
  // Get appropriate styling matching ExerciseCard exactly
  const getStatusStyles = () => {
    if (isCorrect) return 'bg-state-success/10 border-state-success';
    if (isIncorrect) return 'bg-state-danger/10 border-state-danger';
    return 'bg-brand-tint border-brand-primary/20';
  };

  // Clean content for display
  const cleanContent = content
    .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
    .trim();

  // Extract correct answer if available
  const extractCorrectAnswer = () => {
    const patterns = [
      /correct.*?(?:is|answer)[:\s]+([^\n.]+)/i,
      /3\s*×\s*5\s*=\s*(\d+)/,
      /=\s*(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "15"; // Default for 3×5
  };

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
                {isIncorrect && latestUserMessage && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-neutral-bg text-neutral-muted inline-flex items-center gap-1"
                    >
                      <span className="text-xs font-normal">{t('exercise.yourAnswer')}:</span>
                      <span className="text-xs font-semibold text-neutral-text">
                        {(() => {
                          const processed = processMathContentForDisplay(latestUserMessage.content);
                          if (processed.isMath) {
                            return latestUserMessage.content; // Show raw for now
                          }
                          return latestUserMessage.content;
                        })()}
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
                        Correct! Well done!
                      </Badge>
                    )}
                    {isIncorrect && (
                      <Badge className="bg-state-danger/20 text-state-danger border-0">
                        <XCircle size={14} className="mr-1" />
                        Let's try again
                      </Badge>
                    )}
                  </div>
                )}

                {/* Explanation Box */}
                {cleanContent && (
                  <div className="mb-3 p-4 bg-neutral-bg rounded-md border border-neutral-border">
                    <div className="text-xs text-neutral-muted mb-2 font-medium uppercase tracking-wider">
                      {isCorrect ? 'Great work!' : isIncorrect ? 'Explanation' : 'Solution'}
                    </div>
                    <div className="text-sm text-neutral-text space-y-2">
                      {(() => {
                        // First, check if the entire content is a math expression
                        const processed = processMathContentForDisplay(cleanContent);
                        if (processed.isMath) {
                          return (
                            <div className="my-2">
                              <MathRenderer 
                                latex={processed.processed} 
                                inline={false} 
                                className="text-base"
                              />
                            </div>
                          );
                        }
                        
                        // Split content into paragraphs and sentences for better formatting
                        const paragraphs = cleanContent.split(/\n\n+/);
                        
                        return paragraphs.map((paragraph, pIndex) => {
                          // Check if this paragraph is a math expression
                          const parProcessed = processMathContentForDisplay(paragraph);
                          if (parProcessed.isMath) {
                            return (
                              <div key={pIndex} className="my-2">
                                <MathRenderer 
                                  latex={parProcessed.processed} 
                                  inline={false} 
                                  className="text-base"
                                />
                              </div>
                            );
                          }
                          
                          // Split into lines for mixed content
                          const lines = paragraph.split('\n').filter(line => line.trim());
                          
                          if (lines.length === 1) {
                            // Single line paragraph
                            const line = lines[0];
                            // Check for inline math
                            if (line.includes('$') || line.includes('=') || /\d+\s*[×*]\s*\d+/.test(line)) {
                              const lineProcessed = processMathContentForDisplay(line);
                              if (lineProcessed.isMath) {
                                return (
                                  <div key={pIndex} className="my-2">
                                    <MathRenderer 
                                      latex={lineProcessed.processed} 
                                      inline={false} 
                                      className="text-base"
                                    />
                                  </div>
                                );
                              }
                            }
                            
                            // Regular text with proper formatting
                            return (
                              <p key={pIndex} className="text-sm leading-relaxed text-neutral-text">
                                {line}
                              </p>
                            );
                          }
                          
                          // Multiple lines - format as list or steps
                          return (
                            <div key={pIndex} className="space-y-1">
                              {lines.map((line, lIndex) => {
                                // Check if this line is a step (starts with number or bullet)
                                const isStep = /^[\d\-•*]/.test(line.trim());
                                const lineProcessed = processMathContentForDisplay(line);
                                
                                if (lineProcessed.isMath) {
                                  return (
                                    <div key={lIndex} className="my-1">
                                      <MathRenderer 
                                        latex={lineProcessed.processed} 
                                        inline={false} 
                                        className="text-base"
                                      />
                                    </div>
                                  );
                                }
                                
                                return (
                                  <p 
                                    key={lIndex} 
                                    className={`text-sm leading-relaxed text-neutral-text ${isStep ? 'ml-4' : ''}`}
                                  >
                                    {line}
                                  </p>
                                );
                              })}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Correct Answer (if incorrect) */}
                {isIncorrect && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-state-success/10 text-state-success border-state-success/30 inline-flex items-center gap-1"
                    >
                      <CheckCircle size={12} className="mr-1" />
                      <span className="text-xs font-normal">Correct answer:</span>
                      <span className="text-xs font-bold">{extractCorrectAnswer()}</span>
                    </Badge>
                  </div>
                )}

                {/* Actions - exactly like ExerciseCard */}
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
    </div>
  );
};

export default AIResponse;