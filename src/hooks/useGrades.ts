
import { useState, useCallback } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { calculateGrade } from '@/utils/gradeCalculation';

export const useGrades = () => {
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });

  const updateGrades = useCallback((exercises: Exercise[]) => {
    console.log('[useGrades] updateGrades called', {
      exercisesCount: exercises.length,
      exercises
    });
    const newGrade = calculateGrade(exercises);
    console.log('[useGrades] New grade calculated and about to be set:', newGrade);
    setGrade(newGrade);
  }, []);

  return {
    grade,
    updateGrades,
  };
};
