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
 * Count the maximum number of digits in operands of a math expression
 * @param expression - The math expression to analyze
 * @returns Object with max digits and operand lengths
 */
export function countOperandDigits(expression: string): { maxDigits: number; operand1: number; operand2: number } {
  if (!expression) return { maxDigits: 0, operand1: 0, operand2: 0 };
  
  // Extract operands by splitting on operators
  const parts = expression.split(/[+\-×*÷/\s=]/).filter(p => p.trim() && /^\d+$/.test(p.trim()));
  
  if (parts.length === 0) return { maxDigits: 0, operand1: 0, operand2: 0 };
  
  const operand1 = parts[0]?.length || 0;
  const operand2 = parts[1]?.length || 0;
  
  return {
    maxDigits: Math.max(operand1, operand2),
    operand1,
    operand2
  };
}

/**
 * Generate a fallback example with specified digit count
 * @param operationType - The operation type
 * @param minDigits - Minimum number of digits each operand should have
 * @returns Example expression with appropriate digit count
 */
export function generateFallbackExampleWithDigits(
  operationType: OperationType, 
  minDigits: number = 2
): string {
  if (minDigits < 2) minDigits = 2;
  
  switch (operationType) {
    case 'addition':
      if (minDigits === 2) return '23 + 45 = 68';
      if (minDigits === 3) return '123 + 456 = 579';
      if (minDigits === 4) return '1234 + 5678 = 6912';
      if (minDigits === 5) return '12345 + 67890 = 80235';
      // For 6+ digits
      const addA = '9'.repeat(minDigits);
      const addB = '1'.repeat(minDigits);
      const addSum = String(BigInt(addA) + BigInt(addB));
      return `${addA} + ${addB} = ${addSum}`;
      
    case 'subtraction':
      if (minDigits === 2) return '87 - 23 = 64';
      if (minDigits === 3) return '654 - 321 = 333';
      if (minDigits === 4) return '8765 - 4321 = 4444';
      if (minDigits === 5) return '98765 - 12345 = 86420';
      // For 6+ digits
      const subA = '8'.repeat(minDigits);
      const subB = '4'.repeat(minDigits);
      const subDiff = String(BigInt(subA) - BigInt(subB));
      return `${subA} - ${subB} = ${subDiff}`;
      
    case 'multiplication':
      if (minDigits === 2) return '12 × 8 = 96';
      if (minDigits === 3) return '234 × 56 = 13104';
      if (minDigits === 4) return '2345 × 678 = 1589910';
      if (minDigits === 5) return '12345 × 678 = 8369910';
      // For 6+ digits, use simpler approach
      return '123456 × 78 = 9629568';
      
    case 'division':
      if (minDigits === 2) return '84 ÷ 7 = 12';
      if (minDigits === 3) return '144 ÷ 12 = 12';
      if (minDigits === 4) return '1155 ÷ 77 = 15';
      if (minDigits === 5) return '12345 ÷ 823 = 15';
      // For 6+ digits
      return '123456 ÷ 823 = 150';
      
    default:
      if (minDigits === 2) return '15 + 25 = 40';
      return '123 + 456 = 579';
  }
}

/**
 * Generate a fallback example for a given operation type
 * @param operationType - The operation type to generate an example for
 * @returns A simple example expression
 */
export function generateFallbackExample(operationType: OperationType): string {
  return generateFallbackExampleWithDigits(operationType, 2);
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
  reason?: string;
} {
  const studentOp = detectOperationType(studentExercise);
  const exampleOp = detectOperationType(aiExample);
  
  const isValidOperation = studentOp.type === exampleOp.type &&
                  studentOp.type !== 'unknown' && 
                  exampleOp.type !== 'unknown';

  // Check digit count
  const studentDigits = countOperandDigits(studentExercise);
  const exampleDigits = countOperandDigits(aiExample);
  
  const digitCountValid = exampleDigits.maxDigits >= studentDigits.maxDigits;
  
  const overallValid = isValidOperation && digitCountValid;
  
  let reason = '';
  if (!isValidOperation) reason = 'Different operation type';
  else if (!digitCountValid) reason = `Example too short (${exampleDigits.maxDigits} vs ${studentDigits.maxDigits} digits)`;
  
  return {
    isValid: overallValid,
    studentOperation: studentOp.type,
    exampleOperation: exampleOp.type,
    suggestedFix: !overallValid ? generateFallbackExampleWithDigits(studentOp.type, studentDigits.maxDigits) : undefined,
    reason
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


