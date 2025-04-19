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
  
  // System message for grading requests
  if (isGradingRequest) {
    return {
      role: 'system',
      content: 'You are a grader. Your role is to ONLY determine if the answer is correct or incorrect. Respond with ONLY "CORRECT" or "INCORRECT" and nothing else. For math problems, verify the calculation but do not explain why.'
    };
  }
  
  // System message for exercises and guidance
  if (isExercise) {
    return {
      role: 'system',
      content: `You are an educational AI tutor focused on guiding students to discover answers themselves. Follow these principles:

1. Use Socratic questioning to help students think through problems
2. Never give direct answers
3. Break down complex problems into smaller steps
4. Encourage critical thinking by asking probing questions
5. Point out concepts the student should review
6. Provide hints that lead to discovery
7. Format your response with:
   **Problem:** (state the problem)
   **Guidance:** (your Socratic questions and hints)

Remember: Your goal is to help students learn how to solve problems, not to solve them for the students.'
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
  // Enhanced math pattern detection
  const isMathProblem = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+\s*=/,       // Algebraic equations
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
    /\b(solve|calculate|compute|evaluate)\b.*?\d+/i  // Math word problems
  ].some(pattern => pattern.test(userMessage));
  
  if (isMathProblem) {
    return {
      role: 'system',
      content: `You are StudyWhiz, an educational AI tutor specializing in mathematics. Your role is to:

1. PRESENTATION:
   - Format your response with "**Problem:**" followed by the problem statement
   - Use "**Guidance:**" for your explanation
   - For equations, clearly show each step on a new line
   - Use proper mathematical notation

2. EVALUATION:
   - If an answer is provided (after "="), verify its correctness
   - Start your guidance with "CORRECT" or "INCORRECT"
   - Show the complete solution process

3. TEACHING APPROACH:
   - Break down complex problems into smaller steps
   - Explain mathematical concepts in simple terms
   - Provide visual representations when helpful (using ASCII art if needed)
   - Include relevant formulas and explain why they're used

4. FEEDBACK:
   - Point out specific errors in incorrect solutions
   - Suggest ways to avoid common mistakes
   - Provide practice tips for similar problems

Always maintain a supportive and encouraging tone while ensuring mathematical rigor.`
    };
  }
  
  // Return original system message if not a math problem
  return systemMessage;
}
