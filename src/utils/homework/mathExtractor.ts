
/**
 * Math-specific pattern matching and extraction utilities
 */

// Math expression patterns
const mathPatterns = [
  // Mathematical functions with equations (prioritize these)
  /(sqrt\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  
  // Mathematical functions without equations (standalone)
  /(sqrt\(\d+(?:\.\d+)?\))/,
  /(sin\(\d+(?:\.\d+)?\))/,
  /(cos\(\d+(?:\.\d+)?\))/,
  /(tan\(\d+(?:\.\d+)?\))/,
  /(log\(\d+(?:\.\d+)?\))/,
  /(ln\(\d+(?:\.\d+)?\))/,
  /(exp\(\d+(?:\.\d+)?\))/,
  /(abs\(\d+(?:\.\d+)?\))/,
  
  // Mixed expressions with functions (NEW - handle sqrt(9)+6, etc.)
  /(sqrt\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  
  // Mixed expressions without equations (standalone)
  /(sqrt\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  
  // Fraction to fraction equations (prioritize complete fractions)
  /(\d+\/\d+)\s*=\s*(\d+\/\d+)/,
  // Fractions with decimal results
  /(\d+\/\d+)\s*=\s*(\d+(?:\.\d+)?)/,
  // Exponentiation equations - this is the key addition
  /(\d+(?:\.\d+)?\s*\^\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Multiple operations arithmetic (prioritize longer expressions) - includes bullet multiplication
  /(\d+(?:\.\d+)?(?:\s*[\+\-\*\/•\^]\s*\d+(?:\.\d+)?)+)\s*=\s*(\d+(?:\.\d+)?)/,
  // Basic arithmetic with decimal support - includes bullet multiplication
  /(\d+(?:\.\d+)?\s*[\+\-\*\/•]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Decimal arithmetic - includes bullet multiplication
  /(\d+\.\d+\s*[\+\-\*\/•]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Algebraic equations with decimal support - includes bullet multiplication and exponents
  /([0-9x\+\-\*\/•\(\)\.\^]+)\s*=\s*([0-9x\+\-\*\/•\(\)\.\^]+)/,
  // Word problems with decimal numbers
  /(If|What|How|Calculate|Solve|Find).*?(\d+(?:\.\d+)?).*?[?].*?(answer|solution|result):?\s*([0-9\.\/\^]+)/i,
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

