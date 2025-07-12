
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
        modelId: 'deepseek-chat',
        history: [],
        isGradingRequest: true
      },
    });

    console.log('[homeworkGrading] Grade API response:', { gradeData, gradeError });

    if (gradeError) {
      console.error('[homeworkGrading] Grading error:', gradeError);
      toast.error('Failed to grade your answer. Please try again.');
      
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** There was an error grading your answer. The system couldn't determine if your answer is correct. Please try again later or contact support if the issue persists.`
      };
    }

    if (!gradeData?.content) {
      console.error('[homeworkGrading] Invalid grading response:', gradeData);
      toast.error('Received invalid response from grading service.');
      
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
          message: `The student answered incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Provide helpful guidance to help them understand the correct approach without giving away the answer directly. Focus on the learning process and concepts they should review.`,
          modelId: 'deepseek-chat',
          history: [],
          isExercise: true
        },
      });

      console.log('[homeworkGrading] Guidance API response:', { guidanceData, guidanceError });

      if (guidanceError || !guidanceData?.content) {
        console.error('[homeworkGrading] Error getting guidance:', guidanceError || 'No content');
        
        // Provide enhanced math guidance as fallback
        const basicGuidance = generateEnhancedMathGuidance(exercise.question, exercise.userAnswer);
        explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** ${basicGuidance}`;
      } else {
        explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** ${guidanceData.content}`;
      }
      
      console.log('[homeworkGrading] Guidance explanation:', explanation);
    } else {
      explanation = `**Problem:** ${exercise.question}\n\n**Guidance:** Excellent work! You've solved this correctly. Your understanding of the concept is solid. Ready for the next challenge?`;
      console.log('[homeworkGrading] Correct answer - positive feedback provided');
    }

    // Display appropriate notification
    toast.success(isCorrect ? "Correct! Great job!" : "Incorrect. Check the guidance below to improve your understanding.");

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
    
    return {
      ...exercise,
      isCorrect: false,
      explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** An unexpected error occurred while grading your answer. Please try again later.`
    };
  }
};

/**
 * Generate enhanced math guidance when AI service fails
 */
const generateEnhancedMathGuidance = (question: string, userAnswer: string): string => {
  // Check for basic arithmetic problems with decimal support
  const basicMathPattern = /(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/;
  const basicMatch = question.match(basicMathPattern);
  
  if (basicMatch) {
    const [, num1, operator, num2] = basicMatch;
    const a = parseFloat(num1);
    const b = parseFloat(num2);
    
    let correctAnswer: number;
    let operationName: string;
    let stepByStep: string;
    
    switch (operator) {
      case '+':
        correctAnswer = a + b;
        operationName = 'addition';
        stepByStep = `Step 1: Add ${a} + ${b}\nStep 2: ${a} + ${b} = ${correctAnswer}`;
        break;
      case '-':
        correctAnswer = a - b;
        operationName = 'subtraction';
        stepByStep = `Step 1: Subtract ${b} from ${a}\nStep 2: ${a} - ${b} = ${correctAnswer}`;
        break;
      case '*':
        correctAnswer = a * b;
        operationName = 'multiplication';
        stepByStep = `Step 1: Multiply ${a} × ${b}\nStep 2: ${a} × ${b} = ${correctAnswer}`;
        break;
      case '/':
        correctAnswer = a / b;
        operationName = 'division';
        stepByStep = `Step 1: Divide ${a} by ${b}\nStep 2: ${a} ÷ ${b} = ${correctAnswer}`;
        break;
      default:
        return "Your answer was incorrect. Please double-check your calculation and try the problem again step by step.";
    }
    
    return `Your answer was incorrect. This is a ${operationName} problem.

${stepByStep}

Review your ${operationName} steps and make sure you're calculating correctly. The correct answer is ${correctAnswer}.

Try working through it again, and remember to double-check your arithmetic!`;
  }
  
  // Check for equation solving
  if (question.includes('=') && question.includes('x')) {
    return `This appears to be an equation with a variable. Here are some tips:

1. Identify what you're solving for (usually x)
2. Use inverse operations to isolate the variable
3. Whatever you do to one side, do to the other side
4. Check your answer by substituting it back into the original equation

Try working through the problem step by step, and remember the goal is to get the variable by itself on one side.`;
  }
  
  // Generic helpful guidance
  return `Your answer was incorrect, but that's part of learning! Here are some general tips:

1. Read the problem carefully and identify what's being asked
2. Break complex problems into smaller steps
3. Show your work so you can check each step
4. Double-check your calculations
5. Think about whether your answer makes sense

Take another look at the problem and try working through it step by step. You've got this!`;
};
