
import { Exercise } from '@/types/chat';

export const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
  // Math patterns to detect various formats
  const mathPatterns = [
    // Basic arithmetic
    /(\d+\s*[\+\-\*\/]\s*\d+)\s*=\s*(\d+)/,
    // Algebraic equations
    /([0-9x\+\-\*\/\(\)]+)\s*=\s*([0-9x\+\-\*\/\(\)]+)/,
    // Fractions
    /(\d+\/\d+)\s*=\s*(\d+\/\d+|\d+\.\d+)/,
    // Word problems with numbers
    /(If|What|How|Calculate|Solve|Find).*?(\d+).*?[?].*?(answer|solution|result):?\s*([0-9\.]+)/i,
  ];

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
  
  // Check for mathematical expression patterns (e.g., "2+2=4")
  const mathPattern = /(.+?)\s*=\s*(.+)/;
  const mathMatch = message.match(mathPattern);
  
  if (mathMatch) {
    question = mathMatch[1].trim();
    answer = mathMatch[2].trim();
    return { question, answer };
  }
  
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

export const detectHomeworkInMessage = (content: string): boolean => {
  // Math-specific keywords
  const mathKeywords = [
    'solve', 'calculate', 'compute', 'evaluate',
    'simplify', 'find x', 'equation', 'expression',
    'algebra', 'arithmetic', 'sum of', 'product of',
    'fraction', 'decimal', 'percentage'
  ];

  const contentLower = content.toLowerCase();

  // Check for mathematical expressions
  const hasMathExpression = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+\s*=/,       // Algebraic equations
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
  ].some(pattern => pattern.test(content));

  // Keywords that might indicate a homework submission
  const homeworkKeywords = [
    'my answer is', 'my solution is', 'here\'s my answer', 'homework answer',
    'assignment answer', 'my homework', 'i solved', 'solve:', 'answer:',
    'problem:', 'question:'
  ];
  
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

