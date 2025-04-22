import React from 'react';
import { ChevronUp, ChevronDown, ThumbsUp, AlertCircle, CircleCheck, CircleX } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';

interface ExerciseProps {
  exercise: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
    relatedMessages?: Message[];
  };
  toggleExerciseExpansion: (id: string) => void;
}

/**
 * Exercise component displays a homework exercise with its question, 
 * user's answer, and UI indicators for correct/incorrect status
 */
const Exercise = ({
  exercise,
  toggleExerciseExpansion
}: ExerciseProps) => {
  const formattedExplanation = exercise.explanation ? exercise.explanation
    .replace(/\*\*(Problem|Guidance):\*\*/g, '<strong class="text-studywhiz-600 dark:text-studywhiz-400">$1:</strong>')
    .split('\n')
    .join('<br />') : '';

  const hasRelatedMessages = exercise.relatedMessages && exercise.relatedMessages.length > 0;

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
            <h3 className="text-md font-medium">{exercise.question}</h3>
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
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-xs hover:text-gray-700 dark:hover:text-gray-300",
              exercise.expanded ? "text-studywhiz-600" : "text-gray-500"
            )} 
            onClick={() => toggleExerciseExpansion(exercise.id)}
          >
            {exercise.expanded ? 'Hide explanation' : 'Show explanation'}
            {exercise.expanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {exercise.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Separator />
            <div className={cn(
              "p-4",
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
                    {exercise.isCorrect ? "Great work!" : "Learning Opportunity"}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Exercise;
