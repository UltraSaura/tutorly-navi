
import { mathPatterns, questionPatterns, answerPatterns } from '../patterns/homeworkPatterns';

export const matchMathProblem = (message: string): { question: string, answer: string } | null => {
  for (const pattern of mathPatterns) {
    const match = message.match(pattern);
    if (match) {
      // For word problems
      if (match[1]?.match(/If|What|How|Calculate|Solve|Find/i)) {
        return {
          question: match[0].split(/answer|solution|result/i)[0].trim(),
          answer: match[4].trim()
        };
      }
      // For equations and arithmetic
      return {
        question: match[1].trim(),
        answer: match[2].trim()
      };
    }
  }
  return null;
};

export const matchQuestionAnswer = (message: string): { question: string, answer: string } | null => {
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
  
  if (question && answer) {
    return { question, answer };
  }
  
  return null;
};

export const extractSimpleEquation = (message: string): { question: string, answer: string } | null => {
  const mathPattern = /(.+?)\s*=\s*(.+)/;
  const mathMatch = message.match(mathPattern);
  
  if (mathMatch) {
    return {
      question: mathMatch[1].trim(),
      answer: mathMatch[2].trim()
    };
  }
  
  return null;
};

