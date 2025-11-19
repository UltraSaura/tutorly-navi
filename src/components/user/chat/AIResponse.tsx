import React, { memo, useMemo, useState } from 'react';
import { Calculator, CheckCircle, XCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import DOMPurify from 'dompurify';
import { parseUserMessage } from '@/utils/messageParser';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { useUserContext } from '@/hooks/useUserContext';
import { validateExampleOperationType, getOperationTypeDisplay } from '@/utils/operationTypeDetector';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AIResponseProps {
  messages: Message[];
  isLoading: boolean;
  onSubmitAnswer?: (question: string, answer: string) => void;
}
interface ExerciseCardProps {
  userMessage: Message;
  aiResponse: Message;
  onSubmitAnswer?: (question: string, answer: string) => void;
}

// Note: parseUserMessage is now imported from @/utils/messageParser
// This provides enhanced detection with better pattern matching

const getStatusStyles = (content: string) => {
  // Check the first line or beginning of content for status
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  
  if (isCorrect) {
    return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
  } else if (isIncorrect) {
    return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
  } else {
    return 'bg-neutral-surface border-neutral-border';
  }
};

const formatExplanation = (content: string) => {
  // Remove status prefixes and clean up the content
  const cleanContent = content
    .replace(/^(CORRECT|INCORRECT)\s*/i, '')
    .replace(/^Great work!\s*/i, '')
    .replace(/^Learning Opportunity\s*/i, '')
    .replace(/^Guidance:\s*/i, '')
    .replace(/^Problem:\s*/i, '')
    .trim();

  return cleanContent
    .replace(/\*\*Problem:\*\*/g, '<strong class="text-stuwy-600 dark:text-stuwy-400">Problem:</strong>')
    .replace(/\*\*Guidance:\*\*/g, '<strong class="text-stuwy-600 dark:text-stuwy-400">Guidance:</strong>')
    .replace(/^Guidance:\s*Problem:\s*/gm, '')
    .replace(/^\s*$/gm, '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('<br />');
};

// Add this new function to parse JSON responses
const parseAIResponse = (content: string) => {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the entire content as JSON
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    return null;
  }
};

// Memoized ExerciseCard component
const ExerciseCard = memo<ExerciseCardProps>(({ userMessage, aiResponse, onSubmitAnswer }) => {
  const parsed = parseUserMessage(userMessage.content);
  const { question, answer, hasAnswer } = parsed;
  const content = aiResponse.content;
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false); // Add this line
  const { t, language } = useLanguage();
  const { userContext } = useUserContext();
  
  // Fetch topic routing info if aiResponse has topicId
  const { data: topicInfo, isLoading: topicInfoLoading } = useQuery({
    queryKey: ['topic-info-for-lesson', aiResponse.topicId],
    queryFn: async () => {
      if (!aiResponse.topicId) return null;
      const { data } = await supabase
        .from('learning_topics')
        .select(`
          slug,
          category:learning_categories!inner(
            subject:learning_subjects!inner(slug)
          )
        `)
        .eq('id', aiResponse.topicId)
        .single();
      return data;
    },
    enabled: !!aiResponse.topicId
  });
  
  // Debug logging for translation issues
  console.log('[ExerciseCard] Translation Debug:', {
    language,
    testTranslation: t('exercise.answer'),
    testExplanation: t('explanation.modal_title'),
    testHeaders: t('explanation.headers.exercise'),
    rawKey: 'exercise.answer',
    timestamp: new Date().toISOString()
  });
  
  // Check if this is a question without an answer - now using enhanced detection
  const hasNoAnswer = !hasAnswer || !answer;
  
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  
  const formattedExplanation = formatExplanation(content);

  const handleSubmitAnswer = async () => {
    console.log('[ExerciseCard] handleSubmitAnswer called');
    console.log('[ExerciseCard] userAnswerInput:', userAnswerInput);
    console.log('[ExerciseCard] onSubmitAnswer function:', onSubmitAnswer);
    console.log('[ExerciseCard] question:', question);
    
    if (!userAnswerInput.trim()) {
      console.log('[ExerciseCard] No answer input, returning early');
      return;
    }
    
    if (!onSubmitAnswer) {
      console.log('[ExerciseCard] No onSubmitAnswer function, returning early');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('[ExerciseCard] Calling onSubmitAnswer with:', { question, answer: userAnswerInput.trim() });
      await onSubmitAnswer(question, userAnswerInput.trim());
      console.log('[ExerciseCard] onSubmitAnswer completed successfully');
      setUserAnswerInput(''); // Clear input after submission
      setAnswerSubmitted(true); // Add this line to mark as submitted
    } catch (error) {
      console.error('[ExerciseCard] Error in handleSubmitAnswer:', error);
      setAnswerSubmitted(false); // Add this line to reset on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  // If we have a valid JSON response with 2-card format, use it
  const jsonResponse = parseAIResponse(content);
  if (jsonResponse && jsonResponse.isMath && jsonResponse.sections) {
    // Get grading information from JSON response
    const isCorrect = jsonResponse.isCorrect;
    const isIncorrect = jsonResponse.isCorrect === false;
    
    return (
      <div className="w-full overflow-hidden">
        <div 
          className={cn(
            'p-4 rounded-card transition-all duration-200 hover:shadow-md relative break-words overflow-hidden',
            // Add bolder, darker borders based on JSON response
            isCorrect === true 
              ? 'bg-green-50 border-2 border-green-600' // Dark green border for correct
              : isCorrect === false
              ? 'bg-red-50 border-2 border-red-600' // Dark pink/red border for incorrect
              : 'bg-neutral-surface border border-neutral-border' // Neutral for no answer
          )}
        >
          {/* Status Image - Top Right Corner */}
          <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
            {isCorrect === true ? (
              <img 
                src="/images/Happy Green Right Answer.png" 
                alt={t('exercise.correct')}
                className="w-6 h-6 object-contain"
              />
            ) : isCorrect === false ? (
              <img 
                src="/images/Sad Face wrong Answer.png" 
                alt={t('exercise.incorrect')}
                className="w-6 h-6 object-contain"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-sm font-bold">?</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 pr-8"> {/* Add right padding to avoid overlap with status image */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
              isCorrect === true
                ? 'bg-green-100 border border-green-300 text-green-600'
                : isCorrect === false
                ? 'bg-blue-100 border border-blue-200 text-blue-600'
                : 'bg-neutral-surface border border-neutral-border text-blue-600'
            )}>
              <Calculator size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-neutral-text mb-3 break-words whitespace-pre-wrap">
                {question || jsonResponse.exercise}
              </div>
              
              {/* Answer section - either show existing answer or input field */}
              <div className="mb-3">
                {hasNoAnswer ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-text">
                      {t('exercise.answer')}:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={userAnswerInput}
                        onChange={(e) => setUserAnswerInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('exercise.pleaseProvideAnswer')}
                        className="flex-1"
                        disabled={isSubmitting}
                      />
                      <Button
                        onClick={(e) => {
                          console.log('[ExerciseCard] Submit button clicked!');
                          console.log('[ExerciseCard] Event:', e);
                          handleSubmitAnswer();
                        }}
                        disabled={!userAnswerInput.trim() || isSubmitting}
                        size="sm"
                        className="px-3"
                      >
                        <Send size={16} className="mr-1" />
                        {answerSubmitted && userAnswerInput.trim() === '' 
                          ? t('exercise.answerSubmitted') 
                          : t('common.submit')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'px-3 py-1',
                        isCorrect === true
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : isCorrect === false
                          ? 'bg-white border border-gray-200 text-gray-600'
                          : 'bg-neutral-bg text-neutral-muted'
                      )}
                    >
                      {t('exercise.answer')}: {answer}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Show Explanation Button with Popup */}
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
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t('explanation.modal_title')}</DialogTitle>
                    </DialogHeader>
                    
                    {/* 2-Card Teaching Format in Popup */}
                    <div className="space-y-4">
                      {/* Exercise card */}
                      <div className="rounded-xl border bg-muted p-4 break-words overflow-hidden">
                        <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('explanation.headers.exercise')}</div>
                        <div className="text-blue-700 dark:text-blue-300 break-words whitespace-pre-wrap">
                          {jsonResponse.exercise || question}
                        </div>
                      </div>

                      {/* Guidance card */}
                      <div className="rounded-xl border bg-card p-4 shadow-sm break-words overflow-hidden">
                        <div className="space-y-4">
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>{t('explanation.headers.concept')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                              {jsonResponse.sections.concept}
                            </div>
                          </div>
                          
                          {/* Example Section - Interactive for young students */}
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>{t('explanation.headers.example')}</span>
                            </div>
                            {(() => {
                              // Check if student is under 11 years old
                              const gradeLevel = userContext?.student_level || '';
                              const isYoungStudent = isUnder11YearsOld(gradeLevel);
                              const exampleExpression = extractExpressionFromText(jsonResponse.sections.example || '');
                              
                              // Validate that the example matches the student's operation type
                              const validation = validateExampleOperationType(question, jsonResponse.sections.example || '');
                              
                              console.log('[AIResponse] Interactive Stepper Debug:', {
                                gradeLevel,
                                isYoungStudent,
                                exampleText: jsonResponse.sections.example,
                                extractedExpression: exampleExpression,
                                hasUserContext: !!userContext,
                                validation: validation
                              });
                              
                              // If validation fails, show warning and use fallback
                              if (!validation.isValid && validation.suggestedFix) {
                                console.warn('[AIResponse] Validation failed:', {
                                  studentExercise: question,
                                  studentOperation: getOperationTypeDisplay(validation.studentOperation),
                                  exampleOperation: getOperationTypeDisplay(validation.exampleOperation),
                                  reason: validation.reason,
                                  suggestedFix: validation.suggestedFix
                                });
                              }
                              
                              if (isYoungStudent && exampleExpression) {
                                // Use fallback example if validation fails
                                const finalExpression = !validation.isValid && validation.suggestedFix 
                                  ? extractExpressionFromText(validation.suggestedFix) || exampleExpression
                                  : exampleExpression;
                                
                                return (
                                  <div className="mt-2">
                                    {!validation.isValid && (
                                      <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                        ⚠️ Example corrected: {validation.reason || 'to match operation type'}
                                      </div>
                                    )}
                                    <CompactMathStepper 
                                      expression={finalExpression}
                                      className="text-sm"
                                    />
                                  </div>
                                );
                              }
                              
                              // Fallback to regular text with validation correction
                              return (
                                <div className="text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                                  {!validation.isValid && validation.suggestedFix ? (
                                    <>
                                      {validation.reason && (
                                        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200 break-words">
                                          ⚠️ Example corrected: {validation.reason}
                                        </div>
                                      )}
                                      {validation.suggestedFix}
                                    </>
                                  ) : (
                                    jsonResponse.sections.example
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>{t('explanation.headers.method')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {jsonResponse.sections.method || jsonResponse.sections.strategy}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>{t('explanation.headers.pitfall')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.pitfall}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>{t('explanation.headers.check')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.check}
                            </div>
                          </div>
                          
                          {/* View Full Lesson Footer - Context aware */}
                          {aiResponse.topicId && topicInfo ? (
                            <div className="mt-4 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground mb-2">Need more help?</p>
                              <DialogClose asChild>
                                <button
                                  onClick={() => {
                                    const subjectSlug = topicInfo.category?.subject?.slug;
                                    const topicSlug = topicInfo.slug;
                                    if (subjectSlug && topicSlug) {
                                      setTimeout(() => {
                                        window.location.href = `/learning/${subjectSlug}/${topicSlug}#lesson-section`;
                                      }, 200);
                                    }
                                  }}
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  View Full Lesson →
                                </button>
                              </DialogClose>
                            </div>
                          ) : aiResponse.topicId && topicInfoLoading ? (
                            <div className="mt-4 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground">Loading lesson information...</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                </div>
                  </DialogContent>
                </Dialog>
                
                {/* Add Try Again button for incorrect answers */}
                {isCorrect === false && (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs px-2 py-0.5 h-6"
                    onClick={() => {
                      setUserAnswerInput('');
                    }}
                  >
                    {t('exercise.tryAgain')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to old format for non-JSON responses
  return (
    <div className="w-full">
          <div 
            className={cn(
          'p-4 rounded-card transition-all duration-200 hover:shadow-md relative',
          getStatusStyles(content)
        )}
      >
        {/* Status Image - Top Right Corner */}
        <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
          {isCorrect ? (
            <img 
              src="/images/Happy Green Right Answer.png" 
              alt={t('exercise.correct')}
              className="w-6 h-6 object-contain"
            />
          ) : isIncorrect ? (
            <img 
              src="/images/Sad Face wrong Answer.png" 
              alt={t('exercise.incorrect')}
              className="w-6 h-6 object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-bold">?</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 pr-8"> {/* Add right padding to avoid overlap with status image */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
                'bg-neutral-surface border border-neutral-border text-blue-600'
              )}>
                <Calculator size={20} />
              </div>
              
              <div className="flex-1 min-w-0">
                  <div className="text-body font-semibold text-neutral-text mb-3">
              {question}
            </div>
            
            {/* Answer section - either show existing answer or input field */}
            <div className="mb-3">
              {hasNoAnswer ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-text">
                    {t('exercise.answer')}:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={userAnswerInput}
                      onChange={(e) => setUserAnswerInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('exercise.pleaseProvideAnswer')}
                      className="flex-1"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={(e) => {
                        console.log('[ExerciseCard] Submit button clicked!');
                        console.log('[ExerciseCard] Event:', e);
                        handleSubmitAnswer();
                      }}
                      disabled={!userAnswerInput.trim() || isSubmitting}
                      size="sm"
                      className="px-3"
                    >
                      <Send size={16} className="mr-1" />
                      {answerSubmitted && userAnswerInput.trim() === '' 
                        ? t('exercise.answerSubmitted') 
                        : t('common.submit')}
                    </Button>
                    </div>
                    
                    {/* View Full Lesson Footer - Context aware */}
                    {aiResponse.topicId && topicInfo ? (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Need more help?</p>
                        <DialogClose asChild>
                          <button
                            onClick={() => {
                              const subjectSlug = topicInfo.category?.subject?.slug;
                              const topicSlug = topicInfo.slug;
                              if (subjectSlug && topicSlug) {
                                setTimeout(() => {
                                  window.location.href = `/learning/${subjectSlug}/${topicSlug}#lesson-section`;
                                }, 200);
                              }
                            }}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Full Lesson →
                          </button>
                        </DialogClose>
                      </div>
                    ) : aiResponse.topicId && topicInfoLoading ? (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Loading lesson information...</p>
                      </div>
                    ) : null}
                  </div>
              ) : (
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 bg-neutral-bg text-neutral-muted"
                    >
                  {t('exercise.answer')}: {answer}
                      </Badge>
                    )}
                  </div>
            
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('explanation.modal_title')}</DialogTitle>
                  </DialogHeader>
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
                          {isCorrect ? t('exercise.greatWork') : t('exercise.learningOpportunity')}
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
                </DialogContent>
              </Dialog>
                  
                  {isIncorrect && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs px-2 py-0.5 h-6"
                  onClick={() => {
                    setUserAnswerInput('');
                  }}
                    >
                      {t('exercise.tryAgain')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.userMessage.id === nextProps.userMessage.id &&
         prevProps.aiResponse.id === nextProps.aiResponse.id;
});

ExerciseCard.displayName = 'ExerciseCard';

const LoadingSkeleton = () => (
  <div className="w-full">
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
);

const AIResponse: React.FC<AIResponseProps> = ({ messages, isLoading, onSubmitAnswer }) => {
  const { t, language } = useLanguage();
  
  // Debug logging for translation context
  console.log('[AIResponse] Translation Context Debug:', {
    language,
    testTranslation: t('exercise.answer'),
    testExplanation: t('explanation.modal_title'),
    timestamp: new Date().toISOString()
  });
  
  const exercisePairs = useMemo(() => {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const aiMessages = messages.filter(msg => msg.role === 'assistant' && msg.id !== '1');
    
    // Create pairs and filter out duplicates
    const pairs = userMessages.map((userMsg, index) => ({
      userMessage: userMsg,
      aiResponse: aiMessages[index] || null
    })).filter(pair => pair.aiResponse !== null) as Array<{
      userMessage: Message;
      aiResponse: Message;
    }>;

    // Remove duplicates based on question content
    const uniquePairs = [];
    const seenQuestions = new Set<string>();
    
    for (const pair of pairs) {
      const parsed = parseUserMessage(pair.userMessage.content);
      const { question } = parsed;
      
      if (!seenQuestions.has(question)) {
        seenQuestions.add(question);
        uniquePairs.push(pair);
      } else {
        // Replace the existing pair with the new one (latest answer)
        const existingIndex = uniquePairs.findIndex(existingPair => {
          const existingParsed = parseUserMessage(existingPair.userMessage.content);
          return existingParsed.question === question;
        });
        
        if (existingIndex !== -1) {
          uniquePairs[existingIndex] = pair; // Replace with latest
        }
      }
    }
    
    return uniquePairs;
  }, [messages]);

  if (exercisePairs.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {exercisePairs.map((pair) => (
          <ExerciseCard
            key={pair.userMessage.id}
            userMessage={pair.userMessage}
            aiResponse={pair.aiResponse}
            onSubmitAnswer={onSubmitAnswer}
          />
        ))}
        
        {isLoading && <LoadingSkeleton />}
      </div>
    </div>
  );
};

export default AIResponse;