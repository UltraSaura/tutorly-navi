/**
 * Mathematical validation utilities for checking equivalency between different answer formats
 */

import { latexToPlainText, isLatex } from './latexUtils';

/**
 * Checks if two mathematical expressions are equivalent
 */
export function areMathematicallyEquivalent(
  question: string, 
  userAnswer: string, 
  tolerance: number = 0.01
): boolean | null {
  try {
    console.log('[mathValidation] ========== EQUIVALENCY CHECK START ==========');
    console.log('[mathValidation] Raw inputs:', { question, userAnswer, tolerance });
    
    // Convert LaTeX to plain text for both question and answer
    const plainTextQuestion = isLatex(question) ? latexToPlainText(question) : question;
    const plainTextAnswer = isLatex(userAnswer) ? latexToPlainText(userAnswer) : userAnswer;
    
    console.log('[mathValidation] After LaTeX conversion:', { 
      plainTextQuestion,
      plainTextAnswer 
    });
    
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
      plainTextQuestion.toLowerCase().includes(keyword)
    ) || (plainTextQuestion.match(/\d+\/\d+/) && (plainTextQuestion.toLowerCase().includes('simplify') || plainTextQuestion.toLowerCase().includes('reduce')));
    
    if (isFractionExercise) {
      console.log('[mathValidation] Detected fraction simplification exercise');
      const result = areFractionsEquivalent(plainTextQuestion, plainTextAnswer);
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (fraction) ==========');
      return result;
    }
    
    // Check for equation solving exercises (must be before other checks)
    const equationResult = validateEquationSolution(plainTextQuestion, plainTextAnswer);
    if (equationResult !== null) {
      console.log('[mathValidation] Equation solving detected, result:', equationResult);
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (equation) ==========');
      return equationResult;
    }
    
    // Extract the correct answer from the plain text question
    const correctAnswer = extractCorrectAnswer(plainTextQuestion);
    console.log('[mathValidation] Extracted correct answer:', correctAnswer);
    
    if (correctAnswer === null) {
      console.log('[mathValidation] Could not extract correct answer - returning null');
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (no answer) ==========');
      return null;
    }

    // Evaluate mathematical functions in the answer
    const evaluatedAnswer = evaluateMathematicalFunctions(plainTextAnswer);
    console.log('[mathValidation] After function evaluation:', evaluatedAnswer);
    
    // Normalize and parse user answer
    const normalizedUserAnswer = normalizeAnswer(evaluatedAnswer);
    console.log('[mathValidation] Normalized user answer:', normalizedUserAnswer);
    
    const userValue = parseFloat(normalizedUserAnswer);
    console.log('[mathValidation] Parsed user value:', userValue);
    
    if (isNaN(userValue)) {
      console.log('[mathValidation] User value is NaN - returning null');
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (NaN) ==========');
      return null;
    }

    // Calculate the difference
    const difference = Math.abs(userValue - correctAnswer);
    console.log('[mathValidation] Comparison:', { 
      userValue, 
      correctAnswer, 
      difference, 
      tolerance,
      withinTolerance: difference <= tolerance 
    });

    // CRITICAL SANITY CHECK: Flag mathematically impossible answers
    // If the difference is greater than 1.0, it's likely wrong
    if (difference > 1.0) {
      console.warn('[mathValidation] ⚠️ SANITY CHECK FAILED: Difference exceeds 1.0');
      console.warn('[mathValidation] This answer is mathematically impossible as equivalent');
      console.warn('[mathValidation] Question:', question);
      console.warn('[mathValidation] User answer:', userAnswer);
      console.warn('[mathValidation] Expected:', correctAnswer, 'Got:', userValue);
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (sanity fail) ==========');
      return false; // Definitely wrong
    }

    // Check for exact equality first
    if (Math.abs(userValue - correctAnswer) < Number.EPSILON) {
      console.log('[mathValidation] ✅ EXACT MATCH (within epsilon)');
      console.log('[mathValidation] ========== EQUIVALENCY CHECK END (exact) ==========');
      return true;
    }

    // Check within tolerance for decimal/fraction equivalency
    const result = difference <= tolerance;
    console.log('[mathValidation] Final result:', result ? '✅ EQUIVALENT' : '❌ NOT EQUIVALENT');
    console.log('[mathValidation] ========== EQUIVALENCY CHECK END ==========');
    return result;
  } catch (error) {
    console.error('[mathValidation] ❌ ERROR in equivalency check:', error);
    console.log('[mathValidation] ========== EQUIVALENCY CHECK END (error) ==========');
    return null;
  }
}

/**
 * Extract the correct answer from a mathematical question
 */
function extractCorrectAnswer(question: string): number | null {
  // Handle square root problems
  const sqrtMatch = question.match(/(?:√|\\sqrt\{|sqrt\()(\d+(?:\.\d+)?)(?:\}|\))?/);
  if (sqrtMatch) {
    const number = parseFloat(sqrtMatch[1]);
    if (!isNaN(number) && number >= 0) {
      console.log(`[mathValidation] Found square root in question: sqrt(${number}) = ${Math.sqrt(number)}`);
      return Math.sqrt(number);
    }
  }

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

  // Handle exponentiation - this is the key addition
  const exponentMatch = question.match(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/);
  if (exponentMatch) {
    const base = parseFloat(exponentMatch[1]);
    const exponent = parseFloat(exponentMatch[2]);
    return Math.pow(base, exponent);
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
 * Validates if a value satisfies an equation
 * Supports formats like: "3x+66=0", "2x-5=11", "-4x+8=20"
 */
function validateEquationSolution(question: string, userAnswer: string): boolean | null {
  try {
    // Match equation patterns: ax+b=c or ax-b=c
    const equationMatch = question.match(/([+-]?\d*\.?\d*)x\s*([+-])\s*(\d+\.?\d*)\s*=\s*([+-]?\d+\.?\d*)/);
    
    if (!equationMatch) return null; // Not an equation
    
    const [, coeffStr, operator, constantStr, result] = equationMatch;
    
    // Parse coefficient (handles "", "+", "-", or number)
    const coefficient = coeffStr === '' || coeffStr === '+' ? 1 : 
                       coeffStr === '-' ? -1 : 
                       parseFloat(coeffStr);
    
    const constant = parseFloat(operator + constantStr);
    const expectedResult = parseFloat(result);
    
    // Extract numeric value from user's answer (remove "x=", spaces, etc.)
    const userValue = parseFloat(userAnswer.replace(/[^-\d.]/g, ''));
    
    if (isNaN(userValue) || isNaN(coefficient) || isNaN(constant)) {
      return null;
    }
    
    // Substitute user's answer into equation: coefficient*x + constant = expectedResult
    const leftSide = coefficient * userValue + constant;
    const isCorrect = Math.abs(leftSide - expectedResult) < 0.01;
    
    console.log('[mathValidation] Equation validation:', {
      equation: `${coefficient}x ${operator} ${constantStr} = ${expectedResult}`,
      userAnswer: userValue,
      leftSide,
      expectedResult,
      difference: Math.abs(leftSide - expectedResult),
      isCorrect
    });
    
    return isCorrect;
  } catch (error) {
    console.warn('[mathValidation] Error in equation validation:', error);
    return null;
  }
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

// Special function for fraction simplification exercises
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

// Helper function to find Greatest Common Divisor
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

// Validate fraction format
function isValidFraction(fraction: string): boolean {
  const fractionPattern = /^\d+\/\d+$/;
  if (!fractionPattern.test(fraction)) {
    return false;
  }
  
  const [numerator, denominator] = fraction.split('/').map(Number);
  return numerator > 0 && denominator > 1 && numerator < 1000 && denominator < 1000;
}

/**
 * Normalizes mathematical expressions for comparison
 */
export function normalizeMathExpression(expression: string): string {
  return expression
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/•/g, '*')  // Convert bullet multiplication to asterisk
    .replace(/×/g, '*')  // Convert × to asterisk
    .replace(/÷/g, '/')  // Convert ÷ to slash
    .toLowerCase();
}

/**
 * Evaluate mathematical functions in expressions (sqrt, etc.)
 */
function evaluateMathematicalFunctions(expression: string): string {
  try {
    console.log('[mathValidation] Evaluating mathematical functions in:', expression);
    
    let result = expression;
    
    // Handle square root functions
    result = result.replace(/sqrt\(([^)]+)\)/g, (match, content) => {
      try {
        // Handle nested expressions or simple numbers
        const innerValue = parseFloat(content);
        if (!isNaN(innerValue) && innerValue >= 0) {
          const sqrtResult = Math.sqrt(innerValue);
          console.log(`[mathValidation] sqrt(${innerValue}) = ${sqrtResult}`);
          return sqrtResult.toString();
        }
        return match; // Return original if can't evaluate
      } catch (error) {
        console.log('[mathValidation] Error evaluating sqrt:', error);
        return match;
      }
    });
    
    // Handle cube root functions
    result = result.replace(/cbrt\(([^)]+)\)/g, (match, content) => {
      try {
        const innerValue = parseFloat(content);
        if (!isNaN(innerValue)) {
          const cbrtResult = Math.cbrt(innerValue);
          console.log(`[mathValidation] cbrt(${innerValue}) = ${cbrtResult}`);
          return cbrtResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating cbrt:', error);
        return match;
      }
    });
    
    // Handle basic trigonometric functions (in degrees)
    result = result.replace(/sin\(([^)]+)\)/g, (match, content) => {
      try {
        const degrees = parseFloat(content);
        if (!isNaN(degrees)) {
          const radians = (degrees * Math.PI) / 180;
          const sinResult = Math.sin(radians);
          console.log(`[mathValidation] sin(${degrees}°) = ${sinResult}`);
          return sinResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating sin:', error);
        return match;
      }
    });
    
    result = result.replace(/cos\(([^)]+)\)/g, (match, content) => {
      try {
        const degrees = parseFloat(content);
        if (!isNaN(degrees)) {
          const radians = (degrees * Math.PI) / 180;
          const cosResult = Math.cos(radians);
          console.log(`[mathValidation] cos(${degrees}°) = ${cosResult}`);
          return cosResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating cos:', error);
        return match;
      }
    });
    
    result = result.replace(/tan\(([^)]+)\)/g, (match, content) => {
      try {
        const degrees = parseFloat(content);
        if (!isNaN(degrees)) {
          const radians = (degrees * Math.PI) / 180;
          const tanResult = Math.tan(radians);
          console.log(`[mathValidation] tan(${degrees}°) = ${tanResult}`);
          return tanResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating tan:', error);
        return match;
      }
    });
    
    // Handle logarithmic functions
    result = result.replace(/log\(([^)]+)\)/g, (match, content) => {
      try {
        const innerValue = parseFloat(content);
        if (!isNaN(innerValue) && innerValue > 0) {
          const logResult = Math.log10(innerValue);
          console.log(`[mathValidation] log(${innerValue}) = ${logResult}`);
          return logResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating log:', error);
        return match;
      }
    });
    
    result = result.replace(/ln\(([^)]+)\)/g, (match, content) => {
      try {
        const innerValue = parseFloat(content);
        if (!isNaN(innerValue) && innerValue > 0) {
          const lnResult = Math.log(innerValue);
          console.log(`[mathValidation] ln(${innerValue}) = ${lnResult}`);
          return lnResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating ln:', error);
        return match;
      }
    });
    
    // Handle exponential functions
    result = result.replace(/exp\(([^)]+)\)/g, (match, content) => {
      try {
        const innerValue = parseFloat(content);
        if (!isNaN(innerValue)) {
          const expResult = Math.exp(innerValue);
          console.log(`[mathValidation] exp(${innerValue}) = ${expResult}`);
          return expResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating exp:', error);
        return match;
      }
    });
    
    // Handle power functions (basic case: number^number)
    result = result.replace(/([0-9.]+)\^([0-9.]+)/g, (match, base, exponent) => {
      try {
        const baseNum = parseFloat(base);
        const expNum = parseFloat(exponent);
        if (!isNaN(baseNum) && !isNaN(expNum)) {
          const powResult = Math.pow(baseNum, expNum);
          console.log(`[mathValidation] ${baseNum}^${expNum} = ${powResult}`);
          return powResult.toString();
        }
        return match;
      } catch (error) {
        console.log('[mathValidation] Error evaluating power:', error);
        return match;
      }
    });
    
    console.log(`[mathValidation] Function evaluation result: "${expression}" -> "${result}"`);
    return result;
  } catch (error) {
    console.log('[mathValidation] Error in evaluateMathematicalFunctions:', error);
    return expression; // Return original if evaluation fails
  }
}