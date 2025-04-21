
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';

export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    if (!exercise.question || !exercise.userAnswer) {
      console.log("Missing question or answer for grading");
      return exercise;
    }

    // Step 1: Get quick grade (just correct/incorrect)
    const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Grade this answer. Question: "${exercise.question}" Answer: "${exercise.userAnswer}"`,
        modelId: 'gpt4o',
        history: [],
        isGradingRequest: true
      },
    });

    if (gradeError) throw gradeError;

    // Parse the simple CORRECT/INCORRECT response
    const isCorrect = gradeData.content.trim().toUpperCase() === 'CORRECT';

    // Step 2: If incorrect, get guidance
    let explanation = '';
    if (!isCorrect) {
      const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `The student answered this incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Please provide guidance without giving away the answer.`,
          modelId: 'gpt4o',
          history: [],
          isExercise: true
        },
      });

      if (guidanceError) throw guidanceError;
      explanation = guidanceData.content;
    } else {
      explanation = "**Problem:** " + exercise.question + "\n\n**Guidance:** Well done! You've answered this correctly. Would you like to explore this concept further or try a more challenging problem?";
    }

    // Display appropriate notification
    toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Check the guidance to improve your understanding.");

    // Return the updated exercise
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
