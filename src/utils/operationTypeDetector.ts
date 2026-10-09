/**
 * Utility functions to detect and validate operation types in math expressions
 */

export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'unknown';
export type ExerciseNumberKind = 'integer' | 'decimal' | 'fraction' | 'percentage' | 'unknown';
export type ExerciseResultKind = 'integer' | 'decimal' | 'fraction' | 'remainder' | 'percentage' | 'unknown';
export type DivisionKind = 'exact' | 'remainder' | 'decimal' | 'fraction' | 'unknown';

export interface OperationDetection {
  type: OperationType;
  operator: string;
  confidence: number; // 0-1, how confident we are in the detection
}

export interface ExerciseProfile {
  operationType: OperationType;
  operator: string;
  numberKind: ExerciseNumberKind;
  resultKind: ExerciseResultKind;
  divisionKind: DivisionKind;
  requiresCarry: boolean;
  requiresBorrow: boolean;
  digitBand: 1 | 2 | 3;
  maxDigits: number;
  operand1Digits: number;
  operand2Digits: number;
  operand1TrailingZeros: number;
  operand2TrailingZeros: number;
  decimalPlaces: number;
  decimalSeparator: ',' | '.';
}

function stripResultSide(expression: string): string {
  return expression.split('=')[0]?.trim() || expression.trim();
}

function splitOperands(expression: string, operationType: OperationType): [string, string] | null {
  const source = stripResultSide(expression).replace(/\s+/g, ' ').trim();
  if (!source) return null;

  if (operationType === 'addition') {
    const parts = source.split('+');
    if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join('+').trim()];
  }

  if (operationType === 'subtraction') {
    const match = source.match(/^\s*([^=]+?)\s*-\s*([^=]+?)\s*$/);
    if (match) return [match[1].trim(), match[2].trim()];
  }

  if (operationType === 'multiplication') {
    const match = source.match(/^\s*([^=]+?)\s*[×*]\s*([^=]+?)\s*$/);
    if (match) return [match[1].trim(), match[2].trim()];
  }

  if (operationType === 'division') {
    const match = source.match(/^\s*([^=]+?)\s*[÷/]\s*([^=]+?)\s*$/);
    if (match) return [match[1].trim(), match[2].trim()];
  }

  return null;
}

function countTokenDigits(token: string): number {
  const clean = token.trim().replace('%', '');
  if (!clean) return 0;

  if (clean.includes('/')) {
    const [left, right] = clean.split('/').map(part => part.replace(/\D/g, ''));
    return Math.max(left?.length || 0, right?.length || 0);
  }

  const normalized = clean.replace(',', '.');
  const [integerPart, decimalPart] = normalized.split('.');
  return Math.max((integerPart || '').replace(/\D/g, '').length, (decimalPart || '').replace(/\D/g, '').length);
}

function countTokenDecimalPlaces(token: string): number {
  const normalized = token.trim().replace('%', '').replace(',', '.');
  if (!normalized.includes('.')) return 0;
  return normalized.split('.')[1]?.replace(/\D/g, '').length || 0;
}

function countTrailingZeros(token: string): number {
  const digits = token.trim().replace(/[^0-9]/g, '');
  const match = digits.match(/0+$/);
  return match ? match[0].length : 0;
}

function detectTokenKind(token: string): ExerciseNumberKind {
  const clean = token.trim();
  if (!clean) return 'unknown';
  if (/%/.test(clean)) return 'percentage';
  if (clean.includes('/')) return 'fraction';
  if (/[.,]/.test(clean)) return 'decimal';
  if (/\d/.test(clean)) return 'integer';
  return 'unknown';
}

function normalizeNumericToken(token: string): number | null {
  const kind = detectTokenKind(token);
  const clean = token.trim().replace('%', '');
  if (!clean) return null;

  if (kind === 'fraction') {
    const [numRaw, denRaw] = clean.split('/');
    const num = Number(numRaw?.replace(',', '.'));
    const den = Number(denRaw?.replace(',', '.'));
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }

  const parsed = Number(clean.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return kind === 'percentage' ? parsed / 100 : parsed;
}

function getDigitBand(maxDigits: number): 1 | 2 | 3 {
  if (maxDigits <= 1) return 1;
  if (maxDigits === 2) return 2;
  return 3;
}

export function analyzeExerciseProfile(expression: string): ExerciseProfile {
  const detection = detectOperationType(expression);
  const operands = splitOperands(expression, detection.type);
  const left = operands?.[0] || '';
  const right = operands?.[1] || '';
  const leftKind = detectTokenKind(left);
  const rightKind = detectTokenKind(right);
  const numberKind: ExerciseNumberKind =
    leftKind !== 'unknown' ? leftKind : rightKind !== 'unknown' ? rightKind : 'unknown';
  const operand1Digits = countTokenDigits(left);
  const operand2Digits = countTokenDigits(right);
  const maxDigits = Math.max(operand1Digits, operand2Digits);
  const decimalPlaces = Math.max(countTokenDecimalPlaces(left), countTokenDecimalPlaces(right));
  const decimalSeparator: ',' | '.' = expression.includes(',') ? ',' : '.';
  const leftValue = normalizeNumericToken(left);
  const rightValue = normalizeNumericToken(right);

  let divisionKind: DivisionKind = 'unknown';
  let resultKind: ExerciseResultKind = 'unknown';
  let requiresCarry = false;
  let requiresBorrow = false;

  if (detection.type === 'division') {
    if (numberKind === 'decimal') {
      divisionKind = 'decimal';
      resultKind = 'decimal';
    } else if (numberKind === 'fraction') {
      divisionKind = 'fraction';
      resultKind = 'fraction';
    } else if (leftValue != null && rightValue != null && rightValue !== 0) {
      if (Number.isInteger(leftValue) && Number.isInteger(rightValue)) {
        if (leftValue % rightValue === 0) {
          divisionKind = 'exact';
          resultKind = 'integer';
        } else {
          divisionKind = 'remainder';
          resultKind = 'remainder';
        }
      } else {
        divisionKind = 'decimal';
        resultKind = Number.isInteger(leftValue / rightValue) ? 'integer' : 'decimal';
      }
    }
  } else if (numberKind === 'decimal') {
    resultKind = 'decimal';
  } else if (numberKind === 'fraction') {
    resultKind = 'fraction';
  } else if (numberKind === 'percentage') {
    resultKind = 'percentage';
  } else if (detection.type !== 'unknown') {
    if (detection.type === 'multiplication' && leftValue != null && rightValue != null && !Number.isInteger(leftValue * rightValue)) {
      resultKind = 'decimal';
    } else {
      resultKind = 'integer';
    }
  }

  if (detection.type === 'addition' && operands) {
    const leftDigits = `${parseDecimalOperandForProfile(left).intPart}${parseDecimalOperandForProfile(left).fracPart}`.split('').map(Number);
    const rightDigits = `${parseDecimalOperandForProfile(right).intPart}${parseDecimalOperandForProfile(right).fracPart}`.split('').map(Number);
    const width = Math.max(leftDigits.length, rightDigits.length);
    let carry = 0;
    for (let i = 0; i < width; i++) {
      const ad = leftDigits[leftDigits.length - 1 - i] ?? 0;
      const bd = rightDigits[rightDigits.length - 1 - i] ?? 0;
      const raw = ad + bd + carry;
      if (raw >= 10) {
        requiresCarry = true;
        break;
      }
      carry = Math.floor(raw / 10);
    }
  }

  if (detection.type === 'subtraction' && operands) {
    const leftParsed = parseDecimalOperandForProfile(left);
    const rightParsed = parseDecimalOperandForProfile(right);
    const fractionalWidth = Math.max(leftParsed.fracPart.length, rightParsed.fracPart.length);
    const integerWidth = Math.max(leftParsed.intPart.length, rightParsed.intPart.length);
    const leftDigits = `${leftParsed.intPart.padStart(integerWidth, '0')}${leftParsed.fracPart.padEnd(fractionalWidth, '0')}`.split('').map(Number);
    const rightDigits = `${rightParsed.intPart.padStart(integerWidth, '0')}${rightParsed.fracPart.padEnd(fractionalWidth, '0')}`.split('').map(Number);
    let borrow = 0;
    for (let i = leftDigits.length - 1; i >= 0; i--) {
      let top = leftDigits[i] - borrow;
      const bottom = rightDigits[i];
      if (top < bottom) {
        requiresBorrow = true;
        break;
      }
      borrow = 0;
    }
  }

  return {
    operationType: detection.type,
    operator: detection.operator,
    numberKind,
    resultKind,
    divisionKind,
    requiresCarry,
    requiresBorrow,
    digitBand: getDigitBand(maxDigits),
    maxDigits,
    operand1Digits,
    operand2Digits,
    operand1TrailingZeros: numberKind === 'integer' ? countTrailingZeros(left) : 0,
    operand2TrailingZeros: numberKind === 'integer' ? countTrailingZeros(right) : 0,
    decimalPlaces,
    decimalSeparator,
  };
}

function parseDecimalOperandForProfile(value: string) {
  const normalized = value.trim().replace(',', '.');
  const [intPartRaw, fracPartRaw = ''] = normalized.split('.');
  return {
    intPart: intPartRaw.replace(/\D/g, '') || '0',
    fracPart: fracPartRaw.replace(/\D/g, ''),
  };
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

  // Prefer explicit operators first. This avoids misclassifying multi-digit
  // numbers like "22+3" or "22/4" as implicit multiplication.
  if (/[÷/]/.test(cleanExpr)) {
    return {
      type: 'division',
      operator: cleanExpr.match(/[÷/]/)?.[0] || '÷',
      confidence: 0.95
    };
  }

  if (/\+/.test(cleanExpr)) {
    return {
      type: 'addition',
      operator: '+',
      confidence: 0.95
    };
  }

  if (/-/.test(cleanExpr)) {
    return {
      type: 'subtraction',
      operator: '-',
      confidence: 0.95
    };
  }

  if (/[×*]/.test(cleanExpr)) {
    return {
      type: 'multiplication',
      operator: cleanExpr.match(/[×*]/)?.[0] || '×',
      confidence: 0.95
    };
  }

  // Fallback: implicit multiplication only when there is no explicit operator.
  const multiplicationPatterns = [
    /(\d+)\s+(\d+)/,        // implicit multiplication requires whitespace: "3 4"
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
  const profile = analyzeExerciseProfile(expression);
  const operand1 = profile.operand1Digits || 0;
  const operand2 = profile.operand2Digits || 0;

  return {
    maxDigits: Math.max(operand1, operand2),
    operand1,
    operand2
  };
}

function formatDecimal(value: number, places: number, separator: ',' | '.'): string {
  const raw = value.toFixed(places);
  return separator === ',' ? raw.replace('.', ',') : raw;
}

export function generateProfileMatchedExample(profile: ExerciseProfile): string {
  const digits = profile.digitBand;
  const separator = profile.decimalSeparator;

  if (profile.numberKind === 'integer' && profile.operationType === 'division') {
    const makeOperand = (length: number, firstDigit: string, fillDigit: string) =>
      `${firstDigit}${fillDigit.repeat(Math.max(0, length - 1))}`;
    const divisor = BigInt(makeOperand(profile.operand2Digits, '4', '8'));
    const minimumDividend = 10n ** BigInt(Math.max(0, profile.operand1Digits - 1));
    const maximumDividend = (10n ** BigInt(profile.operand1Digits)) - 1n;

    if (profile.divisionKind === 'exact' && divisor > 0n) {
      const quotient = (minimumDividend + divisor - 1n) / divisor;
      const dividend = divisor * quotient;
      if (dividend <= maximumDividend) {
        return `${dividend} ÷ ${divisor} = ${quotient}`;
      }
    }

    let dividend = BigInt(makeOperand(profile.operand1Digits, '1', '2'));
    if (profile.divisionKind === 'remainder' && divisor > 0n && dividend % divisor === 0n) {
      dividend += 1n;
    }
    const quotient = divisor > 0n ? dividend / divisor : 0n;
    const remainder = divisor > 0n ? dividend % divisor : dividend;
    return `${dividend} ÷ ${divisor} = ${quotient} reste ${remainder}`;
  }

  if (profile.numberKind === 'integer' && profile.operationType === 'multiplication') {
    const makeOperand = (length: number, firstDigit: string, trailingZeros: number) => {
      const zeroCount = Math.min(trailingZeros, Math.max(0, length - 1));
      const significantDigits = Math.max(1, length - zeroCount);
      return `${firstDigit}${'3'.repeat(significantDigits - 1)}${'0'.repeat(zeroCount)}`;
    };
    const left = makeOperand(profile.operand1Digits, '3', profile.operand1TrailingZeros);
    const right = makeOperand(profile.operand2Digits, '4', profile.operand2TrailingZeros);
    return `${left} × ${right} = ${(BigInt(left) * BigInt(right)).toString()}`;
  }

  if (profile.numberKind === 'decimal') {
    const places = Math.max(profile.decimalPlaces, 1);
    switch (profile.operationType) {
      case 'addition':
        if (profile.requiresCarry) {
          if (digits === 1) return `${formatDecimal(2.7, places, separator)} + ${formatDecimal(3.8, places, separator)} = ${formatDecimal(6.5, places, separator)}`;
          if (digits === 2) return `${formatDecimal(12.8, places, separator)} + ${formatDecimal(23.7, places, separator)} = ${formatDecimal(36.5, places, separator)}`;
          return `${formatDecimal(123.8, places, separator)} + ${formatDecimal(245.7, places, separator)} = ${formatDecimal(369.5, places, separator)}`;
        }
        if (digits === 1) return `${formatDecimal(2.1, places, separator)} + ${formatDecimal(3.2, places, separator)} = ${formatDecimal(5.3, places, separator)}`;
        if (digits === 2) return `${formatDecimal(12.4, places, separator)} + ${formatDecimal(23.5, places, separator)} = ${formatDecimal(35.9, places, separator)}`;
        return `${formatDecimal(123.4, places, separator)} + ${formatDecimal(245.1, places, separator)} = ${formatDecimal(368.5, places, separator)}`;
      case 'subtraction':
        if (profile.requiresBorrow) {
          if (digits === 1) return `${formatDecimal(5.2, places, separator)} - ${formatDecimal(2.7, places, separator)} = ${formatDecimal(2.5, places, separator)}`;
          if (digits === 2) return `${formatDecimal(42.3, places, separator)} - ${formatDecimal(18.7, places, separator)} = ${formatDecimal(23.6, places, separator)}`;
          return `${formatDecimal(256.2, places, separator)} - ${formatDecimal(123.7, places, separator)} = ${formatDecimal(132.5, places, separator)}`;
        }
        if (digits === 1) return `${formatDecimal(8.7, places, separator)} - ${formatDecimal(2.4, places, separator)} = ${formatDecimal(6.3, places, separator)}`;
        if (digits === 2) return `${formatDecimal(45.8, places, separator)} - ${formatDecimal(12.3, places, separator)} = ${formatDecimal(33.5, places, separator)}`;
        return `${formatDecimal(256.7, places, separator)} - ${formatDecimal(123.4, places, separator)} = ${formatDecimal(133.3, places, separator)}`;
      case 'multiplication':
        if (digits === 1) return `${formatDecimal(1.2, places, separator)} × ${formatDecimal(3.0, places, separator)} = ${formatDecimal(3.6, places, separator)}`;
        if (digits === 2) return `${formatDecimal(12.5, places, separator)} × ${formatDecimal(2.0, places, separator)} = ${formatDecimal(25.0, places, separator)}`;
        return `${formatDecimal(123.0, places, separator)} × ${formatDecimal(2.0, places, separator)} = ${formatDecimal(246.0, places, separator)}`;
      case 'division':
        if (digits === 1) return `${formatDecimal(8.4, places, separator)} ÷ ${formatDecimal(2.0, places, separator)} = ${formatDecimal(4.2, places, separator)}`;
        if (digits === 2) return `${formatDecimal(24.6, places, separator)} ÷ ${formatDecimal(3.0, places, separator)} = ${formatDecimal(8.2, places, separator)}`;
        return `${formatDecimal(126.0, places, separator)} ÷ ${formatDecimal(4.0, places, separator)} = ${formatDecimal(31.5, places, separator)}`;
    }
  }

  if (profile.numberKind === 'fraction') {
    switch (profile.operationType) {
      case 'addition':
        return digits === 1 ? '1/4 + 2/4 = 3/4' : digits === 2 ? '3/10 + 4/10 = 7/10' : '12/20 + 3/20 = 15/20';
      case 'subtraction':
        return digits === 1 ? '5/6 - 1/6 = 4/6' : digits === 2 ? '9/10 - 2/10 = 7/10' : '15/20 - 4/20 = 11/20';
      case 'multiplication':
        return digits === 1 ? '2/3 × 1/2 = 2/6' : digits === 2 ? '3/10 × 2/5 = 6/50' : '12/25 × 3/10 = 36/250';
      case 'division':
        return digits === 1 ? '1/2 ÷ 1/4 = 2' : digits === 2 ? '3/5 ÷ 1/10 = 6' : '12/15 ÷ 2/5 = 2';
    }
  }

  if (profile.numberKind === 'percentage') {
    switch (profile.operationType) {
      case 'addition':
        return '20% + 15% = 35%';
      case 'subtraction':
        return '60% - 25% = 35%';
      case 'multiplication':
        return '50% × 20 = 10';
      case 'division':
        return '75% ÷ 25% = 3';
    }
  }

  if (profile.operationType === 'division') {
    if (profile.divisionKind === 'remainder') {
      if (digits === 1) return '7 ÷ 3 = 2 reste 1';
      if (digits === 2) return '22 ÷ 4 = 5 reste 2';
      return '125 ÷ 6 = 20 reste 5';
    }

    if (digits === 1) return '8 ÷ 2 = 4';
    if (digits === 2) return '84 ÷ 7 = 12';
    return '144 ÷ 12 = 12';
  }

  if (profile.operationType === 'addition' && profile.numberKind === 'integer') {
    if (profile.requiresCarry) {
      if (digits === 1) return '7 + 5 = 12';
      if (digits === 2) return '28 + 47 = 75';
      return '268 + 457 = 725';
    }
    if (digits === 1) return '2 + 4 = 6';
    if (digits === 2) return '23 + 45 = 68';
    return '123 + 245 = 368';
  }

  if (profile.operationType === 'subtraction' && profile.numberKind === 'integer') {
    if (profile.requiresBorrow) {
      if (digits === 1) return '9 - 7 = 2';
      if (digits === 2) return '52 - 27 = 25';
      return '302 - 178 = 124';
    }
    if (digits === 1) return '9 - 4 = 5';
    if (digits === 2) return '87 - 23 = 64';
    return '654 - 321 = 333';
  }

  return generateFallbackExampleWithDigits(profile.operationType, digits);
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
  if (minDigits < 1) minDigits = 1;
  if (minDigits > 3) minDigits = 3;
  
  switch (operationType) {
    case 'addition':
      if (minDigits === 1) return '2 + 4 = 6';
      if (minDigits === 2) return '23 + 45 = 68';
      if (minDigits === 3) return '123 + 456 = 579';
      return '123 + 456 = 579';
      
    case 'subtraction':
      if (minDigits === 1) return '9 - 4 = 5';
      if (minDigits === 2) return '87 - 23 = 64';
      if (minDigits === 3) return '654 - 321 = 333';
      return '654 - 321 = 333';
      
    case 'multiplication':
      if (minDigits === 1) return '3 × 4 = 12';
      if (minDigits === 2) return '12 × 8 = 96';
      if (minDigits === 3) return '234 × 56 = 13104';
      return '234 × 56 = 13104';
      
    case 'division':
      if (minDigits === 1) return '8 ÷ 2 = 4';
      if (minDigits === 2) return '84 ÷ 7 = 12';
      if (minDigits === 3) return '144 ÷ 12 = 12';
      return '144 ÷ 12 = 12';
      
    default:
      if (minDigits === 1) return '2 + 3 = 5';
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
  const studentProfile = analyzeExerciseProfile(studentExercise);
  const exampleProfile = analyzeExerciseProfile(aiExample);

  const isValidOperation = studentProfile.operationType === exampleProfile.operationType &&
    studentProfile.operationType !== 'unknown' &&
    exampleProfile.operationType !== 'unknown';
  const digitCountValid =
    exampleProfile.operand1Digits === studentProfile.operand1Digits &&
    exampleProfile.operand2Digits === studentProfile.operand2Digits;
  const zeroStructureValid =
    studentProfile.operationType !== 'multiplication' ||
    (exampleProfile.operand1TrailingZeros === studentProfile.operand1TrailingZeros &&
      exampleProfile.operand2TrailingZeros === studentProfile.operand2TrailingZeros);
  const numberKindValid = exampleProfile.numberKind === studentProfile.numberKind;
  const decimalPlacesValid =
    studentProfile.numberKind !== 'decimal' ||
    exampleProfile.decimalPlaces === studentProfile.decimalPlaces;
  const divisionKindValid =
    studentProfile.operationType !== 'division' ||
    studentProfile.divisionKind === exampleProfile.divisionKind;
  const carryPatternValid =
    studentProfile.operationType !== 'addition' ||
    studentProfile.requiresCarry === exampleProfile.requiresCarry;
  const borrowPatternValid =
    studentProfile.operationType !== 'subtraction' ||
    studentProfile.requiresBorrow === exampleProfile.requiresBorrow;

  const overallValid = isValidOperation && digitCountValid && zeroStructureValid && numberKindValid && decimalPlacesValid && divisionKindValid && carryPatternValid && borrowPatternValid;

  let reason = '';
  if (!isValidOperation) reason = 'Different operation type';
  else if (!numberKindValid) reason = `Different number kind (${exampleProfile.numberKind} vs ${studentProfile.numberKind})`;
  else if (!divisionKindValid) reason = `Different division kind (${exampleProfile.divisionKind} vs ${studentProfile.divisionKind})`;
  else if (!carryPatternValid) reason = `Different carry pattern (${exampleProfile.requiresCarry} vs ${studentProfile.requiresCarry})`;
  else if (!borrowPatternValid) reason = `Different borrow pattern (${exampleProfile.requiresBorrow} vs ${studentProfile.requiresBorrow})`;
  else if (!decimalPlacesValid) reason = `Different decimal places (${exampleProfile.decimalPlaces} vs ${studentProfile.decimalPlaces})`;
  else if (!zeroStructureValid) reason = 'Different trailing-zero structure';
  else if (!digitCountValid) reason = `Different digit band (${exampleProfile.digitBand} vs ${studentProfile.digitBand})`;
  
  return {
    isValid: overallValid,
    studentOperation: studentProfile.operationType,
    exampleOperation: exampleProfile.operationType,
    suggestedFix: !overallValid
      ? generateProfileMatchedExample(studentProfile)
      : undefined,
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
