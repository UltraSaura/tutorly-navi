
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
    
    // Special handling for mathematical expressions
    const isMathProblem = /\d+\s*[\+\-\*\/]\s*\d+/.test(exercise.question);
    let message = "";
    
    if (isMathProblem) {
      message = `I need you to grade this math problem. The equation is: "${exercise.question}=${exercise.userAnswer}". Is this correct? Please evaluate it step by step and clearly state if it's CORRECT or INCORRECT at the beginning of your response. Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation. Use numbered lists for steps and bullet points for alternatives.`;
    } else {
      message = `I need you to grade this homework. The question is: "${exercise.question}" and the student's answer is: "${exercise.userAnswer}". Please evaluate if it's correct or incorrect, and provide a detailed explanation why. Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation. Use numbered lists for steps and bullet points for key points.`;
    }
    
    console.log("Sending grading request to AI service:", message);
    
    // Call AI service to evaluate the answer
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: message,
        modelId: 'gpt4o', // Use a good model for evaluation
        history: [],
        isGradingRequest: true, // Flag to ensure proper formatting
      },
    });
    
    if (error) throw error;
    
    // Parse the AI response to determine if the answer is correct
    const aiResponse = data.content;
    console.log("AI response received:", aiResponse);
    
    // Determine if the answer is correct based on keywords in the response
    const correctKeywords = ['correct', 'right', 'accurate', 'perfect', 'excellent', 'well done'];
    const incorrectKeywords = ['incorrect', 'wrong', 'mistake', 'error', 'not right', 'not correct'];
    
    let isCorrect = false;
    
    // Check for explicit CORRECT/INCORRECT markers first (for math problems)
    if (aiResponse.toUpperCase().includes('CORRECT') && !aiResponse.toUpperCase().includes('INCORRECT')) {
      isCorrect = true;
    } else if (aiResponse.toUpperCase().includes('INCORRECT')) {
      isCorrect = false;
    } else {
      // Fall back to keyword detection
      if (correctKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword)) && 
          !incorrectKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = true;
      } else {
        isCorrect = false;
      }
    }
    
    // Display a notification based on the result
    toast.success(`Your homework has been graded. ${isCorrect ? 'Great job!' : 'Review the feedback for improvements.'}`);
    
    // Ensure the formatting is correct for the explanation
    const formattedExplanation = aiResponse;
    
    console.log("Formatted explanation for exercise:", formattedExplanation);
    
    // Return the updated exercise with the full explanation
    return {
      ...exercise,
      isCorrect,
      explanation: formattedExplanation,
      expanded: true // Auto-expand to show the explanation
    };
  } catch (error) {
    console.error('Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return exercise;
  }
};
