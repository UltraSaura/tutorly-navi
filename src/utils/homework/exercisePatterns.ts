
// Pattern matching utilities for homework extraction

/**
 * Regular expressions for identifying question-answer patterns
 */
export const questionPatterns = [
  /problem:(.+?)answer:/i,
  /question:(.+?)answer:/i,
  /homework:(.+?)answer:/i,
  /(.+?)my answer is:/i,
  /(.+?)my solution is:/i,
  // French patterns
  /problème:(.+?)réponse:/i,
  /question:(.+?)réponse:/i,
  /exercice:(.+?)réponse:/i,
  /(.+?)ma réponse est:/i,
  /(.+?)ma solution est:/i,
  // French mathematical patterns  
  /(.+?)(font|égal|égale|est)\s*(.+)$/i
];

/**
 * Regular expressions for identifying answer patterns
 */
export const answerPatterns = [
  /answer:(.+?)$/i,
  /my answer is:(.+?)$/i,
  /my solution is:(.+?)$/i,
  /solution:(.+?)$/i,
  // French patterns
  /réponse:(.+?)$/i,
  /ma réponse est:(.+?)$/i,
  /ma solution est:(.+?)$/i,
  /solution:(.+?)$/i,
  // French mathematical patterns
  /(font|égal|égale|est)\s*(.+?)$/i
];

/**
 * Extract question and answer using pattern matching
 */
export const extractWithPatterns = (message: string): { question: string; answer: string } => {
  let question = "";
  let answer = "";
  
  // Try to extract the question
  for (const pattern of questionPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      question = match[1].trim();
      // For French mathematical patterns, also capture the answer part
      if (match[3]) {
        answer = match[3].trim();
      }
      break;
    }
  }
  
  // Try to extract the answer if not already found
  if (!answer) {
    for (const pattern of answerPatterns) {
      const match = message.match(pattern);
      if (match && (match[1] || match[2])) {
        answer = (match[1] || match[2]).trim();
        break;
      }
    }
  }
  
  return { question, answer };
};

