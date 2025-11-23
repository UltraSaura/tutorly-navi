
import React, { useState } from 'react';
import { ThumbsUp, AlertCircle, CircleCheck, CircleX, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { toast } from 'sonner';
import { MathLiveInput, MathInputToggle, MathRenderer } from '@/components/math';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';
import { VideoSuggestions } from '@/components/learning/VideoSuggestions';

interface ExerciseProps {
  exercise: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
    relatedMessages?: Message[];
    attemptCount: number;
    attempts: Array<{
      id: string;
      answer: string;
      isCorrect?: boolean;
      explanation?: string;
      timestamp: Date;
      attemptNumber: number;
    }>;
    lastAttemptDate: Date;
    needsRetry: boolean;
    subjectId?: string;
  };
  toggleExerciseExpansion: (id: string) => void;
  onSubmitAnswer?: (exerciseId: string, answer: string) => void;
}

/**
 * Exercise component displays a homework exercise with its question, 
 * user's answer, and UI indicators for correct/incorrect status
 */
const Exercise = ({
  exercise,
  toggleExerciseExpansion,
  onSubmitAnswer
}: ExerciseProps) => {
  const { t } = useLanguage();
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMathMode, setIsMathMode] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Process math content for display
  const processedQuestion = processMathContentForDisplay(exercise.question);
  const processedUserAnswer = exercise.userAnswer ? 
    processMathContentForDisplay(exercise.userAnswer) : null;
  
  const formattedExplanation = exercise.explanation ? exercise.explanation
    .replace(/\*\*Problem:\*\*/g, `<strong class="text-stuwy-600 dark:text-stuwy-400">${t('exercise.problem')}:</strong>`)
    .replace(/\*\*Guidance:\*\*/g, `<strong class="text-stuwy-600 dark:text-stuwy-400">${t('exercise.guidance')}:</strong>`)
    // NEW: Remove any correct answer mentions
    .replace(/correct\s+answer[:\s]*[^\n]+/gi, '')
    .replace(/\bcorrectAnswer\b[:\s]*[^\n]+/gi, '')
    .replace(/^Guidance:\s*Problem:\s*/gm, '') // Remove "Guidance: Problem: " lines
    .replace(/^exercise\.guidance:\s*exercise\.problem:\s*.*$/gm, '') // Remove entire "exercise.guidance: exercise.problem: ..." lines
    .replace(/^\s*$/gm, '') // Remove empty lines
    .split('\n')
    .filter(line => line.trim() !== '') // Filter out empty lines
    .join('<br />') : '';

  const hasRelatedMessages = exercise.relatedMessages && exercise.relatedMessages.length > 0;
  const hasAnswer = exercise.userAnswer && exercise.userAnswer.trim() !== '';
  
  // Auto-detect if this is a math exercise based on processed content
  const isMathExercise = processedQuestion.isMath;

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim()) {
      toast.error(t('exercise.pleaseProvideAnswer'));
      return;
    }

    if (!onSubmitAnswer) {
      console.error('onSubmitAnswer callback not provided');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitAnswer(exercise.id, answerInput.trim());
      setAnswerInput('');
      setIsRetrying(false);
      toast.success(t('exercise.answerSubmitted'));
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug rendering
  console.log('Exercise rendering:', { 
    id: exercise.id,
    question: exercise.question,
    processedQuestion: processedQuestion,
    isCorrect: exercise.isCorrect, 
    hasAnswer: hasAnswer 
  });

  return (
    <motion.div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md",
        exercise.isCorrect !== undefined 
          ? exercise.isCorrect 
            ? "border-green-200 dark:border-green-900" 
            : "border-amber-200 dark:border-amber-900" 
          : hasAnswer 
            ? "border-gray-200 dark:border-gray-700"
            : "border-blue-200 dark:border-blue-900"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 py-[5px]">
        <div className="flex items-center gap-4">
          {exercise.isCorrect !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {exercise.isCorrect ? (
                <CircleCheck className="w-6 h-6 text-green-500" />
              ) : (
                <CircleX className="w-6 h-6 text-red-500" />
              )}
            </motion.div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-md font-medium">
                {processedQuestion.isMath ? (
                  <MathRenderer 
                    latex={processedQuestion.processed} 
                    inline 
                    className="text-lg"
                  />
                ) : (
                  processedQuestion.processed
                )}
              </h3>
              {exercise.attemptCount > 1 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  {t('exercise.attempt')} {exercise.attemptCount}
                </span>
              )}
              {exercise.needsRetry && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                  {t('exercise.tryAgain')}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {hasAnswer && !isRetrying ? (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 py-[10px]">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {processedUserAnswer?.isMath ? (
                <MathRenderer 
                  latex={processedUserAnswer.processed} 
                  inline 
                />
              ) : (
                processedUserAnswer?.processed
              )}
            </p>
          </div>
        ) : (!hasAnswer || isRetrying) ? (
          <div className="mt-3 space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
              {isRetrying && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3 font-medium">
                  {t('exercise.tryAgain')} - {t('exercise.pleaseProvideAnswer')}
                </p>
              )}
              {!isRetrying && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  {t('exercise.pleaseProvideAnswer')}
                </p>
              )}
              <div className="flex gap-2">
                {isMathMode ? (
                  <MathLiveInput
                    value={answerInput}
                    onChange={setAnswerInput}
                    onEnter={handleSubmitAnswer}
                    placeholder="Enter your mathematical answer..."
                    className="flex-1"
                    disabled={isSubmitting}
                  />
                ) : (
                  <Input
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder={t('exercise.yourAnswerPlaceholder')}
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isSubmitting) {
                        handleSubmitAnswer();
                      }
                    }}
                    disabled={isSubmitting}
                  />
                )}
                
                {isMathExercise && (
                  <MathInputToggle 
                    isMathMode={isMathMode} 
                    onToggle={() => setIsMathMode(!isMathMode)}
                    className="shrink-0"
                  />
                )}
                
                {isRetrying && (
                  <Button
                    onClick={() => {
                      setIsRetrying(false);
                      setAnswerInput('');
                    }}
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                  >
                    {t('common.cancel')}
                  </Button>
                )}
                
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting || !answerInput.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      {t('exercise.submitting')}
                    </>
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        
        {hasAnswer && exercise.isCorrect === false && !isRetrying && (
          <div className="mt-4 flex justify-start">
            <Button 
              onClick={() => setIsRetrying(true)}
              variant="outline"
              size="sm"
              className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/20"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {t('exercise.tryAgain')}
            </Button>
          </div>
        )}
        
        {hasAnswer && (
          <div className="mt-4 flex justify-end items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('exercise.showExplanation')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-left">
                    {processedQuestion.isMath ? (
                      <MathRenderer 
                        latex={processedQuestion.processed} 
                        inline 
                      />
                    ) : (
                      processedQuestion.processed
                    )}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('exercise.yourAnswer')}:</h4>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {processedUserAnswer?.isMath ? (
                          <MathRenderer 
                            latex={processedUserAnswer.processed} 
                            inline 
                          />
                        ) : (
                          processedUserAnswer?.processed
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-lg",
                    exercise.isCorrect 
                      ? "bg-green-50 dark:bg-green-950/20" 
                      : "bg-amber-50 dark:bg-amber-950/20"
                  )}>
                    <div className="space-y-3">
                      <div className="flex items-center mb-2">
                        {exercise.isCorrect 
                          ? <ThumbsUp className="w-4 h-4 mr-2 text-green-600" />
                          : <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                        }
                        <h4 className="text-sm font-medium">
                          {exercise.isCorrect 
                            ? exercise.attemptCount > 1 
                              ? `${t('exercise.greatWork')} (${t('exercise.attempt')} ${exercise.attemptCount})` 
                              : t('exercise.greatWork') 
                            : `${t('exercise.learningOpportunity')}${exercise.attemptCount > 1 ? ` (${t('exercise.attempt')} ${exercise.attemptCount})` : ""}`}
                        </h4>
                      </div>
                      
                      {hasRelatedMessages ? (
                        <div className="space-y-3">
                          {exercise.relatedMessages?.map((message, index) => (
                            <div key={index} className="p-3 rounded-lg bg-white dark:bg-gray-800 text-sm">
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-700 dark:text-gray-300 prose-sm max-w-full"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(formattedExplanation, { 
                              ALLOWED_TAGS: ['strong', 'br', 'em', 'p'],
                              ALLOWED_ATTR: ['class']
                            }) 
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {!exercise.isCorrect && exercise.question && (
          <VideoSuggestions 
            homeworkContent={exercise.question}
            subjectSlug={exercise.subjectId}
          />
        )}
      </div>
    </motion.div>
  );
};

export default Exercise;
