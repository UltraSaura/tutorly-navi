
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';

export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    if (!exercise.question || !exercise.userAnswer) {
      console.error("Missing question or answer for grading:", exercise);
      toast.error('Please provide both a question and an answer for grading.');
      return exercise;
    }

    console.log('Starting homework evaluation for:', { 
      question: exercise.question, 
      answer: exercise.userAnswer 
    });

    // Step 1: Get quick grade (just correct/incorrect)
    const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Grade this answer. Question: "${exercise.question}" Answer: "${exercise.userAnswer}"`,
        modelId: 'gpt4o',
        history: [],
        isGradingRequest: true
      },
    });

    if (gradeError) {
      console.error('Grading error:', gradeError);
      toast.error('Failed to grade your answer. Please try again.');
      throw gradeError;
    }

    if (!gradeData?.content) {
      console.error('Invalid grading response:', gradeData);
      toast.error('Received invalid response from grading service.');
      throw new Error('Invalid grading response received');
    }

    console.log('Raw grade response:', gradeData.content);

    // Strict parsing of the CORRECT/INCORRECT response
    const responseContent = gradeData.content.trim().toUpperCase();
    if (responseContent !== 'CORRECT' && responseContent !== 'INCORRECT') {
      console.error('Invalid grade format received:', responseContent);
      toast.error('Received invalid grade format. Please try again.');
      throw new Error('Invalid grade format received');
    }

    const isCorrect = responseContent === 'CORRECT';
    console.log(`Exercise graded as: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Step 2: Get guidance based on correctness
    let explanation = '';
    if (!isCorrect) {
      console.log('Requesting guidance for incorrect answer');
      const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `The student answered incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Provide guidance to help them understand without revealing the answer directly.`,
          modelId: 'gpt4o',
          history: [],
          isExercise: true
        },
      });

      if (guidanceError) {
        console.error('Error getting guidance:', guidanceError);
        toast.error('Failed to get guidance. Please try again.');
        throw guidanceError;
      }

      if (!guidanceData?.content) {
        console.error('Invalid guidance response:', guidanceData);
        toast.error('Received invalid guidance response.');
        throw new Error('Invalid guidance response received');
      }

      explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** ${guidanceData.content}`;
    } else {
      explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** Well done! You've answered this correctly. Would you like to explore this concept further or try a more challenging problem?`;
    }

    console.log('Generated explanation:', explanation);

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
    return exercise;
  }
};
