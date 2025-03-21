
import React from 'react';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

interface ExerciseProps {
  exercise: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
  };
  toggleExerciseExpansion: (id: string) => void;
  submitExerciseAnswer: (id: string, answer: string) => void;
}

const Exercise = ({ exercise, toggleExerciseExpansion, submitExerciseAnswer }: ExerciseProps) => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200">
      <div className="p-4">
        <div className="flex justify-between">
          <h3 className="text-md font-medium">{exercise.question}</h3>
          {exercise.isCorrect !== undefined && (
            <div className={`flex items-center gap-1 ${
              exercise.isCorrect 
                ? 'text-green-600 dark:text-green-500' 
                : 'text-red-600 dark:text-red-500'
            }`}>
              {exercise.isCorrect ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </div>
          )}
        </div>
        
        {exercise.userAnswer ? (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Your answer: </span>
            <span className={exercise.isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
              {exercise.userAnswer}
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <Textarea 
              placeholder="Enter your answer here..." 
              className="text-sm resize-none" 
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  submitExerciseAnswer(exercise.id, e.target.value);
                }
              }}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline">Submit Answer</Button>
            </div>
          </div>
        )}
        
        {exercise.userAnswer && (
          <div className="mt-4 flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => toggleExerciseExpansion(exercise.id)}
            >
              {exercise.expanded ? 'Hide explanation' : 'Show explanation'}
              {exercise.expanded ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </Button>
            
            {!exercise.isCorrect && (
              <Button variant="outline" size="sm" className="text-xs">
                Try Again
              </Button>
            )}
          </div>
        )}
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
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="text-sm font-medium mb-2">Explanation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {exercise.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Exercise;
