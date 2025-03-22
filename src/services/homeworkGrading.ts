
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';

/**
 * Evaluates a homework submission using AI and returns the updated exercise with feedback
 */
export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    // Skip if missing question or answer
    if (!exercise.question || !exercise.userAnswer) {
      console.log("Missing question or answer for grading");
      return exercise;
    }
    
    // Call AI service to evaluate the answer
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `I need you to grade this homework. The question is: "${exercise.question}" and the student's answer is: "${exercise.userAnswer}". Please evaluate if it's correct or incorrect, and provide a detailed explanation why.`,
        modelId: 'gpt4o', // Use a good model for evaluation
        history: [],
      },
    });
    
    if (error) throw error;
    
    // Parse the AI response to determine if the answer is correct
    const aiResponse = data.content;
    
    // Determine if the answer is correct based on keywords in the response
    const correctKeywords = ['correct', 'right', 'accurate', 'perfect', 'excellent', 'well done'];
    const incorrectKeywords = ['incorrect', 'wrong', 'mistake', 'error', 'not right', 'not correct'];
    
    let isCorrect = false;
    
    // Check for positive/negative keywords
    if (correctKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
      isCorrect = true;
    } else if (incorrectKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
      isCorrect = false;
    } else {
      // Default to not correct if no clear indicators
      isCorrect = false;
    }
    
    // Extract an explanation from the AI response
    let explanation = aiResponse;
    if (explanation.length > 500) {
      // Truncate very long explanations but preserve meaning
      explanation = explanation.substring(0, 500) + '...';
    }
    
    // Display a notification based on the result
    toast.success(`Your homework has been graded. ${isCorrect ? 'Great job!' : 'Review the feedback for improvements.'}`);
    
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
