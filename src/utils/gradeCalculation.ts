
import { Exercise, Grade } from '@/types/chat';

/**
 * Calculates a grade based on the correct/incorrect exercises
 */
export const calculateGrade = (exercises: Exercise[]): Grade => {
  console.log('[gradeCalculation] Called with exercises:', exercises);

  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined && ex.userAnswer && ex.userAnswer.trim() !== "");

  console.log('[gradeCalculation] Filtered answered exercises:', answeredExercises);

  if (answeredExercises.length === 0) {
    console.log('[gradeCalculation] No answered exercises. Returning N/A.');
    return { percentage: 0, letter: 'N/A' };
  }

  const correctExercises = answeredExercises.filter(ex => ex.isCorrect).length;
  console.log('[gradeCalculation] Number of correct exercises:', correctExercises);

  const percentage = Math.round((correctExercises / answeredExercises.length) * 100);

  console.log('[gradeCalculation] Calculated percentage:', percentage);

  let letter = 'F';
  if (percentage >= 90) letter = 'A';
  else if (percentage >= 80) letter = 'B';
  else if (percentage >= 70) letter = 'C';
  else if (percentage >= 60) letter = 'D';

  const result = { percentage, letter };
  console.log('[gradeCalculation] Grade calculation result:', result);
  return result;
};
