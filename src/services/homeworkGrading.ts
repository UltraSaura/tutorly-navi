
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';

// Simple arithmetic evaluation function
const evaluateArithmeticProblem = (question: string, userAnswer: string): boolean => {
  try {
    // Safely evaluate the arithmetic problem
    const cleanQuestion = question.replace(/\s+/g, '');
    const cleanAnswer = userAnswer.replace(/\s+/g, '');
    
    console.log("Arithmetic evaluation:", { question: cleanQuestion, answer: cleanAnswer });
    
    return eval(cleanQuestion) === Number(cleanAnswer);
  } catch (error) {
    console.error("Arithmetic evaluation error:", error);
    return false;
  }
};

export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    if (!exercise.question || !exercise.userAnswer) {
      console.log("Missing question or answer for grading");
      return exercise;
    }

    // First, check for simple arithmetic problems
    const isSimpleArithmetic = /^\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+$/.test(exercise.question + " = " + exercise.userAnswer);
    
    if (isSimpleArithmetic) {
      const isCorrect = evaluateArithmeticProblem(exercise.question, exercise.userAnswer);
      
      console.log("Simple arithmetic problem:", { 
        question: exercise.question, 
        userAnswer: exercise.userAnswer, 
        isCorrect 
      });
      
      // AI-powered guidance only if incorrect
      const explanation = isCorrect 
        ? "**Problem:** " + exercise.question + "\n\n**Guidance:** Great job! Your answer is correct."
        : await getAIGuidance(exercise);

      toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Let's review your solution.");

      return {
        ...exercise,
        isCorrect,
        explanation
      };
    }

    // Fallback to AI grading for complex problems
    const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Grade this answer. Question: "${exercise.question}" Answer: "${exercise.userAnswer}"`,
        modelId: 'gpt4o',
        history: [],
        isGradingRequest: true
      },
    });

    if (gradeError) throw gradeError;

    const isCorrect = gradeData.content.trim().toUpperCase() === 'CORRECT';

    // Get guidance only if incorrect
    const explanation = isCorrect 
      ? "**Problem:** " + exercise.question + "\n\n**Guidance:** Great job! Your answer is correct."
      : await getAIGuidance(exercise);

    toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Let's review your solution.");

    return {
      ...exercise,
      isCorrect,
      explanation
    };
  } catch (error) {
    console.error('Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return exercise;
  }
};

// Extracted AI guidance function
async function getAIGuidance(exercise: Exercise): Promise<string> {
  try {
    const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `The student answered this incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Please provide guidance without giving away the answer.`,
        modelId: 'gpt4o',
        history: [],
        isExercise: true
      },
    });

    if (guidanceError) {
      console.error("AI Guidance Error:", guidanceError);
      return "**Problem:** " + exercise.question + "\n\n**Guidance:** There was an issue generating guidance.";
    }

    return guidanceData.content;
  } catch (error) {
    console.error("AI Guidance Generation Error:", error);
    return "**Problem:** " + exercise.question + "\n\n**Guidance:** There was an issue generating guidance.";
  }
}
