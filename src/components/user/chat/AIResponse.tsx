import React from 'react';
import { Calculator, CheckCircle, XCircle, Info } from 'lucide-react';
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
  
  // Debug logging
  console.log('[AIResponse] Component rendered with:', {
    messagesCount: messages.length,
    messages: messages,
    isLoading
  });
  
  // Get the latest AI response message (skip welcome message)
  const latestAIResponse = messages
    .filter(msg => msg.role === 'assistant' && msg.id !== '1')
    .pop();

  // Get the latest user message to understand context
  const latestUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop();

  console.log('[AIResponse] Latest messages:', {
    latestAIResponse,
    latestUserMessage
  });

  // Show a placeholder if no messages yet
  if (!latestUserMessage && !isLoading) {
    console.log('[AIResponse] No user message and not loading, showing placeholder');
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-neutral-muted">
            <p>Send a math problem to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-card border bg-brand-tint border-brand-primary/20 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-button bg-neutral-surface animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-brand-primary/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!latestAIResponse) {
    console.log('[AIResponse] No AI response found, showing waiting state');
    // Show the user's message while waiting for response
    if (latestUserMessage) {
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
                      {latestUserMessage.content}
                    </div>
                    <div className="text-sm text-neutral-muted">
                      Waiting for response...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const content = latestAIResponse.content;
  
  // Determine the type of response based on content
  const isCorrect = /\bCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content);
  const isNotMath = content.includes('NOT_MATH');

  // Get appropriate styling matching ExerciseCard
  const getCardStyle = () => {
    if (isCorrect) {
      return 'bg-state-success/10 border-state-success';
    } else if (isIncorrect) {
      return 'bg-state-danger/10 border-state-danger';
    } else {
      return 'bg-brand-tint border-brand-primary/20';
    }
  };

  // Parse and clean the content
  const cleanContent = content
    .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
    .trim();

  // Process for math rendering
  const processedContent = processMathContentForDisplay(cleanContent);

  // Extract correct answer from content if available
  const extractCorrectAnswer = () => {
    const patterns = [
      /correct.*?is[:\s]+([^\n.]+)/i,
      /=\s*([^\n,]+)/,
      /answer[:\s]+([^\n.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  const correctAnswer = isIncorrect ? extractCorrectAnswer() : null;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Card - styled like ExerciseCard */}
          <div 
            className={cn(
              'p-4 rounded-card border transition-all duration-200 hover:shadow-md',
              getCardStyle()
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
                {/* User's Question/Input */}
                {latestUserMessage && (
                  <div className="text-body font-semibold text-neutral-text mb-3">
                    {(() => {
                      const processedPrompt = processMathContentForDisplay(latestUserMessage.content);
                      return processedPrompt.isMath ? (
                        <MathRenderer 
                          latex={processedPrompt.processed} 
                          inline={false}
                          className="math-content"
                        />
                      ) : (
                        latestUserMessage.content
                      );
                    })()}
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="mb-3">
                  {isCorrect && (
                    <Badge className="bg-state-success/20 text-state-success border-state-success">
                      <CheckCircle size={14} className="mr-1" />
                      {t('grades.correct')}
                    </Badge>
                  )}
                  {isIncorrect && (
                    <Badge className="bg-state-danger/20 text-state-danger border-state-danger">
                      <XCircle size={14} className="mr-1" />
                      {t('grades.incorrect')}
                    </Badge>
                  )}
                  {isNotMath && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      <Info size={14} className="mr-1" />
                      Not a math question
                    </Badge>
                  )}
                </div>

                {/* AI Explanation */}
                <div className="mb-3 p-3 bg-neutral-bg rounded-md">
                  <div className="text-sm text-neutral-muted mb-1 font-medium">
                    {isCorrect ? 'Great work!' : isIncorrect ? 'Explanation:' : 'Response:'}
                  </div>
                  {processedContent.isMath ? (
                    <MathRenderer 
                      latex={processedContent.processed} 
                      inline={false}
                      className="text-base"
                    />
                  ) : (
                    <div className="text-sm text-neutral-text space-y-1">
                      {cleanContent.split('\n').filter(line => line.trim()).map((line, index) => {
                        const lineProcessed = processMathContentForDisplay(line);
                        if (lineProcessed.isMath) {
                          return (
                            <MathRenderer 
                              key={index}
                              latex={lineProcessed.processed} 
                              inline={false}
                              className="my-1"
                            />
                          );
                        }
                        return <p key={index}>{line}</p>;
                      })}
                    </div>
                  )}
                </div>

                {/* Correct Answer Display (if incorrect) */}
                {isIncorrect && correctAnswer && (
                  <div className="mb-3">
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-state-success/10 text-state-success border-state-success/30"
                    >
                      <span className="mr-1">Correct answer:</span>
                      {(() => {
                        const processedAnswer = processMathContentForDisplay(correctAnswer);
                        return processedAnswer.isMath ? (
                          <MathRenderer 
                            latex={processedAnswer.processed} 
                            inline={true}
                            className="inline-math"
                          />
                        ) : (
                          <span className="font-semibold">{correctAnswer}</span>
                        );
                      })()}
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isIncorrect && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 py-0.5 h-6"
                      >
                        {t('exercise.showExplanation')}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs px-2 py-0.5 h-6"
                      >
                        {t('exercise.tryAgain')} → +5 XP
                      </Button>
                    </>
                  )}
                  {isCorrect && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs px-2 py-0.5 h-6 bg-state-success hover:bg-state-success/90"
                    >
                      Next Question → +10 XP
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