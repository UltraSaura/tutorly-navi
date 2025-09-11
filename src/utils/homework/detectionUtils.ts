
/**
 * Utility functions for detecting homework submissions in messages
 */

// Math-specific keywords for detection
const mathKeywords = [
  'solve', 'calculate', 'compute', 'evaluate',
  'simplify', 'find x', 'equation', 'expression',
  'algebra', 'arithmetic', 'sum of', 'product of',
  'fraction', 'decimal', 'percentage'
];

// Keywords that might indicate a homework submission
const homeworkKeywords = [
  'my answer is', 'my solution is', 'here\'s my answer', 
  'homework answer', 'assignment answer', 'my homework', 
  'i solved', 'solve:', 'answer:', 'problem:', 'question:'
];

/**
 * Detects if a message likely contains a homework submission
 */
export const detectHomeworkInMessage = (content: string): boolean => {
  const contentLower = content.toLowerCase();

  // Check for mathematical expressions - includes bullet multiplication and exponents
  const hasMathExpression = [
    /\d+\s*[\+\-\*\/•]\s*\d+/,                    // Basic arithmetic (including bullet)
    /[0-9x]+\s*[\+\-\*\/•]\s*[0-9x]+\s*=/,       // Algebraic equations (including bullet)
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /\d+\s*\^\s*\d+/,                            // Exponents (like 5^2)
    /sqrt|cos|sin|tan|log|ln|exp/,                  // Mathematical functions (plain)
    /\\(sqrt|cos|sin|tan|log|ln|exp)/,             // LaTeX functions (with backslash)
    /√\s*\(?\s*[0-9a-zA-Z]+/                      // Unicode square root (√9, √x, √(9))
  ].some(pattern => pattern.test(content));

  // Check for math word problems
  const hasMathWordProblem = /\b(If|What|How)\b.*?\d+.*?\b(find|calculate|solve)\b/i.test(content);

  // Check if any keywords are in the content
  const hasKeywords = homeworkKeywords.some(keyword => contentLower.includes(keyword));

  // Check for mathematical patterns - includes bullet multiplication and exponents
  const hasMathPattern = /\d+\s*[\+\-\*\/•\^]\s*\d+\s*=/.test(content);

  // Enhanced detection for likely homework content
  const likelyHomework = /\b(solve|calculate|find|compute)\b.+\b(equation|problem|expression)\b/i.test(content);

  return hasMathExpression || 
         mathKeywords.some(keyword => contentLower.includes(keyword)) || 
         hasMathWordProblem || 
         hasKeywords || 
         hasMathPattern || 
         likelyHomework;
};

