import crypto from 'crypto';

export interface CanonicalizedExercise {
  hash: string;
  normalizedContent: string;
  originalContent: string;
  subject: string;
}

/**
 * Normalizes mathematical expressions and text to create consistent hashes
 * for similar exercises across different phrasings and formatting
 */
export class ExerciseCanonicalizer {
  
  /**
   * Normalizes mathematical expressions
   */
  private static normalizeMathExpression(expression: string): string {
    return expression
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Normalize common mathematical operators
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      // Normalize fractions (basic)
      .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')
      // Normalize decimal points
      .replace(/,(\d)/g, '.$1') // Handle European decimal notation
      // Remove spaces around operators
      .replace(/\s*([+\-*/=<>])\s*/g, '$1')
      // Normalize parentheses spacing
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .toLowerCase();
  }

  /**
   * Normalizes question text to handle equivalent phrasings
   */
  private static normalizeQuestionText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Normalize common question starters
      .replace(/^(what is|calculate|find|solve|determine|compute)\s+/i, 'find ')
      // Normalize "the value of"
      .replace(/\bthe\s+value\s+of\b/gi, '')
      // Remove extra articles
      .replace(/\b(a|an|the)\b/gi, '')
      // Normalize spacing
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts mathematical expressions from text
   */
  private static extractMathExpressions(text: string): string[] {
    const mathPatterns = [
      // Basic arithmetic: 2+3, 5*4, etc.
      /\b\d+\s*[+\-*/]\s*\d+(?:\s*[+\-*/]\s*\d+)*/g,
      // Fractions: 3/4, 1/2, etc.
      /\b\d+\/\d+/g,
      // Decimals with operations: 2.5 + 3.7
      /\b\d*\.?\d+\s*[+\-*/]\s*\d*\.?\d+/g,
      // Algebraic expressions: 2x + 3
      /\b\d*[a-z]\s*[+\-*/]\s*\d+/gi,
      // Equations: x = 5, 2x + 3 = 7
      /\b\w+\s*=\s*[\w\s+\-*/]+/g,
    ];

    const expressions: string[] = [];
    for (const pattern of mathPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        expressions.push(...matches);
      }
    }

    return expressions.map(expr => this.normalizeMathExpression(expr));
  }

  /**
   * Canonicalizes an exercise to create a consistent representation
   */
  static canonicalize(
    exerciseContent: string,
    subject: string = 'math'
  ): CanonicalizedExercise {
    // Normalize the question text
    const normalizedText = this.normalizeQuestionText(exerciseContent);
    
    // Extract and normalize mathematical expressions
    const mathExpressions = this.extractMathExpressions(exerciseContent);
    
    // Create a canonical representation
    const canonicalParts = [
      normalizedText,
      ...mathExpressions.sort(), // Sort for consistency
      subject.toLowerCase()
    ];
    
    const canonicalString = canonicalParts.join('|');
    
    // Generate hash
    const hash = crypto
      .createHash('sha256')
      .update(canonicalString)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter hash

    return {
      hash,
      normalizedContent: canonicalString,
      originalContent: exerciseContent,
      subject: subject.toLowerCase()
    };
  }

  /**
   * Checks if two exercises are similar enough to share explanations
   */
  static areSimilar(
    exercise1: string,
    exercise2: string,
    subject: string = 'math'
  ): boolean {
    const canon1 = this.canonicalize(exercise1, subject);
    const canon2 = this.canonicalize(exercise2, subject);
    
    return canon1.hash === canon2.hash;
  }

  /**
   * Creates a cache key that includes language and grade level context
   */
  static createCacheKey(
    exerciseContent: string,
    subject: string,
    responseLanguage: string,
    gradeLevel: string
  ): string {
    const canonical = this.canonicalize(exerciseContent, subject);
    return `${canonical.hash}_${responseLanguage}_${gradeLevel}`;
  }
}