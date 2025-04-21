
export const isArithmeticProblem = (question: string, answer: string): boolean => {
  // Remove all spaces and normalize the format
  const normalizedExpression = (question + " = " + answer).replace(/\s+/g, '');
  return /^\d+[\+\-\*\/]\d+=\d+$/.test(normalizedExpression);
};

export const evaluateArithmeticProblem = (question: string, userAnswer: string): boolean => {
  try {
    // Remove all spaces and normalize
    const cleanQuestion = question.replace(/\s+/g, '');
    const cleanAnswer = userAnswer.replace(/\s+/g, '');
    
    // Evaluate the expression
    const expectedResult = eval(cleanQuestion);
    const userResult = Number(cleanAnswer);
    
    console.log("Arithmetic evaluation:", {
      question: cleanQuestion,
      expectedResult,
      userAnswer: userResult,
      isCorrect: Math.abs(expectedResult - userResult) < 0.0001
    });
    
    // Use small epsilon for floating point comparison
    return Math.abs(expectedResult - Number(cleanAnswer)) < 0.0001;
  } catch (error) {
    console.error("Arithmetic evaluation error:", error);
    return false;
  }
};
