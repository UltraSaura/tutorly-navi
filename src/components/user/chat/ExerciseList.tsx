
import React from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import Exercise from './Exercise';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';

interface ExerciseListProps {
  exercises: {
    id: string;
    question: string;
    userAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
    expanded: boolean;
    subjectId?: string;
    relatedMessages?: Message[];
  }[];
  grade: {
    percentage: number;
    letter: string;
  };
  toggleExerciseExpansion: (id: string) => void;
  subjectId?: string | null;
}

const ExerciseList = ({ 
  exercises, 
  grade, 
  toggleExerciseExpansion,
  subjectId
}: ExerciseListProps) => {
  const { subjects } = useAdmin();
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const totalExercises = exercises.length;

  // Get the subject name if we have a subjectId
  const currentSubject = subjectId ? subjects.find(s => s.id === subjectId) : null;

  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {currentSubject ? (
              <div className="flex items-center gap-2">
                <DynamicIcon 
                  name={(currentSubject.icon as any) || 'book'} 
                  className="h-5 w-5 text-studywhiz-600" 
                />
                {currentSubject.name} Exercises
              </div>
            ) : (
              "Graded Homework & Exercises"
            )}
          </h2>
        </div>
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
            <h3 className="text-lg font-medium mb-2">
              {currentSubject 
                ? `No ${currentSubject.name} exercises yet` 
                : "No graded exercises yet"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              {currentSubject 
                ? `Submit your ${currentSubject.name} homework or exercises in the chat, and I'll grade them for you.` 
                : "Submit your homework or exercises in the chat, and I'll grade them for you. Try phrases like \"Here's my answer to this problem...\" followed by your solution."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <Exercise
                key={exercise.id}
                exercise={exercise}
                toggleExerciseExpansion={toggleExerciseExpansion}
                subjects={subjects}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
};

export default ExerciseList;
