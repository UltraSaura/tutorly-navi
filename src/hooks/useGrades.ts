
import { useState, useCallback } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { calculateGrade } from '@/utils/gradeCalculation';

export const useGrades = () => {
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });

  const updateGrades = useCallback((exercises: Exercise[]) => {
    console.log('Calculating new grade for', exercises.length, 'exercises');
    const newGrade = calculateGrade(exercises);
    console.log('New grade calculated:', newGrade);
    setGrade(newGrade);
  }, []);

  return {
    grade,
    updateGrades,
  };
};
