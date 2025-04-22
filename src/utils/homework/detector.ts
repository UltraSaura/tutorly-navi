
import { mathKeywords, isMathExpression } from './mathPatterns';
import { homeworkKeywords } from './patterns';

export const detectHomeworkInMessage = (content: string): boolean => {
  const contentLower = content.toLowerCase();

  // Check for mathematical expressions
  const hasMathExpression = isMathExpression(content);

  // Check if any keywords are in the content
  const hasKeywords = homeworkKeywords.some(keyword => contentLower.includes(keyword));
  
  // Check for mathematical patterns (e.g., "2+2=4")
  const hasMathPattern = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(content);
  
  // Enhanced detection for likely homework content
  const likelyHomework = /\b(solve|calculate|find|compute)\b.+\b(equation|problem|expression)\b/i.test(content);

  // Enhanced math word problem detection
  const hasMathWordProblem = /\b(If|What|How)\b.*?\d+.*?\b(find|calculate|solve)\b/i.test(content);

  return hasMathExpression || 
         mathKeywords.some(keyword => contentLower.includes(keyword)) || 
         hasMathWordProblem || 
         hasKeywords || 
         hasMathPattern || 
         likelyHomework;
};

