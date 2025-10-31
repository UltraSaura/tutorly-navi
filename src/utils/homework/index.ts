
import { extractWithPatterns } from './exercisePatterns';
import { extractMathProblem } from './mathExtractor';
import { detectHomeworkInMessage } from './detectionUtils';
import { latexToPlainText, plainTextToLatex } from '../latexUtils';

/**
 * Extracts question and answer components from a homework submission message
 */
export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  console.log('[homework extraction] Original message:', message);
  
  // Check if this is LaTeX format (contains \sqrt, \sin, etc.)
  const isLatexFormat = /\\[a-zA-Z]/.test(message);
  
  if (isLatexFormat) {
    // For LaTeX format, store the original LaTeX for display
    // but convert to plain text for processing
    const processedMessage = latexToPlainText(message);
    console.log('[homework extraction] LaTeX detected, processed message:', processedMessage);
    
    // Extract using the processed message
    const mathResult = extractMathProblem(processedMessage);
    if (mathResult) {
      console.log('[homework extraction] Math extraction successful:', mathResult);
      // Return the original LaTeX format for display
      return {
        question: message, // Keep original LaTeX for display
        answer: mathResult.answer
      };
    }
  }
  
  // For non-LaTeX messages, process normally
  const processedMessage = latexToPlainText(message);
  console.log('[homework extraction] Processed message:', processedMessage);
  
  // First try simplification exercises (priority handling) - supports optional answer
  const simplifyRegex = /^(simplif(?:y|iez|ie)?|reduce|réduis(?:ez)?)(?:\s+(?:the|la|les))?\s*(?:fraction|fractions)?\s*(\d+)\s*\/\s*(\d+)(?:\s*=\s*([0-9]+(?:\/[0-9]+)?|\d+(?:\.\d+)?))?/i;
  const simplifyMatch = processedMessage.trim().match(simplifyRegex);
  if (simplifyMatch) {
    const num = simplifyMatch[2];
    const den = simplifyMatch[3];
    const answer = simplifyMatch[4] || ""; // Optional answer after equals sign
    console.log('[homework extraction] Matched simplification pattern:', { num, den, answer });
    return {
      question: `Simplify the fraction ${num}/${den}`,
      answer: answer
    };
  }

  // Try math-specific extraction (equations, etc.) on processed message
  const mathResult = extractMathProblem(processedMessage);
  if (mathResult) {
    console.log('[homework extraction] Math extraction successful:', mathResult);
    return mathResult;
  }
  
  // Try pattern-based extraction on processed message
  const { question, answer } = extractWithPatterns(processedMessage);
  
  // If pattern matching failed, make a best effort split
  if (!question || !answer) {

    // Look for keywords
    const lowerMessage = processedMessage.toLowerCase();
    const keywords = ['answer:', 'solution:', 'my answer is:', 'my solution is:'];
    
    for (const keyword of keywords) {
      const index = lowerMessage.indexOf(keyword);
      if (index > 0) {
        return {
          question: processedMessage.substring(0, index).trim(),
          answer: processedMessage.substring(index + keyword.length).trim()
        };
      }
    }
    
    // If still no match, split the message more intelligently around a fraction
    const fractionOnly = processedMessage.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionOnly) {
      const frac = `${fractionOnly[1]}/${fractionOnly[2]}`;
      return {
        question: `Simplify the fraction ${frac}`,
        answer: frac
      };
    }

    // For simple math expressions without clear answers, return as unanswered question
    if (/\d+\s*[\+\-\*\/•]\s*\d+/.test(processedMessage) || /^\d+$/.test(processedMessage.trim())) {
      console.log('[homework extraction] Treating as unanswered math expression:', processedMessage);
      return {
        question: processedMessage.trim(),
        answer: ""
      };
    }

    // Last resort: create meaningful question from the content
    return {
      question: processedMessage.trim(),
      answer: ""
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
