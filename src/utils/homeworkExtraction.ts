
import { Exercise } from '@/types/chat';
import { mathPatterns } from './homework/mathPatterns';
import { questionPatterns, answerPatterns, extractByPattern } from './homework/patterns';
export { detectHomeworkInMessage } from './homework/detector';

export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  // Try math patterns first
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
  
  // Try to extract question and answer using patterns
  let question = extractByPattern(message, questionPatterns) || "";
  let answer = extractByPattern(message, answerPatterns) || "";
  
  // Check for mathematical expression patterns (e.g., "2+2=4")
  if (!question || !answer) {
    const mathPattern = /(.+?)\s*=\s*(.+)/;
    const mathMatch = message.match(mathPattern);
    
    if (mathMatch) {
      question = mathMatch[1].trim();
      answer = mathMatch[2].trim();
      return { question, answer };
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
    
    // If still no match, try paragraph splits or split in half
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

