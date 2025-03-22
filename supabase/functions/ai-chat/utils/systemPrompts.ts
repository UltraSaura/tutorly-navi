
// System prompts utility module for AI chat
// Contains specialized system prompts for different chat scenarios

/**
 * Generates an appropriate system message based on message context
 * 
 * @param isExercise Whether the message appears to be a homework/exercise
 * @param isGradingRequest Whether the message is asking for grading
 * @returns The appropriate system message object
 */
export function generateSystemMessage(isExercise: boolean = false, isGradingRequest: boolean = false): { role: string, content: string } {
  // Base system message for general educational assistance
  if (!isExercise && !isGradingRequest) {
    return {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor. You help students understand concepts, solve problems, and learn new subjects. Be friendly, concise, and educational in your responses. Prioritize explaining concepts clearly rather than just giving answers.'
    };
  }
  
  // System message for exercises and homework
  if (isExercise && !isGradingRequest) {
    return {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor specializing in exercises and homework. When a student submits a homework question or exercise, you must format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation. Be detailed in your guidance, providing step-by-step explanations that help the student understand the solution process without giving away the full answer.'
    };
  }
  
  // System message for grading requests
  if (isGradingRequest) {
    return {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor specializing in grading homework and exercises. You must format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your detailed explanation. Clearly state CORRECT or INCORRECT at the beginning of your guidance. Be thorough but concise in your explanation, and ensure you maintain the exact formatting with asterisks for the Problem and Guidance sections.'
    };
  }
  
  // Fallback to general educational system message
  return {
    role: 'system',
    content: 'You are StudyWhiz, an educational AI tutor. You help students understand concepts, solve problems, and learn new subjects. Be friendly, concise, and educational in your responses. Prioritize explaining concepts clearly rather than just giving answers.'
  };
}

/**
 * Enhances system message for specific math problems
 * 
 * @param systemMessage The base system message
 * @param userMessage The user's message
 * @returns Enhanced system message if math problem is detected, otherwise original
 */
export function enhanceSystemMessageForMath(
  systemMessage: { role: string, content: string }, 
  userMessage: string
): { role: string, content: string } {
  // Check if this might be a math problem (simple check for numbers and operators)
  const isMathProblem = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(userMessage);
  
  if (isMathProblem) {
    return {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor specializing in mathematics. When a student submits a math problem or equation, evaluate whether their answer is correct or incorrect. If the equation contains "=" followed by a number, treat that as the student\'s proposed answer. You must format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation. In the guidance section, clearly state whether the answer is CORRECT or INCORRECT at the beginning, and then provide a detailed explanation showing step-by-step work. Be precise with mathematical notation and explain concepts thoroughly. Ensure you maintain the exact formatting with asterisks for the Problem and Guidance sections.'
    };
  }
  
  // Return original system message if not a math problem
  return systemMessage;
}
