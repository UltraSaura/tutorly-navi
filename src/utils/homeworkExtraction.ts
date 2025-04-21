
import { matchMathProblem, matchQuestionAnswer, extractSimpleEquation } from './matchers/homeworkMatchers';
import { detectHomeworkInMessage } from './detectors/homeworkDetector';

export { detectHomeworkInMessage };

export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  console.log("Extracting homework from message:", message);
  
  // Try direct equation pattern first (e.g., "2+2=4")
  const equationMatch = message.match(/([0-9\+\-\*\/\s]+)=([0-9\s]+)/);
  if (equationMatch) {
    return {
      question: equationMatch[1].trim(),
      answer: equationMatch[2].trim()
    };
  }
  
  // Try existing patterns
  const mathResult = matchMathProblem(message);
  if (mathResult) {
    return mathResult;
  }
  
  const qaResult = matchQuestionAnswer(message);
  if (qaResult) {
    return qaResult;
  }
  
  const equationResult = extractSimpleEquation(message);
  if (equationResult) {
    return equationResult;
  }
  
  // Last resort: split the message in half
  const parts = message.split('\n\n');
  if (parts.length >= 2) {
    return {
      question: parts[0].trim(),
      answer: parts.slice(1).join('\n\n').trim()
    };
  }
  
  // Final fallback
  const midpoint = Math.floor(message.length / 2);
  return {
    question: message.substring(0, midpoint).trim(),
    answer: message.substring(midpoint).trim()
  };
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
  
  // Simple extraction - split into paragraphs
  const paragraphs = content.split('\n\n');
  
  if (paragraphs.length === 0) {
    return { question: content, explanation: '' };
  }
  
  return {
    question: paragraphs[0].trim(),
    explanation: paragraphs.slice(1).join('\n\n').trim()
  };
};

