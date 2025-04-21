
// Math problem patterns
export const mathPatterns = [
  // Basic arithmetic (with optional spaces)
  /(\d+)\s*[\+\-\*\/]\s*(\d+)\s*=\s*(\d+)/,
  // Algebraic equations (with optional spaces)
  /([0-9x]+)\s*[\+\-\*\/]\s*([0-9x]+)\s*=\s*([0-9x]+)/,
  // Fractions
  /(\d+\/\d+)\s*=\s*(\d+\/\d+|\d+\.\d+)/,
  // Word problems with numbers
  /(If|What|How|Calculate|Solve|Find).*?(\d+).*?[?].*?(answer|solution|result):?\s*([0-9\.]+)/i,
];

// Question and answer patterns
export const questionPatterns = [
  /problem:(.+?)answer:/i,
  /question:(.+?)answer:/i,
  /homework:(.+?)answer:/i,
  /(.+?)my answer is:/i,
  /(.+?)my solution is:/i
];

export const answerPatterns = [
  /answer:(.+?)$/i,
  /my answer is:(.+?)$/i,
  /my solution is:(.+?)$/i,
  /solution:(.+?)$/i
];

// Keywords for homework detection
export const homeworkKeywords = [
  'my answer is', 'my solution is', 'here\'s my answer', 'homework answer',
  'assignment answer', 'my homework', 'i solved', 'solve:', 'answer:',
  'problem:', 'question:'
];

export const mathKeywords = [
  'solve', 'calculate', 'compute', 'evaluate',
  'simplify', 'find x', 'equation', 'expression',
  'algebra', 'arithmetic', 'sum of', 'product of',
  'fraction', 'decimal', 'percentage'
];

