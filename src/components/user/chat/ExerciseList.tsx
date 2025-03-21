
import React from 'react';
import { BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import Exercise from './Exercise';

interface ExerciseListProps {
  exercises: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
  }[];
  grade: {
    percentage: number;
    letter: string;
  };
  toggleExerciseExpansion: (id: string) => void;
  submitExerciseAnswer: (id: string, answer: string) => void;
}

const ExerciseList = ({ 
  exercises, 
  grade, 
  toggleExerciseExpansion, 
  submitExerciseAnswer 
}: ExerciseListProps) => {
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const totalExercises = exercises.length;

  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Current Exercises & Homework</h2>
        <div className="flex justify-between items-center mt-2">
          <div className="flex-1 mr-4">
            <Progress value={grade.percentage} className="h-2 bg-gray-200" />
          </div>
          <span className="text-lg font-semibold">
            {answeredExercises > 0 ? `${grade.percentage}% ${grade.letter}` : 'No graded work yet'}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Progress</span>
          <span>{correctExercises} of {answeredExercises} correct • {totalExercises} total</span>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100%-8rem)] p-4">
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No exercises submitted yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              Use the "Submit Exercise" tab to add your homework questions or exercises, or ask me a question in the chat and I'll help you convert it to an exercise.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <Exercise
                key={exercise.id}
                exercise={exercise}
                toggleExerciseExpansion={toggleExerciseExpansion}
                submitExerciseAnswer={submitExerciseAnswer}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
};

export default ExerciseList;
