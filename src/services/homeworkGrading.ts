
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
    console.log("AI response received for grading:", aiResponse.substring(0, 100) + '...');
    console.log("Full AI response length:", aiResponse.length);
    
    // Determine if the answer is correct based on keywords in the response
    const correctKeywords = ['correct', 'right', 'accurate', 'perfect', 'excellent', 'well done'];
    const incorrectKeywords = ['incorrect', 'wrong', 'mistake', 'error', 'not right', 'not correct'];
    
    let isCorrect = false;
    
    // Check for explicit CORRECT/INCORRECT markers first (for math problems)
    if (aiResponse.toUpperCase().includes('CORRECT') && !aiResponse.toUpperCase().includes('INCORRECT')) {
      isCorrect = true;
      console.log("Answer marked as CORRECT based on keyword detection");
    } else if (aiResponse.toUpperCase().includes('INCORRECT')) {
      isCorrect = false;
      console.log("Answer marked as INCORRECT based on keyword detection");
    } else {
      // Fall back to keyword detection
      if (correctKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword)) && 
          !incorrectKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = true;
        console.log("Answer marked as correct based on positive keyword detection");
      } else {
        isCorrect = false;
        console.log("Answer marked as incorrect based on negative/missing positive keywords");
      }
    }
    
    // Make sure the explanation is well-formatted with proper markdown
    let formattedExplanation = aiResponse;
    
    // Add Problem/Guidance sections if they're missing
    if (!formattedExplanation.includes('**Problem:**')) {
      formattedExplanation = `**Problem:**\n${exercise.question}\n\n` + formattedExplanation;
    }
    
    if (!formattedExplanation.includes('**Guidance:**')) {
      const problemSection = formattedExplanation.split('**Problem:**')[1];
      const problemContent = problemSection.split('\n\n')[0];
      
      formattedExplanation = `**Problem:**${problemContent}\n\n**Guidance:**\n${isCorrect ? 'CORRECT. ' : 'INCORRECT. '}` + 
        formattedExplanation.replace(`**Problem:**${problemContent}`, '').trim();
    }
    
    console.log("Formatted explanation for exercise (preview):", formattedExplanation.substring(0, 100) + '...');
    console.log("Formatted explanation length:", formattedExplanation.length);
    
    // Display a notification based on the result
    toast.success(`Your homework has been graded. ${isCorrect ? 'Great job!' : 'Review the feedback for improvements.'}`);
    
    // Return the updated exercise with the full explanation
    const updatedExercise = {
      ...exercise,
      isCorrect,
      explanation: formattedExplanation,
      expanded: true // Auto-expand to show the explanation
    };
    
    console.log("Returning updated exercise with explanation:", updatedExercise.explanation ? "present" : "missing");
    
    return updatedExercise;
  } catch (error) {
    console.error('Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return exercise;
  }
};
