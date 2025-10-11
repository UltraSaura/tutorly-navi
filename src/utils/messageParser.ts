/**
 * Message parsing utility for detecting questions and answers
 * This helps determine if a user message contains an answer before sending to AI
 */

export interface ParsedMessage {
  question: string;
  answer: string;
  hasAnswer: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Enhanced message parser with multiple detection patterns
 * Returns parsed question, answer, and confidence level
 */
export const parseUserMessage = (message: string): ParsedMessage => {
  const trimmed = message.trim();
  
  // Pattern 1: Explicit "response" keyword (case insensitive)
  // Examples: "2+2 response 4", "What is 5+3? response 8"
  const responseMatch = trimmed.match(/^(.+?)\s+response\s+(.+)$/i);
  if (responseMatch) {
    return {
      question: responseMatch[1].trim(),
      answer: responseMatch[2].trim(),
      hasAnswer: true,
      confidence: 'high'
    };
  }
  
  // Pattern 2: Common answer keywords/phrases
  // Examples: "2+2 answer: 4", "5+3 solution: 8", "the answer is 8"
  const answerKeywordPatterns = [
    /^(.+?)\s+(?:answer|solution|result)[:\s]+(.+)$/i,
  ];
  
  for (const pattern of answerKeywordPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const potentialAnswer = match[2].trim();
      // Make sure the answer part doesn't contain question words
      if (!/(what|how|why|when|where|solve|calculate|find)/i.test(potentialAnswer)) {
        return {
          question: match[1].trim(),
          answer: potentialAnswer,
          hasAnswer: true,
          confidence: 'high'
        };
      }
    }
  }
  
  // Pattern 2b: "is" and "equals" - but only when preceded by an expression, not a question word
  // Examples: "2+2 is 4", "5+3 equals 8" (but NOT "What is 2+2?")
  const expressionAnswerPattern = /^([^?]+?[+\-*/\d\)]\s*)(?:is|equals)\s+(.+)$/i;
  const isEqualsMatch = trimmed.match(expressionAnswerPattern);
  if (isEqualsMatch && !/(what|how|why|when|where|who)/i.test(isEqualsMatch[1])) {
    const potentialAnswer = isEqualsMatch[2].trim();
    if (!/(what|how|why|when|where|solve|calculate|find)/i.test(potentialAnswer)) {
      return {
        question: isEqualsMatch[1].trim(),
        answer: potentialAnswer,
        hasAnswer: true,
        confidence: 'high'
      };
    }
  }
  
  // Pattern 2c: French "est" pattern - "calcul le ppcm de 30 et 12 est 30"
  // Examples: "calcul le ppcm de 30 et 12 est 30", "ppcm de 30 et 12 est 60"
  const frenchEstPattern = /^(.+?)\s+est\s+(.+)$/i;
  const frenchEstMatch = trimmed.match(frenchEstPattern);
  if (frenchEstMatch) {
    const left = frenchEstMatch[1].trim();
    const right = frenchEstMatch[2].trim();
    
    // Check if this looks like a calculation with answer
    // Avoid false positives like "c'est" or "il est"
    if (!/(c'est|il est|elle est|nous sommes|vous êtes|ils sont|elles sont)/i.test(left) &&
        !/(what|how|why|when|where|who)/i.test(left)) {
      return {
        question: left,
        answer: right,
        hasAnswer: true,
        confidence: 'high'
      };
    }
  }
  
  // Pattern 3: Equals sign for equations
  // Examples: "2+2=4", "x+5=10"
  const equalsMatch = trimmed.match(/^(.+?)=(.+)$/);
  if (equalsMatch) {
    const left = equalsMatch[1].trim();
    const right = equalsMatch[2].trim();
    
    // Check if this is a "solve" request - if so, treat as question-only
    if (/^(solve|find|calculate|determine)\s+/i.test(left)) {
      return {
        question: trimmed,
        answer: '',
        hasAnswer: false,
        confidence: 'high'
      };
    }
    
    // Check if right side looks like a final answer (number, simple expression)
    // Avoid false positives like "x=y+5" or "solve x=2+3"
    const isSimpleAnswer = /^-?\d+(\.\d+)?$/.test(right) || // Pure number: "4" or "3.14"
                          /^-?\d+\/\d+$/.test(right) ||      // Fraction: "3/4"
                          /^-?\d+\s*\d+\/\d+$/.test(right);  // Mixed number: "2 3/4"
    
    // Also check if left side contains the equals sign (nested equation)
    const hasNestedEquals = left.includes('=');
    
    if (isSimpleAnswer && !hasNestedEquals) {
      return {
        question: left,
        answer: right,
        hasAnswer: true,
        confidence: 'high'
      };
    } else if (!hasNestedEquals) {
      // Medium confidence - might be an answer, might be an equation to solve
      return {
        question: left,
        answer: right,
        hasAnswer: true,
        confidence: 'medium'
      };
    }
  }
  
  // Pattern 4: Check for question-only indicators
  // If message contains question words without an answer, it's definitely just a question
  const questionWords = /(what|how much|how many|calculate|solve|find|determine|compute|calcul|trouve|détermine)\s+(is|are|does)?/i;
  const hasQuestionWord = questionWords.test(trimmed);
  
  if (hasQuestionWord) {
    return {
      question: trimmed,
      answer: '',
      hasAnswer: false,
      confidence: 'high'
    };
  }
  
  // Default: No clear answer pattern found - treat entire message as question only
  return {
    question: trimmed,
    answer: '',
    hasAnswer: false,
    confidence: 'low' // Low confidence because we're not sure
  };
};

/**
 * Check if a message contains a valid answer
 * This can be used to quickly validate before sending to AI
 */
export const hasValidAnswer = (message: string): boolean => {
  const parsed = parseUserMessage(message);
  return parsed.hasAnswer && parsed.confidence !== 'low';
};

/**
 * Extract just the question part from a message
 */
export const extractQuestion = (message: string): string => {
  return parseUserMessage(message).question;
};

/**
 * Extract just the answer part from a message (if present)
 */
export const extractAnswer = (message: string): string => {
  return parseUserMessage(message).answer;
};
