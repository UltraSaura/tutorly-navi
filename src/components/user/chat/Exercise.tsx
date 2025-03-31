
import React, { useEffect } from 'react';
import { Check, X, ChevronUp, ChevronDown, ThumbsUp, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
}

const Exercise = ({ exercise, toggleExerciseExpansion }: ExerciseProps) => {
  // Debug logging to help troubleshoot expansion issues
  useEffect(() => {
    console.log(`Exercise ${exercise.id} - Rendering with expanded state:`, exercise.expanded);
    console.log(`Exercise ${exercise.id} - Has explanation:`, !!exercise.explanation);
    if (exercise.explanation) {
      console.log(`Exercise ${exercise.id} - Explanation length:`, exercise.explanation.length);
      console.log(`Exercise ${exercise.id} - Explanation preview:`, exercise.explanation.substring(0, 50) + '...');
    }
  }, [exercise.id, exercise.expanded, exercise.explanation]);

  const handleToggleClick = () => {
    console.log(`Toggle clicked for exercise ${exercise.id}, current state:`, exercise.expanded);
    toggleExerciseExpansion(exercise.id);
  };

  const formatExplanation = (text: string) => {
    if (!text) return '<p>No explanation available</p>';
    
    try {
      // Simplified formatting to preserve more of the original content
      let formatted = text
        .replace(/\*\*Problem:\*\*/g, '<h3 class="text-studywhiz-600 dark:text-studywhiz-400 font-semibold text-md my-2">Problem:</h3>')
        .replace(/\*\*Guidance:\*\*/g, '<h3 class="text-studywhiz-600 dark:text-studywhiz-400 font-semibold text-md my-2">Guidance:</h3>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      
      // Just convert line breaks to <br/> tags
      formatted = formatted.replace(/\n\n/g, '<br /><br />').replace(/\n/g, '<br />');
      
      return formatted;
    } catch (error) {
      console.error("Error formatting explanation:", error);
      return `<p>${text}</p>`;
    }
  };

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md",
        exercise.isCorrect !== undefined 
          ? exercise.isCorrect 
            ? "border-green-200 dark:border-green-900" 
            : "border-red-200 dark:border-red-900"
          : "border-gray-200 dark:border-gray-700"
      )}
    >
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
              exercise.isCorrect !== undefined ? (exercise.isCorrect 
                ? "text-green-700 dark:text-green-400" 
                : "text-red-700 dark:text-red-400") : ""
            )}>
              {exercise.userAnswer}
            </p>
          </div>
        )}
        
        {exercise.explanation && (
          <Collapsible 
            open={exercise.expanded} 
            onOpenChange={handleToggleClick}
            className="mt-4"
          >
            <div className="flex justify-end">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <span className="mr-1">{exercise.expanded ? 'Hide explanation' : 'Show explanation'}</span>
                  {exercise.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent className="overflow-hidden">
              <Separator className="my-2" />
              <div 
                className={cn(
                  "p-4 bg-gray-50 dark:bg-gray-900/20",
                  exercise.isCorrect !== undefined
                    ? (exercise.isCorrect 
                      ? "bg-green-50 dark:bg-green-950/20" 
                      : "bg-amber-50 dark:bg-amber-950/20")
                    : ""
                )}
              >
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-2 text-studywhiz-600" />
                  Explanation
                </h4>
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 explanation-content overflow-auto max-h-[500px] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatExplanation(exercise.explanation) }}
                />
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 italic">
                    Remember to practice this concept until you fully understand it!
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

export default Exercise;
