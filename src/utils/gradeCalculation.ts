
import { Exercise, Grade } from '@/types/chat';

/**
 * Calculates a grade based on the correct/incorrect exercises
 */
export const calculateGrade = (exercises: Exercise[]): Grade => {
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined);
  
  if (answeredExercises.length === 0) {
    return { percentage: 0, letter: 'N/A' };
  }
  
  const correctExercises = answeredExercises.filter(ex => ex.isCorrect).length;
  const percentage = Math.round((correctExercises / answeredExercises.length) * 100);
  
  let letter = 'F';
  if (percentage >= 90) letter = 'A';
  else if (percentage >= 80) letter = 'B';
  else if (percentage >= 70) letter = 'C';
  else if (percentage >= 60) letter = 'D';
  
  return { percentage, letter };
};
