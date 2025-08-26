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
    console.log('[mathValidation] Checking equivalency:', { question, userAnswer });
    
    // Enhanced fraction detection - supports both French and English
    const fractionKeywords = [
      'simplifiez la fraction',
      'simplifiez les fractions', 
      'simplifie la fraction',
      'simplifie les fractions',
      'réduire la fraction',
      'réduire les fractions',
      'simplify the fraction',
      'simplify fraction',
      'reduce the fraction',
      'reduce fraction'
    ];
    
    const isFractionExercise = fractionKeywords.some(keyword => 
      question.toLowerCase().includes(keyword)
    ) || (question.match(/\d+\/\d+/) && (question.toLowerCase().includes('simplify') || question.toLowerCase().includes('reduce')));
    
    if (isFractionExercise) {
      console.log('[mathValidation] Detected French fraction exercise');
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
  try {
    const correctAnswer = extractCorrectAnswer(question);
    if (correctAnswer === null) return null;
    
    const userNum = parseFloat(normalizeAnswer(userAnswer));
    if (isNaN(userNum)) return null;
    
    // Check for common equivalencies
    if (Math.abs(userNum - correctAnswer) < 0.01) {
      // Check if it's a decimal equivalent of a fraction
      const fractionMatch = question.match(/(\d+)\/(\d+)/);
      if (fractionMatch) {
        const [num, den] = fractionMatch.slice(1).map(Number);
        if (Math.abs(userNum - (num / den)) < 0.01) {
          return `Note: ${userAnswer} is the decimal equivalent of ${num}/${den}`;
        }
      }
      
      // Check if it's an acceptably rounded decimal
      if (userAnswer.includes('.')) {
        return `Note: ${userAnswer} is an acceptably precise decimal approximation`;
      }
    }
    
    return null;
  } catch (error) {
    console.log('[mathValidation] Error generating equivalency context:', error);
    return null;
  }
}

/**
 * OCR sanity-check utility for fraction exercises
 */
export function detectFractionOcrMisread(question: string, userAnswer: string): { 
  isLikely: boolean; 
  correctedFraction?: string; 
  reason?: string; 
} {
  try {
    console.log('[mathValidation] detectFractionOcrMisread called:', { question, userAnswer });
    
    // Extract original fraction from question
    const questionFractionMatch = question.match(/(\d+)\s*\/\s*(\d+)/);
    if (!questionFractionMatch) return { isLikely: false };
    
    const [a, b] = questionFractionMatch.slice(1).map(n => parseInt(n.trim()));
    
    // Parse user's simplified fraction
    const userFractionMatch = userAnswer.trim().replace(/\s+/g, '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!userFractionMatch) return { isLikely: false };
    
    const [c, d] = userFractionMatch.slice(1).map(n => parseInt(n.trim()));
    
    // Check if user's fraction is in simplest form
    const userGCD = findGCD(c, d);
    if (userGCD !== 1) return { isLikely: false };
    
    // If a is divisible by c, calculate the expected ratio
    if (a % c !== 0) return { isLikely: false };
    
    const k = a / c;
    const expectedDenominator = d * k;
    
    console.log('[mathValidation] OCR analysis:', { 
      original: `${a}/${b}`, 
      user: `${c}/${d}`, 
      k, 
      expectedDenominator, 
      actualDenominator: b 
    });
    
    // Check if the denominators differ by a single digit (common OCR error)
    const denomString = b.toString();
    const expectedString = expectedDenominator.toString();
    
    // Common OCR digit confusions
    const ocrConfusions = [
      ['8', '9'], ['9', '8'], ['3', '8'], ['8', '3'], ['5', '6'], ['6', '5'],
      ['1', '7'], ['7', '1'], ['0', '8'], ['8', '0'], ['2', '5'], ['5', '2']
    ];
    
    // Check for single digit difference
    if (Math.abs(b - expectedDenominator) <= 10 && denomString.length === expectedString.length) {
      // Find which digit differs
      for (let i = 0; i < denomString.length; i++) {
        if (denomString[i] !== expectedString[i]) {
          const actualDigit = denomString[i];
          const expectedDigit = expectedString[i];
          
          // Check if it's a common OCR confusion
          const isOcrConfusion = ocrConfusions.some(([d1, d2]) => 
            (actualDigit === d1 && expectedDigit === d2) || 
            (actualDigit === d2 && expectedDigit === d1)
          );
          
          if (isOcrConfusion) {
            console.log('[mathValidation] ✅ OCR misread detected:', { 
              actualDigit, 
              expectedDigit, 
              position: i 
            });
            
            return {
              isLikely: true,
              correctedFraction: `${a}/${expectedDenominator}`,
              reason: `OCR likely misread '${expectedDigit}' as '${actualDigit}' in denominator`
            };
          }
        }
      }
    }
    
    return { isLikely: false };
  } catch (error) {
    console.log('[mathValidation] Error in OCR detection:', error);
    return { isLikely: false };
  }
}

// NEW: Special function for fraction simplification exercises
function areFractionsEquivalent(question: string, userAnswer: string): boolean | null {
  try {
    console.log('[mathValidation] areFractionsEquivalent called with:', { question, userAnswer });
    
    // Extract the original fraction from the question - more flexible regex
    const fractionMatch = question.match(/(\d+)\s*\/\s*(\d+)/);
    if (!fractionMatch) {
      console.log('[mathValidation] No fraction found in question');
      return null;
    }
    
    const originalFraction = fractionMatch[0];
    const [originalNum, originalDen] = originalFraction.split('/').map(n => parseInt(n.trim()));
    console.log('[mathValidation] Original fraction:', { originalNum, originalDen, originalFraction });
    
    // Normalize user answer - remove extra spaces and handle different formats
    const normalizedUserAnswer = userAnswer.trim().replace(/\s+/g, '');
    console.log('[mathValidation] Normalized user answer:', normalizedUserAnswer);
    
    // Parse user's answer - more flexible regex
    const userFractionMatch = normalizedUserAnswer.match(/(\d+)\s*\/\s*(\d+)/);
    if (!userFractionMatch) {
      console.log('[mathValidation] No fraction found in user answer - marking as incorrect for simplification exercise');
      return false; // Non-fraction answers are incorrect for simplification
    }
    
    const userFraction = userFractionMatch[0];
    const [userNum, userDen] = userFraction.split('/').map(n => parseInt(n.trim()));
    console.log('[mathValidation] User fraction:', { userNum, userDen, userFraction });
    
    // Check if user provided the original fraction (which is incorrect for simplification)
    if (userNum === originalNum && userDen === originalDen) {
      console.log('[mathValidation] User provided original fraction - this is incorrect for simplification');
      return false;
    }
    
    // Check if the fractions are mathematically equivalent
    const originalValue = originalNum / originalDen;
    const userValue = userNum / userDen;
    console.log('[mathValidation] Fraction values:', { originalValue, userValue, difference: Math.abs(originalValue - userValue) });
    
    if (Math.abs(originalValue - userValue) < Number.EPSILON) {
      // Check if user's answer is actually simplified
      const userGCD = findGCD(userNum, userDen);
      const isSimplified = userGCD === 1;
      console.log('[mathValidation] Simplification check:', { userGCD, isSimplified });
      
      if (!isSimplified) {
        console.log('[mathValidation] Fractions are equivalent but user answer is not simplified');
        return false;
      }
      
      console.log('[mathValidation] ✅ Fractions are equivalent and simplified correctly');
      return true;
    }
    
    console.log('[mathValidation] ❌ Fractions are not equivalent');
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