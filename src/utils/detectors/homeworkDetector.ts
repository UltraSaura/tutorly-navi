
import { mathPatterns, mathKeywords, homeworkKeywords } from '../patterns/homeworkPatterns';

export const detectHomeworkInMessage = (content: string): boolean => {
  const contentLower = content.toLowerCase();

  // Check for any mathematical expressions (with or without spaces)
  const hasMathExpression = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/=]\s*[0-9x]+/,          // Equations with variables
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
  ].some(pattern => pattern.test(content));

  // Check for mathematical keywords
  const hasMathKeywords = mathKeywords.some(keyword => contentLower.includes(keyword));

  // Check if any homework keywords are in the content
  const hasKeywords = homeworkKeywords.some(keyword => contentLower.includes(keyword));

  // Enhanced detection for likely homework content
  const likelyHomework = /\b(solve|calculate|find|compute)\b.+\b(equation|problem|expression)\b/i.test(content);

  return hasMathExpression || hasMathKeywords || hasKeywords || likelyHomework;
};
