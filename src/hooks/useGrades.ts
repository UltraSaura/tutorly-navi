
import { useState } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { calculateGrade } from '@/utils/gradeCalculation';

export const useGrades = () => {
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });

  const updateGrades = (exercises: Exercise[]) => {
    const newGrade = calculateGrade(exercises);
    setGrade(newGrade);
  };

  return {
    grade,
    updateGrades,
  };
};
