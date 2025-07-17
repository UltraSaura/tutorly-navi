import React from 'react';
import { ThumbsUp, AlertCircle, CircleCheck, CircleX } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { useLanguage } from '@/context/SimpleLanguageContext';

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
  };
  exerciseNumber: number;
  toggleExerciseExpansion: (id: string) => void;
}

/**
 * Exercise component displays a homework exercise with its question, 
 * user's answer, and UI indicators for correct/incorrect status
 */
const Exercise = ({
  exercise,
  exerciseNumber,
  toggleExerciseExpansion
}: ExerciseProps) => {
  const { t } = useLanguage();
  const formattedExplanation = exercise.explanation ? exercise.explanation
    .replace(/\*\*(Problem|Guidance):\*\*/g, '<strong class="text-studywhiz-600 dark:text-studywhiz-400">$1:</strong>')
    .split('\n')
    .join('<br />') : '';

  const hasRelatedMessages = exercise.relatedMessages && exercise.relatedMessages.length > 0;

  const getBadgeColor = (isCorrect?: boolean) => {
    if (isCorrect === true) return "bg-green-500";
    if (isCorrect === false) return "bg-red-500";
    return "bg-blue-500"; // unanswered
  };

  // Debug rendering
  console.log('Exercise rendering:', { 
    id: exercise.id,
    question: exercise.question, 
    isCorrect: exercise.isCorrect, 
    hasAnswer: !!exercise.userAnswer 
  });

  return (
    <motion.div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md",
        exercise.isCorrect !== undefined 
          ? exercise.isCorrect 
            ? "border-green-200 dark:border-green-900" 
            : "border-amber-200 dark:border-amber-900" 
          : "border-gray-200 dark:border-gray-700"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 py-[5px]">
        <div className="flex items-center gap-4">
          <motion.div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
              getBadgeColor(exercise.isCorrect)
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            aria-label={`Exercise number ${exerciseNumber}`}
          >
            {exerciseNumber}
          </motion.div>
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
              <h3 className="text-md font-medium">{exercise.question}</h3>
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
        
        {exercise.userAnswer && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 py-[10px]">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {exercise.userAnswer}
            </p>
          </div>
        )}
        
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
                  Exercise {exerciseNumber}: {exercise.question}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {exercise.userAnswer && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('exercise.yourAnswer')}:</h4>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {exercise.userAnswer}
                      </p>
                    </div>
                  </div>
                )}
                
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
                        dangerouslySetInnerHTML={{ __html: formattedExplanation }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
};

export default Exercise;
