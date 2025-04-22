
// Math-specific pattern matching and detection
export const mathPatterns = [
  // Basic arithmetic
  /(\d+\s*[\+\-\*\/]\s*\d+)\s*=\s*(\d+)/,
  // Algebraic equations
  /([0-9x\+\-\*\/\(\)]+)\s*=\s*([0-9x\+\-\*\/\(\)]+)/,
  // Fractions
  /(\d+\/\d+)\s*=\s*(\d+\/\d+|\d+\.\d+)/,
  // Word problems with numbers
  /(If|What|How|Calculate|Solve|Find).*?(\d+).*?[?].*?(answer|solution|result):?\s*([0-9\.]+)/i,
];

export const mathExpressionPatterns = [
  /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
  /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+\s*=/,       // Algebraic equations
  /\d+\/\d+/,                                  // Fractions
  /\d+\s*%/,                                   // Percentages
  /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
  /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
];

export const mathKeywords = [
  'solve', 'calculate', 'compute', 'evaluate',
  'simplify', 'find x', 'equation', 'expression',
  'algebra', 'arithmetic', 'sum of', 'product of',
  'fraction', 'decimal', 'percentage'
];

export const isMathExpression = (content: string): boolean => {
  return mathExpressionPatterns.some(pattern => pattern.test(content));
};

