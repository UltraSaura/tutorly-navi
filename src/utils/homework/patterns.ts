
// Question patterns for homework detection
export const questionPatterns = [
  /problem:(.+?)answer:/i,
  /question:(.+?)answer:/i,
  /homework:(.+?)answer:/i,
  /(.+?)my answer is:/i,
  /(.+?)my solution is:/i
];

// Answer patterns for homework detection
export const answerPatterns = [
  /answer:(.+?)$/i,
  /my answer is:(.+?)$/i,
  /my solution is:(.+?)$/i,
  /solution:(.+?)$/i
];

export const homeworkKeywords = [
  'my answer is', 'my solution is', 'here\'s my answer', 'homework answer',
  'assignment answer', 'my homework', 'i solved', 'solve:', 'answer:',
  'problem:', 'question:'
];

export const extractByPattern = (
  content: string,
  patterns: RegExp[]
): string | null => {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

