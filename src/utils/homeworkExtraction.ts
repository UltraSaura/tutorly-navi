
/**
 * Utility functions for extracting homework components from user messages
 */

/**
 * Extracts question and answer components from a homework submission message
 */
export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  // Question patterns to look for in messages
  const questionPatterns = [
    /problem:(.+?)answer:/i,
    /question:(.+?)answer:/i,
    /homework:(.+?)answer:/i,
    /(.+?)my answer is:/i,
    /(.+?)my solution is:/i
  ];
  
  // Answer patterns to look for in messages
  const answerPatterns = [
    /answer:(.+?)$/i,
    /my answer is:(.+?)$/i,
    /my solution is:(.+?)$/i,
    /solution:(.+?)$/i
  ];
  
  // Try to extract question and answer using patterns
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
  
  // If pattern matching failed, make a best effort split
  if (!question || !answer) {
    // Look for keywords
    const lowerMessage = message.toLowerCase();
    const keywords = ['answer:', 'solution:', 'my answer is:', 'my solution is:'];
    
    for (const keyword of keywords) {
      const index = lowerMessage.indexOf(keyword);
      if (index > 0) {
        question = message.substring(0, index).trim();
        answer = message.substring(index + keyword.length).trim();
        break;
      }
    }
    
    // If still no match, just split the message in half
    if (!question || !answer) {
      const parts = message.split('\n\n');
      if (parts.length >= 2) {
        question = parts[0].trim();
        answer = parts.slice(1).join('\n\n').trim();
      } else {
        // Last resort: split in half
        const midpoint = Math.floor(message.length / 2);
        question = message.substring(0, midpoint).trim();
        answer = message.substring(midpoint).trim();
      }
    }
  }
  
  return { question, answer };
};

/**
 * Detects if a message likely contains a homework submission
 */
export const detectHomeworkInMessage = (content: string): boolean => {
  // Keywords that might indicate a homework submission
  const homeworkKeywords = [
    'my answer is', 'my solution is', 'here\'s my answer', 'homework answer',
    'assignment answer', 'my homework', 'i solved', 'solve:', 'answer:'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check if any keywords are in the content
  return homeworkKeywords.some(keyword => contentLower.includes(keyword));
};

/**
 * Extracts question and explanation components from an AI message
 */
export const extractExerciseFromMessage = (content: string): { question: string, explanation: string } => {
  // Simple extraction - this could be made more sophisticated
  // For now, we'll take the first paragraph as the question
  // and the rest as the explanation
  const paragraphs = content.split('\n\n');
  
  if (paragraphs.length === 0) {
    return { question: content, explanation: '' };
  }
  
  // Take the first paragraph as the question
  const question = paragraphs[0].trim();
  
  // Use the rest as the explanation
  const explanation = paragraphs.slice(1).join('\n\n').trim();
  
  return { question, explanation };
};
