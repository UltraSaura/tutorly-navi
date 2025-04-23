
// Pattern matching utilities for homework extraction

/**
 * Regular expressions for identifying question-answer patterns
 */
export const questionPatterns = [
  /problem:(.+?)answer:/i,
  /question:(.+?)answer:/i,
  /homework:(.+?)answer:/i,
  /(.+?)my answer is:/i,
  /(.+?)my solution is:/i
];

/**
 * Regular expressions for identifying answer patterns
 */
export const answerPatterns = [
  /answer:(.+?)$/i,
  /my answer is:(.+?)$/i,
  /my solution is:(.+?)$/i,
  /solution:(.+?)$/i
];

/**
 * Extract question and answer using pattern matching
 */
export const extractWithPatterns = (message: string): { question: string; answer: string } => {
  let question = "";
  let answer = "";
  
  // Try to extract the question
  for (const pattern of questionPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      question = match[1].trim();
      break;
    }
  }
  
  // Try to extract the answer
  for (const pattern of answerPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      answer = match[1].trim();
      break;
    }
  }
  
  return { question, answer };
};

