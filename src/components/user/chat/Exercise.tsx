
import React from 'react';
import { Check, X, ChevronUp, ChevronDown, ThumbsUp, AlertCircle, BookOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { Subject } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';

interface ExerciseProps {
  exercise: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
    subjectId?: string;
    relatedMessages?: Message[];
  };
  toggleExerciseExpansion: (id: string) => void;
  subjects: Subject[];
}

const Exercise = ({ exercise, toggleExerciseExpansion, subjects }: ExerciseProps) => {
  // Format explanation to make "Problem:" and "Guidance:" bold with better styling
  const formattedExplanation = exercise.explanation ? 
    exercise.explanation
      .replace(/\*\*(Problem|Guidance):\*\*/g, '<strong class="text-studywhiz-600 dark:text-studywhiz-400">$1:</strong>')
      .split('\n').join('<br />') : 
    '';

  // Check if there are any AI messages to display
  const hasRelatedMessages = exercise.relatedMessages && exercise.relatedMessages.length > 0;
  
  // Find subject information if we have a subjectId
  const subject = exercise.subjectId ? subjects.find(s => s.id === exercise.subjectId) : null;

  return (
    <motion.div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md",
        exercise.isCorrect !== undefined 
          ? exercise.isCorrect 
            ? "border-green-200 dark:border-green-900" 
            : "border-red-200 dark:border-red-900"
          : "border-gray-200 dark:border-gray-700"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {subject && (
              <Badge variant="outline" className="mb-2 flex w-fit gap-1 items-center">
                {subject.icon && (
                  <DynamicIcon name={subject.icon as any} className="h-3 w-3" />
                )}
                {subject.name}
              </Badge>
            )}
            <h3 className="text-md font-medium">{exercise.question}</h3>
          </div>
          
          {exercise.isCorrect !== undefined && (
            <div className={`flex items-center gap-1 ml-2 ${
              exercise.isCorrect 
                ? 'text-green-600 dark:text-green-500' 
                : 'text-red-600 dark:text-red-500'
            }`}>
              {exercise.isCorrect ? (
                <div className="flex items-center">
                  <ThumbsUp className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Correct</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Incorrect</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {exercise.userAnswer && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center mb-1">
              <span className="text-sm font-medium">Your answer:</span>
              {exercise.isCorrect !== undefined && (
                exercise.isCorrect ? (
                  <Check className="w-4 h-4 ml-2 text-green-500" />
                ) : (
                  <X className="w-4 h-4 ml-2 text-red-500" />
                )
              )}
            </div>
            <p className={cn(
              "text-sm",
              exercise.isCorrect 
                ? "text-green-700 dark:text-green-400" 
                : "text-red-700 dark:text-red-400"
            )}>
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
            {exercise.expanded ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4" />
            )}
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
                  <ThumbsUp className="w-4 h-4 mr-2 text-studywhiz-600" />
                  <h4 className="text-sm font-medium">Explanation</h4>
                </div>
                
                {hasRelatedMessages ? (
                  // Display AI messages if available
                  <div className="space-y-3">
                    {exercise.relatedMessages?.map((message, index) => (
                      <div 
                        key={index} 
                        className="p-3 rounded-lg bg-white dark:bg-gray-800 text-sm"
                      >
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Display the original explanation if no AI messages
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
