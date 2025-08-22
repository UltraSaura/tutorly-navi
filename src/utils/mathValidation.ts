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
    // Special handling for fraction simplification exercises
    if (question.includes('Simplifiez la fraction')) {
      return areFractionsEquivalent(question, userAnswer);
    }
    
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

// NEW: Special function for fraction simplification exercises
function areFractionsEquivalent(question: string, userAnswer: string): boolean | null {
  try {
    // Extract the original fraction from the question
    const fractionMatch = question.match(/(\d+)\/(\d+)/);
    if (!fractionMatch) return null;
    
    const originalFraction = fractionMatch[0];
    const [originalNum, originalDen] = originalFraction.split('/').map(Number);
    
    // Parse user's answer
    const userFractionMatch = userAnswer.match(/(\d+)\/(\d+)/);
    if (!userFractionMatch) return null;
    
    const userFraction = userFractionMatch[0];
    const [userNum, userDen] = userFraction.split('/').map(Number);
    
    // Check if user provided the original fraction (which is incorrect for simplification)
    if (userNum === originalNum && userDen === originalDen) {
      console.log('[mathValidation] User provided original fraction - this is incorrect for simplification');
      return false;
    }
    
    // Check if the fractions are mathematically equivalent
    const originalValue = originalNum / originalDen;
    const userValue = userNum / userDen;
    
    if (Math.abs(originalValue - userValue) < Number.EPSILON) {
      // Check if user's answer is actually simplified
      const userGCD = findGCD(userNum, userDen);
      const isSimplified = userGCD === 1;
      
      if (!isSimplified) {
        console.log('[mathValidation] Fractions are equivalent but user answer is not simplified');
        return false;
      }
      
      console.log('[mathValidation] Fractions are equivalent and simplified correctly');
      return true;
    }
    
    console.log('[mathValidation] Fractions are not equivalent');
    return false;
  } catch (error) {
    console.log('[mathValidation] Error checking fraction equivalency:', error);
    return null;
  }
}

// NEW: Helper function to find Greatest Common Divisor
function findGCD(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  
  return a;
}

// NEW: Validate fraction format
function isValidFraction(fraction: string): boolean {
  const fractionPattern = /^\d+\/\d+$/;
  if (!fractionPattern.test(fraction)) {
    return false;
  }
  
  const [numerator, denominator] = fraction.split('/').map(Number);
  return numerator > 0 && denominator > 1 && numerator < 1000 && denominator < 1000;
}