
/**
 * Math-specific pattern matching and extraction utilities
 */

// Math expression patterns
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

/**
 * Extract math problem and solution from text
 */
export const extractMathProblem = (message: string): { question: string; answer: string } | null => {
  // Try each math pattern
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
  
  // Check for simple equation pattern
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

