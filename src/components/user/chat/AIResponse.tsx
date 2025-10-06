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
      <div className="p-6" style={{ backgroundColor: '#f0f9ff', border: '2px solid #3b82f6', borderRadius: '8px', margin: '20px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center" style={{ fontSize: '20px', color: '#1e40af', fontWeight: 'bold' }}>
            <p>🔢 AI Response Component is Active! 🔢</p>
            <p style={{ fontSize: '16px', marginTop: '10px' }}>Send a math problem like "3×5=77" to get started!</p>
            <p style={{ fontSize: '14px', marginTop: '10px', color: '#6b7280' }}>Messages in array: {messages.length}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6" style={{ backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', margin: '20px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center" style={{ fontSize: '18px', color: '#d97706' }}>
            <p style={{ fontSize: '24px' }}>⏳ Loading AI Response...</p>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-3 h-3 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
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

  console.log('[AIResponse] Rendering full response card with content:', content.substring(0, 100));
  
  return (
    <div className="p-6" style={{ backgroundColor: '#f0fdf4', border: '3px dashed #22c55e', borderRadius: '12px', margin: '20px' }}>
      <div className="max-w-6xl mx-auto">
        <h2 style={{ fontSize: '24px', color: '#16a34a', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
          ✅ AI Response Component - Response Received!
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Card - styled like ExerciseCard */}
          <div 
            className={cn(
              'p-4 rounded-card border transition-all duration-200 hover:shadow-md',
              getCardStyle()
            )}
            style={{ minHeight: '200px', backgroundColor: isIncorrect ? '#fef2f2' : isCorrect ? '#f0fdf4' : '#f0f9ff' }}
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