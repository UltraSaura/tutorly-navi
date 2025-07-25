
import { extractWithPatterns } from './exercisePatterns';
import { extractMathProblem } from './mathExtractor';
import { detectHomeworkInMessage } from './detectionUtils';

/**
 * Extracts question and answer components from a homework submission message
 * Enhanced to detect missing responses properly
 */
export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  // First check if this is just a question without an answer (common from document uploads)
  if (isQuestionWithoutAnswer(message)) {
    return {
      question: message.trim(),
      answer: ""
    };
  }
  
  // First try math-specific extraction
  const mathResult = extractMathProblem(message);
  if (mathResult) {
    // Validate that the math result actually has a meaningful answer
    if (!mathResult.answer || mathResult.answer.trim() === "" || mathResult.answer === mathResult.question) {
      return {
        question: mathResult.question,
        answer: ""
      };
    }
    return mathResult;
  }
  
  // Try pattern-based extraction
  const { question, answer } = extractWithPatterns(message);
  
  // If pattern matching failed, make a best effort split
  if (!question || !answer) {
    // Look for keywords
    const lowerMessage = message.toLowerCase();
    const keywords = ['answer:', 'solution:', 'my answer is:', 'my solution is:'];
    
    for (const keyword of keywords) {
      const index = lowerMessage.indexOf(keyword);
      if (index > 0) {
        const extractedAnswer = message.substring(index + keyword.length).trim();
        return {
          question: message.substring(0, index).trim(),
          answer: extractedAnswer || ""
        };
      }
    }
    
    // If still no match, split the message
    const parts = message.split('\n\n');
    if (parts.length >= 2) {
      return {
        question: parts[0].trim(),
        answer: parts.slice(1).join('\n\n').trim()
      };
    }
    
    // Check if this looks like a question without answer - return empty answer
    if (looksLikeQuestionOnly(message)) {
      return {
        question: message.trim(),
        answer: ""
      };
    }
    
    // Last resort: split in half
    const midpoint = Math.floor(message.length / 2);
    return {
      question: message.substring(0, midpoint).trim(),
      answer: message.substring(midpoint).trim()
    };
  }
  
  return { question, answer };
};

/**
 * Checks if message is a question without an answer
 */
function isQuestionWithoutAnswer(message: string): boolean {
  const trimmed = message.trim();
  
  // Check for common question patterns without answers
  const questionPatterns = [
    /^[a-e]\.\s*Simplifiez\s+la\s+fraction\s+\d+\/\d+\s*$/i,
    /^Simplifiez\s+la\s+fraction\s+\d+\/\d+\s*$/i,
    /^[a-e]\.\s*Calculez\s+.+$/i,
    /^[a-e]\.\s*Résolvez\s+.+$/i,
    /^Que\s+vaut\s+.+\?\s*$/i,
    /^Combien\s+font\s+.+\?\s*$/i
  ];
  
  return questionPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Checks if message looks like a question only (no answer provided)
 */
function looksLikeQuestionOnly(message: string): boolean {
  const trimmed = message.trim();
  
  // If message ends with a question mark and has no equal sign, likely a question
  if (trimmed.endsWith('?') && !trimmed.includes('=')) {
    return true;
  }
  
  // If message contains question words but no answer indicators
  const questionWords = ['simplifiez', 'calculez', 'résolvez', 'trouvez', 'déterminez'];
  const answerIndicators = ['=', 'réponse', 'solution', 'résultat'];
  
  const hasQuestionWord = questionWords.some(word => 
    trimmed.toLowerCase().includes(word)
  );
  const hasAnswerIndicator = answerIndicators.some(indicator => 
    trimmed.toLowerCase().includes(indicator)
  );
  
  return hasQuestionWord && !hasAnswerIndicator;
}

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
