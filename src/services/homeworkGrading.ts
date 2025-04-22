
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
        isGradingRequest: true,
        isMathProblem: true // Always treat as math problem for strict grading
      },
    });

    if (gradeError) {
      console.error('Error getting grade:', gradeError);
      throw gradeError;
    }

    if (!gradeData?.content) {
      console.error('Invalid grade response:', gradeData);
      throw new Error('Invalid grading response received');
    }

    console.log('Raw grade response:', gradeData.content);

    // Strict parsing of the CORRECT/INCORRECT response
    const responseContent = gradeData.content.trim().toUpperCase();
    if (responseContent !== 'CORRECT' && responseContent !== 'INCORRECT') {
      console.error('Invalid grade format:', responseContent);
      throw new Error('Invalid grade format received');
    }

    const isCorrect = responseContent === 'CORRECT';
    console.log(`Graded exercise with result: ${isCorrect}`);

    // Step 2: If incorrect, get guidance
    let explanation = '';
    if (!isCorrect) {
      const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `The student answered this incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Please provide guidance without giving away the answer.`,
          modelId: 'gpt4o',
          history: [],
          isExercise: true,
          isMathProblem: true
        },
      });

      if (guidanceError) {
        console.error('Error getting guidance:', guidanceError);
        throw guidanceError;
      }

      if (!guidanceData?.content) {
        console.error('Invalid guidance response:', guidanceData);
        throw new Error('Invalid guidance response received');
      }

      explanation = guidanceData.content;
    } else {
      explanation = "**Problem:** " + exercise.question + "\n\n**Guidance:** Well done! You've answered this correctly. Would you like to explore this concept further or try a more challenging problem?";
    }

    // Display appropriate notification
    toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Check the guidance to improve your understanding.");

    // Return the updated exercise with explicit isCorrect field
    const gradedExercise = {
      ...exercise,
      isCorrect,
      explanation
    };

    console.log('Returning graded exercise:', gradedExercise);
    return gradedExercise;
  } catch (error) {
    console.error('Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return {
      ...exercise,
      isCorrect: undefined,
      explanation: "There was an error grading this exercise. Please try submitting it again."
    };
  }
};
