// Math problem patterns - Simplified to catch more cases
export const mathPatterns = [
  // Basic equation - matches any expression with equals sign
  /(.+?)\s*=\s*(.+)/,
  // Word problems with numbers - keep as fallback
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

// Simplified math keywords
export const mathKeywords = [
  'solve', 'calculate', 'compute', 'evaluate',
  '=', '+', '-', '*', '/', 'x',
  'equation', 'sum', 'difference', 'product',
  'divide', 'multiply', 'add', 'subtract'
];
