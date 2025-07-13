/**
 * Mathematical validation utilities for checking equivalency between different answer formats
 */

/**
 * Checks if two mathematical expressions are equivalent
 */
export function areMathematicallyEquivalent(
  question: string, 
  userAnswer: string, 
  tolerance: number = 0.01
): boolean | null {
  try {
    // Extract the correct answer from the question
    const correctAnswer = extractCorrectAnswer(question);
    if (correctAnswer === null) return null;

    // Normalize and parse user answer
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const userValue = parseFloat(normalizedUserAnswer);
    
    if (isNaN(userValue)) return null;

    // Check for exact equality first
    if (Math.abs(userValue - correctAnswer) < Number.EPSILON) {
      return true;
    }

    // Check within tolerance for decimal/fraction equivalency
    return Math.abs(userValue - correctAnswer) <= tolerance;
  } catch (error) {
    console.log('[mathValidation] Error checking equivalency:', error);
    return null;
  }
}

/**
 * Extract the correct answer from a mathematical question
 */
function extractCorrectAnswer(question: string): number | null {
  // Handle division problems (fractions)
  const divisionMatch = question.match(/(\d+(?:\.\d+)?)\s*[÷\/]\s*(\d+(?:\.\d+)?)/);
  if (divisionMatch) {
    const numerator = parseFloat(divisionMatch[1]);
    const denominator = parseFloat(divisionMatch[2]);
    return numerator / denominator;
  }

  // Handle basic arithmetic
  const arithmeticMatch = question.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
  if (arithmeticMatch) {
    const [, num1, operator, num2] = arithmeticMatch;
    const a = parseFloat(num1);
    const b = parseFloat(num2);
    
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: return null;
    }
  }

  // Handle fraction notation like "2/3"
  const fractionMatch = question.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    return numerator / denominator;
  }

  return null;
}

/**
 * Normalize answer format for comparison
 */
function normalizeAnswer(answer: string): string {
  // Remove extra whitespace and convert to lowercase
  let normalized = answer.trim().toLowerCase();
  
  // Handle percentage to decimal
  if (normalized.includes('%')) {
    const percentValue = parseFloat(normalized.replace('%', ''));
    return (percentValue / 100).toString();
  }
  
  // Handle fraction to decimal
  const fractionMatch = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    return (numerator / denominator).toString();
  }
  
  return normalized;
}

/**
 * Generates helpful equivalency context for grading
 */
export function getEquivalencyContext(question: string, userAnswer: string): string | null {
  const correctAnswer = extractCorrectAnswer(question);
  if (correctAnswer === null) return null;

  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const userValue = parseFloat(normalizedUserAnswer);
  
  if (isNaN(userValue)) return null;

  // If answers are equivalent but in different formats
  if (areMathematicallyEquivalent(question, userAnswer)) {
    // Check if it's a fraction-decimal equivalency
    if (question.includes('/') && !userAnswer.includes('/')) {
      return `Note: The student provided the decimal equivalent (${userAnswer}) of the fraction, which is mathematically correct.`;
    }
    
    // Check if it's a rounded decimal
    if (Math.abs(userValue - correctAnswer) > Number.EPSILON && Math.abs(userValue - correctAnswer) <= 0.01) {
      return `Note: The student provided a rounded decimal (${userAnswer}) which is acceptably close to the exact value (${correctAnswer.toFixed(6)}).`;
    }
  }

  return null;
}