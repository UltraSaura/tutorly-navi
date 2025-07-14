
/**
 * Math-specific pattern matching and extraction utilities
 */

// Math expression patterns
const mathPatterns = [
  // Fraction to fraction equations (prioritize complete fractions)
  /(\d+\/\d+)\s*=\s*(\d+\/\d+)/,
  // Fractions with decimal results
  /(\d+\/\d+)\s*=\s*(\d+(?:\.\d+)?)/,
  // Basic arithmetic with decimal support
  /(\d+(?:\.\d+)?\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Decimal arithmetic
  /(\d+\.\d+\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Algebraic equations with decimal support
  /([0-9x\+\-\*\/\(\)\.]+)\s*=\s*([0-9x\+\-\*\/\(\)\.]+)/,
  // Word problems with decimal numbers
  /(If|What|How|Calculate|Solve|Find).*?(\d+(?:\.\d+)?).*?[?].*?(answer|solution|result):?\s*([0-9\.\/]+)/i,
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

