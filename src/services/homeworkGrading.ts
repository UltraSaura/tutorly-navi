
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';
import { isArithmeticProblem, evaluateArithmeticProblem } from '@/utils/arithmeticEvaluator';
import { getAIGuidance, getAIGrading } from './aiGuidance';

export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    if (!exercise.question || !exercise.userAnswer) {
      console.log("Missing question or answer for grading");
      return exercise;
    }

    // First, check for simple arithmetic problems
    if (isArithmeticProblem(exercise.question, exercise.userAnswer)) {
      return await handleArithmeticProblem(exercise);
    }

    // Fallback to AI grading for complex problems
    return await handleComplexProblem(exercise);
  } catch (error) {
    console.error('Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return exercise;
  }
};

const handleArithmeticProblem = async (exercise: Exercise): Promise<Exercise> => {
  const isCorrect = evaluateArithmeticProblem(exercise.question, exercise.userAnswer);
  
  console.log("Simple arithmetic problem:", { 
    question: exercise.question, 
    userAnswer: exercise.userAnswer, 
    isCorrect 
  });
  
  const explanation = isCorrect 
    ? formatSuccessGuidance(exercise)
    : await getAIGuidance(exercise);

  showGradingToast(isCorrect);

  return {
    ...exercise,
    isCorrect,
    explanation
  };
};

const handleComplexProblem = async (exercise: Exercise): Promise<Exercise> => {
  const isCorrect = await getAIGrading(exercise);
  const explanation = isCorrect 
    ? formatSuccessGuidance(exercise)
    : await getAIGuidance(exercise);

  showGradingToast(isCorrect);

  return {
    ...exercise,
    isCorrect,
    explanation
  };
};

const formatSuccessGuidance = (exercise: Exercise): string => {
  return "**Problem:** " + exercise.question + "\n\n**Guidance:** Great job! Your answer is correct.";
};

const showGradingToast = (isCorrect: boolean): void => {
  toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Let's review your solution.");
};

