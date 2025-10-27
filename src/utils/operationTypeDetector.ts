/**
 * Utility functions to detect and validate operation types in math expressions
 */

export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'unknown';

export interface OperationDetection {
  type: OperationType;
  operator: string;
  confidence: number; // 0-1, how confident we are in the detection
}

/**
 * Detect the operation type from a math expression
 * @param expression - The math expression to analyze
 * @returns OperationDetection object with type, operator, and confidence
 */
export function detectOperationType(expression: string): OperationDetection {
  if (!expression || typeof expression !== 'string') {
    return { type: 'unknown', operator: '', confidence: 0 };
  }

  const cleanExpr = expression.trim().replace(/\s+/g, ' ');

  // Check for multiplication (×, *, or implicit multiplication)
  const multiplicationPatterns = [
    /×/,                    // × symbol
    /\*/,                   // * symbol
    /(\d+)\s*(\d+)/,        // implicit multiplication (e.g., "3 4" = 3×4)
    /[a-zA-Z]\s*\d+/,       // variable × number (e.g., "x 3")
    /\d+\s*[a-zA-Z]/        // number × variable (e.g., "3 x")
  ];

  for (const pattern of multiplicationPatterns) {
    if (pattern.test(cleanExpr)) {
      return { 
        type: 'multiplication', 
        operator: cleanExpr.match(/[×*]/)?.[0] || '×', 
        confidence: 0.9 
      };
    }
  }

  // Check for division (÷, /)
  if (/[÷/]/.test(cleanExpr)) {
    return { 
      type: 'division', 
      operator: cleanExpr.match(/[÷/]/)?.[0] || '÷', 
      confidence: 0.9 
    };
  }

  // Check for addition (+)
  if (/\+/.test(cleanExpr)) {
    return { 
      type: 'addition', 
      operator: '+', 
      confidence: 0.9 
    };
  }

  // Check for subtraction (-)
  if (/-/.test(cleanExpr)) {
    return { 
      type: 'subtraction', 
      operator: '-', 
      confidence: 0.9 
    };
  }

  // Check for equals sign patterns (might indicate a solved problem)
  if (/=/.test(cleanExpr)) {
    // Extract the left side before the equals sign
    const leftSide = cleanExpr.split('=')[0].trim();
    return detectOperationType(leftSide);
  }

  return { type: 'unknown', operator: '', confidence: 0 };
}

/**
 * Check if two expressions have the same operation type
 * @param expr1 - First expression
 * @param expr2 - Second expression
 * @returns boolean indicating if they have the same operation type
 */
export function hasSameOperationType(expr1: string, expr2: string): boolean {
  const detection1 = detectOperationType(expr1);
  const detection2 = detectOperationType(expr2);
  
  return detection1.type === detection2.type && 
         detection1.type !== 'unknown' && 
         detection2.type !== 'unknown';
}

/**
 * Generate a fallback example for a given operation type
 * @param operationType - The operation type to generate an example for
 * @returns A simple example expression
 */
export function generateFallbackExample(operationType: OperationType): string {
  switch (operationType) {
    case 'addition':
      return '23 + 45 = 68';
    case 'subtraction':
      return '87 - 23 = 64';
    case 'multiplication':
      return '12 × 8 = 96';
    case 'division':
      return '84 ÷ 7 = 12';
    default:
      return '15 + 25 = 40'; // Default to addition
  }
}

/**
 * Validate that an AI-generated example matches the student's operation type
 * @param studentExercise - The student's original exercise
 * @param aiExample - The AI-generated example
 * @returns Object with validation result and suggested fix
 */
export function validateExampleOperationType(
  studentExercise: string, 
  aiExample: string
): {
  isValid: boolean;
  studentOperation: OperationType;
  exampleOperation: OperationType;
  suggestedFix?: string;
} {
  const studentOp = detectOperationType(studentExercise);
  const exampleOp = detectOperationType(aiExample);
  
  const isValid = studentOp.type === exampleOp.type && 
                  studentOp.type !== 'unknown' && 
                  exampleOp.type !== 'unknown';

  return {
    isValid,
    studentOperation: studentOp.type,
    exampleOperation: exampleOp.type,
    suggestedFix: !isValid ? generateFallbackExample(studentOp.type) : undefined
  };
}

/**
 * Extract the operation type from a math expression for display purposes
 * @param expression - The math expression
 * @returns Human-readable operation type
 */
export function getOperationTypeDisplay(operationType: OperationType): string {
  switch (operationType) {
    case 'addition':
      return 'Addition';
    case 'subtraction':
      return 'Subtraction';
    case 'multiplication':
      return 'Multiplication';
    case 'division':
      return 'Division';
    default:
      return 'Unknown Operation';
  }
}


