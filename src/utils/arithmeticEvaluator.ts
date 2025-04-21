
/**
 * Utility functions for evaluating arithmetic expressions
 */

export const isArithmeticProblem = (question: string, answer: string): boolean => {
  return /^\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+$/.test(question + " = " + answer);
};

// Simple arithmetic evaluation function
export const evaluateArithmeticProblem = (question: string, userAnswer: string): boolean => {
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

