
/**
 * Math-specific pattern matching and extraction utilities
 */

// Math expression patterns - ORDERED BY PRIORITY (most specific first)
const mathPatterns = [
  // Mathematical functions with equations (HIGHEST PRIORITY)
  // Handle sqrt(3)+3=55, sqrt(3)*2=6, etc.
  /(sqrt\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  
  // Simple mathematical functions with equations
  /(sqrt\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\))\s*=\s*(\d+(?:\.\d+)?)/,
  
  // Fallback patterns for functions without parentheses
  /(sqrt\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(sin\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(cos\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(tan\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(log\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  /(ln\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  
  // Mathematical functions without equations (standalone)
  /(sqrt\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(sin\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(cos\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(tan\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(log\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(ln\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(exp\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  /(abs\(\d+(?:\.\d+)?\)[\+\-\*\/•\^]\d+(?:\.\d+)?)/,
  
  // Simple mathematical functions without equations
  /(sqrt\(\d+(?:\.\d+)?\))/,
  /(sin\(\d+(?:\.\d+)?\))/,
  /(cos\(\d+(?:\.\d+)?\))/,
  /(tan\(\d+(?:\.\d+)?\))/,
  /(log\(\d+(?:\.\d+)?\))/,
  /(ln\(\d+(?:\.\d+)?\))/,
  /(exp\(\d+(?:\.\d+)?\))/,
  /(abs\(\d+(?:\.\d+)?\))/,
  
  // Fraction to fraction equations (prioritize complete fractions)
  /(\d+\/\d+)\s*=\s*(\d+\/\d+)/,
  // Fractions with decimal results
  /(\d+\/\d+)\s*=\s*(\d+(?:\.\d+)?)/,
  // Exponentiation equations
  /(\d+(?:\.\d+)?\s*\^\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Multiple operations arithmetic (prioritize longer expressions) - includes bullet multiplication
  /(\d+(?:\.\d+)?(?:\s*[\+\-\*\/•\^]\s*\d+(?:\.\d+)?)+)\s*=\s*(\d+(?:\.\d+)?)/,
  // Basic arithmetic with decimal support - includes bullet multiplication
  /(\d+(?:\.\d+)?\s*[\+\-\*\/•]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Decimal arithmetic - includes bullet multiplication
  /(\d+\.\d+\s*[\+\-\*\/•]\s*\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  // Algebraic equations with decimal support - includes bullet multiplication and exponents
  /([0-9x\+\-\*\/•\(\)\.\^]+)\s*=\s*([0-9x\+\-\*\/•\(\)\.\^]+)/,
  
  // Standalone mathematical expressions (no equals sign) - NEW PATTERNS
  /([a-zA-Z]+\^\d+)/,                             // Variable exponents (x^2, y^3)
  /(\d+[²³⁴⁵⁶⁷⁸⁹⁰¹])/,                         // Unicode superscripts (2², 3³)
  /([a-zA-Z]+[²³⁴⁵⁶⁷⁸⁹⁰¹])/,                  // Variable with Unicode superscripts (x², y³)
  /(\d+\^\d+)/,                                 // Numeric exponents (2^3, 5^2)
  /(sqrt\(\d+(?:\.\d+)?\))/,                    // Square root functions
  /(√\s*\(?\s*\d+(?:\.\d+)?\)?)/,              // Unicode square roots
  
  // Word problems with decimal numbers
  /(If|What|How|Calculate|Solve|Find).*?(\d+(?:\.\d+)?).*?[?].*?(answer|solution|result):?\s*([0-9\.\/\^]+)/i,
];

/**
 * Extract math problem and solution from text
 */
export const extractMathProblem = (message: string): { question: string; answer: string } | null => {
  console.log('[mathExtractor] Processing message:', message);
  
  // Convert Unicode superscripts and LaTeX to plain text for pattern matching
  const processedMessage = message
    .replace(/√([0-9]+(?:\.[0-9]+)?)/g, 'sqrt($1)')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    .replace(/⁰/g, '^0')
    .replace(/¹/g, '^1');
  console.log('[mathExtractor] Processed message:', processedMessage);
  
  // Try each math pattern
  for (let i = 0; i < mathPatterns.length; i++) {
    const pattern = mathPatterns[i];
    const match = processedMessage.match(pattern);
    if (match) {
      console.log(`[mathExtractor] Pattern ${i} matched:`, { 
        pattern: pattern.toString(), 
        match: match,
        question: match[1]?.trim() || '',
        answer: match[2]?.trim() || ''
      });
      
      // For word problems
      if (match[1]?.match(/If|What|How|Calculate|Solve|Find/i)) {
        const splitResult = match[0]?.split(/answer|solution|result/i);
        return {
          question: splitResult?.[0]?.trim() || '',
          answer: match[4]?.trim() || ''
        };
      }
      // For standalone expressions (no equals sign)
      if (!match[2]) {
        return {
          question: match[1]?.trim() || '',
          answer: '' // No answer provided for standalone expressions
        };
      }
      // For equations and arithmetic
      return {
        question: match[1]?.trim() || '',
        answer: match[2]?.trim() || ''
      };
    }
  }
  
  // Check for simple equation pattern as fallback
  const simpleMatch = processedMessage.match(/(.+?)\s*=\s*(.+)/);
  if (simpleMatch) {
    return {
      question: simpleMatch[1]?.trim() || '',
      answer: simpleMatch[2]?.trim() || ''
    };
  }
  
  // Final fallback: treat entire message as standalone math expression if it contains math patterns
  const standalonePatterns = [
    /[a-zA-Z]+\^\d+/,        // Variable exponents
    /\d+\^\d+/,              // Numeric exponents  
    /\d+[²³⁴⁵⁶⁷⁸⁹⁰¹]/,     // Unicode superscripts
    /[a-zA-Z]+[²³⁴⁵⁶⁷⁸⁹⁰¹]/, // Variable with Unicode superscripts
    /sqrt\(/,                // Square root functions
    /√/                      // Unicode square root
  ];
  
  const hasStandaloneMath = standalonePatterns.some(pattern => pattern.test(message));
  if (hasStandaloneMath) {
    return {
      question: message.trim(),
      answer: ''
    };
  }
  
  console.log('[mathExtractor] No patterns matched');
  return null;
};

