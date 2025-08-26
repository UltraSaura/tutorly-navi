
import { extractWithPatterns } from './exercisePatterns';
import { extractMathProblem } from './mathExtractor';
import { detectHomeworkInMessage } from './detectionUtils';

/**
 * Extracts question and answer components from a homework submission message
 */
export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  // First try math-specific extraction
  const mathResult = extractMathProblem(message);
  if (mathResult) {
    return mathResult;
  }
  
  // Try pattern-based extraction
  const { question, answer } = extractWithPatterns(message);
  
  // If pattern matching failed, make a best effort split
  if (!question || !answer) {
    // Special handling: commands like "simplify 30/63" (EN/FR) without an answer
    const simplifyRegex = /^(simplif(?:y|iez|ie)?|reduce|réduis(?:ez)?)(?:\s+(?:the|la|les))?\s*(?:fraction|fractions)?\s*(\d+)\s*\/\s*(\d+)$/i;
    const simplifyMatch = message.trim().match(simplifyRegex);
    if (simplifyMatch) {
      const num = simplifyMatch[2];
      const den = simplifyMatch[3];
      return {
        question: `Simplify the fraction ${num}/${den}`,
        // No answer provided - this should be an unanswered exercise
        answer: ""
      };
    }

    // Look for keywords
    const lowerMessage = message.toLowerCase();
    const keywords = ['answer:', 'solution:', 'my answer is:', 'my solution is:'];
    
    for (const keyword of keywords) {
      const index = lowerMessage.indexOf(keyword);
      if (index > 0) {
        return {
          question: message.substring(0, index).trim(),
          answer: message.substring(index + keyword.length).trim()
        };
      }
    }
    
    // If still no match, split the message more intelligently around a fraction
    const fractionOnly = message.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionOnly) {
      const frac = `${fractionOnly[1]}/${fractionOnly[2]}`;
      return {
        question: `Simplify the fraction ${frac}`,
        answer: frac
      };
    }

    // Last resort: split in half (legacy fallback)
    const midpoint = Math.floor(message.length / 2);
    return {
      question: message.substring(0, midpoint).trim(),
      answer: message.substring(midpoint).trim()
    };
  }
  
  return { question, answer };
};

/**
 * Extracts question and explanation components from an AI message
 */
export const extractExerciseFromMessage = (content: string): { question: string, explanation: string } => {
  // Look for Problem/Guidance format
  const problemMatch = content.match(/\*\*Problem:\*\*\s*(.*?)(?=\*\*Guidance:\*\*|$)/s);
  const guidanceMatch = content.match(/\*\*Guidance:\*\*\s*(.*?)$/s);
  
  if (problemMatch && guidanceMatch) {
    return {
      question: problemMatch[1].trim(),
      explanation: `**Problem:**${problemMatch[1]}\n\n**Guidance:**${guidanceMatch[1]}`
    };
  }
  
  // Simple extraction for other formats
  const paragraphs = content.split('\n\n');
  
  if (paragraphs.length === 0) {
    return { question: content, explanation: '' };
  }
  
  return {
    question: paragraphs[0].trim(),
    explanation: paragraphs.slice(1).join('\n\n').trim()
  };
};

export { detectHomeworkInMessage };
export { extractWithPatterns };
export { extractMathProblem };
export { hasMultipleExercises, parseMultipleExercises } from './multiExerciseParser';
