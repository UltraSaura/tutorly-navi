import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import Exercise from './Exercise';
import { Message } from '@/types/chat';
interface ExerciseListProps {
  exercises: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
    relatedMessages?: Message[];
  }[];
  grade: {
    percentage: number;
    letter: string;
  };
  toggleExerciseExpansion: (id: string) => void;
}
const ExerciseList = ({
  exercises,
  grade,
  toggleExerciseExpansion
}: ExerciseListProps) => {
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const totalExercises = exercises.length;
  return <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 py-[9px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="text-lg font-semibold">Graded Homework & Exercises</h2>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-studywhiz-600" />
            <span className="font-medium text-sm">
              Overall Grade: <span className="text-xl font-bold">{grade.percentage}%</span> {grade.letter !== 'N/A' && <span className="ml-1">({grade.letter})</span>}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          
          <span className="px-0 mx-[227px] my-0">{correctExercises} of {answeredExercises} correct • {totalExercises} total</span>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100%-8rem)] p-4">
        {exercises.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No graded exercises yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              Submit your homework or exercises in the chat, and I'll grade them for you. Try phrases like "Here's my answer to this problem..." followed by your solution.
            </p>
          </div> : <div className="space-y-4">
            {exercises.map(exercise => <Exercise key={exercise.id} exercise={exercise} toggleExerciseExpansion={toggleExerciseExpansion} />)}
          </div>}
      </ScrollArea>
    </>;
};
export default ExerciseList;