
import { mathKeywords, homeworkKeywords } from '../patterns/homeworkPatterns';

export const detectHomeworkInMessage = (content: string): boolean => {
  const contentLower = content.toLowerCase();

  // Check for equals sign - most basic indicator of homework
  if (content.includes('=')) {
    return true;
  }

  // Check for mathematical expressions
  const hasMathExpression = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+/,           // Algebraic expressions
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
  ].some(pattern => pattern.test(content));

  // Check for math keywords
  const hasMathKeywords = mathKeywords.some(keyword => contentLower.includes(keyword));

  // Check if any homework keywords are in the content
  const hasKeywords = homeworkKeywords.some(keyword => contentLower.includes(keyword));

  return hasMathExpression || hasMathKeywords || hasKeywords;
};
