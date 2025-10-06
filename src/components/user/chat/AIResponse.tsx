import React, { useState } from 'react';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import DOMPurify from 'dompurify';

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

  // Format explanation for popup display
  const formattedExplanation = cleanContent
    .replace(/\*\*Problem:\*\*/g, `<strong class="text-studywhiz-600 dark:text-studywhiz-400">${t('exercise.problem')}:</strong>`)
    .replace(/\*\*Guidance:\*\*/g, `<strong class="text-studywhiz-600 dark:text-studywhiz-400">${t('exercise.guidance')}:</strong>`)
    .replace(/^Guidance:\s*Problem:\s*/gm, '') // Remove "Guidance: Problem: " lines
    .replace(/^exercise\.guidance:\s*exercise\.problem:\s*.*$/gm, '') // Remove entire "exercise.guidance: exercise.problem: ..." lines
    .replace(/^\s*$/gm, '') // Remove empty lines
    .split('\n')
    .filter(line => line.trim() !== '') // Filter out empty lines
    .join('<br />');

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
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 py-0.5 h-6"
                      >
                        {t('exercise.showExplanation')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-left">
                          {latestUserMessage?.content}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">{t('exercise.yourAnswer')}:</h4>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {latestUserMessage?.content}
                            </p>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "p-4 rounded-lg",
                          isCorrect 
                            ? "bg-green-50 dark:bg-green-950/20" 
                            : "bg-amber-50 dark:bg-amber-950/20"
                        )}>
                          <div className="space-y-3">
                            <div className="flex items-center mb-2">
                              {isCorrect 
                                ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                : <XCircle className="w-4 h-4 mr-2 text-amber-600" />
                              }
                              <h4 className="text-sm font-medium">
                                {isCorrect 
                                  ? t('exercise.greatWork')
                                  : t('exercise.learningOpportunity')}
                              </h4>
                            </div>
                            
                            <div 
                              className="text-sm text-gray-700 dark:text-gray-300 prose-sm max-w-full"
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(formattedExplanation, { 
                                  ALLOWED_TAGS: ['strong', 'br', 'em', 'p'],
                                  ALLOWED_ATTR: ['class']
                                }) 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
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