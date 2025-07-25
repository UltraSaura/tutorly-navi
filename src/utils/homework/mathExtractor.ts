
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
 * Enhanced to detect missing responses after equals signs
 */
export const extractMathProblem = (message: string): { question: string; answer: string } | null => {
  // Try each math pattern
  for (const pattern of mathPatterns) {
    const match = message.match(pattern);
    if (match) {
      // For word problems
      if (match[1]?.match(/If|What|How|Calculate|Solve|Find/i)) {
        const answer = match[4]?.trim() || "";
        return {
          question: match[0].split(/answer|solution|result/i)[0].trim(),
          answer: isValidAnswer(answer) ? answer : ""
        };
      }
      // For equations and arithmetic
      const answer = match[2]?.trim() || "";
      return {
        question: match[1].trim(),
        answer: isValidAnswer(answer) ? answer : ""
      };
    }
  }
  
  // Check for simple equation pattern with enhanced validation
  const mathPattern = /(.+?)\s*=\s*(.*)$/;
  const mathMatch = message.match(mathPattern);
  if (mathMatch) {
    const question = mathMatch[1].trim();
    const answer = mathMatch[2]?.trim() || "";
    
    // Check if there's actually content after the equals sign
    if (!isValidAnswer(answer)) {
      return {
        question: question,
        answer: ""
      };
    }
    
    return {
      question: question,
      answer: answer
    };
  }
  
  return null;
};

/**
 * Validates if the extracted answer is meaningful
 */
function isValidAnswer(answer: string): boolean {
  if (!answer || answer.trim() === "") {
    return false;
  }
  
  // Remove common noise/artifacts
  const cleaned = answer.replace(/[^\w\d\/\.\-\+\*\(\)]/g, '').trim();
  
  // Answer must have some meaningful content
  if (cleaned.length === 0) {
    return false;
  }
  
  // If it's just whitespace, punctuation, or very short noise, consider invalid
  if (cleaned.length < 2 && !/\d/.test(cleaned)) {
    return false;
  }
  
  // Check for common OCR artifacts that aren't real answers
  const invalidPatterns = [
    /^[^\w\d]+$/, // Only symbols/punctuation
    /^[a-z]$/, // Single letter (likely OCR noise)
    /^\.$/, // Just a period
    /^_+$/, // Just underscores
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(cleaned));
}

