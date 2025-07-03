
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';

export const evaluateHomework = async (
  exercise: Exercise
): Promise<Exercise> => {
  try {
    console.log('[homeworkGrading] evaluateHomework called with:', exercise);
    if (!exercise.question || !exercise.userAnswer) {
      console.error("[homeworkGrading] Missing question or answer for grading:", exercise);
      toast.error('Please provide both a question and an answer for grading.');
      return {
        ...exercise,
        isCorrect: false,
        explanation: "Unable to grade: Missing question or answer."
      };
    }

    console.log('[homeworkGrading] Starting homework evaluation for:', { 
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

    console.log('[homeworkGrading] Grade API response:', { gradeData, gradeError });

    if (gradeError) {
      console.error('[homeworkGrading] Grading error:', gradeError);
      toast.error('Failed to grade your answer. Please try again.');
      
      // Important: Set isCorrect to false when there's an error
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** There was an error grading your answer. The system couldn't determine if your answer is correct. Please try again later or contact support if the issue persists.`
      };
    }

    if (!gradeData?.content) {
      console.error('[homeworkGrading] Invalid grading response:', gradeData);
      toast.error('Received invalid response from grading service.');
      
      // Important: Set isCorrect to false when there's an invalid response
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** Unable to grade your answer due to a technical issue. Please try again later.`
      };
    }

    console.log('[homeworkGrading] Raw grade response:', gradeData.content);

    // Strict parsing of the CORRECT/INCORRECT response
    const responseContent = gradeData.content.trim().toUpperCase();
    console.log('[homeworkGrading] Parsed grading response as:', responseContent);
    
    // Handle invalid format more gracefully
    if (responseContent !== 'CORRECT' && responseContent !== 'INCORRECT') {
      console.error('[homeworkGrading] Invalid grade format received:', responseContent);
      toast.error('Received invalid grade format. Marking as incorrect.');
      
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** The system received an unexpected response when grading your answer. It has been marked as incorrect, but you may want to review it with a teacher.`
      };
    }

    const isCorrect = responseContent === 'CORRECT';
    console.log(`[homeworkGrading] Exercise graded as: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Step 2: Get guidance based on correctness
    let explanation = '';
    if (!isCorrect) {
      console.log('[homeworkGrading] Requesting guidance for incorrect answer');
      const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `The student answered incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Provide guidance to help them understand without revealing the answer directly.`,
          modelId: 'gpt4o',
          history: [],
          isExercise: true
        },
      });

      console.log('[homeworkGrading] Guidance API response:', { guidanceData, guidanceError });

      if (guidanceError || !guidanceData?.content) {
        console.error('[homeworkGrading] Error getting guidance:', guidanceError || 'No content');
        
        // Provide basic math guidance as fallback
        const basicGuidance = generateBasicMathGuidance(exercise.question, exercise.userAnswer);
        explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** ${basicGuidance}`;
      } else {
        explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** ${guidanceData.content}`;
      }
      
      console.log('[homeworkGrading] Non-correct grade. Guidance explanation:', explanation);
    } else {
      explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** Well done! You've answered this correctly. Would you like to explore this concept further or try a more challenging problem?`;
      console.log('[homeworkGrading] Correct grade. Set default positive explanation:', explanation);
    }

    // Display appropriate notification
    toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Check the guidance to improve your understanding.");

    // Return the updated exercise with explicit isCorrect field
    const gradedExercise = {
      ...exercise,
      isCorrect,
      explanation
    };

    console.log('[homeworkGrading] Returning graded exercise:', gradedExercise);
    return gradedExercise;
  } catch (error) {
    console.error('[homeworkGrading] Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    
    // Important: Set isCorrect to false when there's an exception
    return {
      ...exercise,
      isCorrect: false,
      explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** An unexpected error occurred while grading your answer. Please try again later.`
    };
  }
};

/**
 * Generate basic math guidance when AI service fails
 */
const generateBasicMathGuidance = (question: string, userAnswer: string): string => {
  // Check if it's a basic arithmetic problem
  const mathPattern = /(\d+)\s*([+\-*/])\s*(\d+)/;
  const match = question.match(mathPattern);
  
  if (match) {
    const [, num1, operator, num2] = match;
    const a = parseInt(num1);
    const b = parseInt(num2);
    
    let correctAnswer: number;
    let operationName: string;
    
    switch (operator) {
      case '+':
        correctAnswer = a + b;
        operationName = 'addition';
        break;
      case '-':
        correctAnswer = a - b;
        operationName = 'subtraction';
        break;
      case '*':
        correctAnswer = a * b;
        operationName = 'multiplication';
        break;
      case '/':
        correctAnswer = a / b;
        operationName = 'division';
        break;
      default:
        return "Your answer was incorrect. Please double-check your calculation and try again.";
    }
    
    return `Your answer was incorrect. This is a ${operationName} problem: ${a} ${operator} ${b}. 
             Double-check your ${operationName} and make sure you're following the correct steps. 
             The correct answer should be ${correctAnswer}.`;
  }
  
  return "Your answer was incorrect. Please review the problem carefully, check your calculations, and try again. If you're unsure about the method, consider breaking the problem into smaller steps.";
};
