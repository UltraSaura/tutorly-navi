/**
 * Local math grading engine — grades arithmetic, fractions, algebra, equations instantly without AI.
 */

import { areMathematicallyEquivalent } from '@/utils/mathValidation';
import { gradeGeometry } from './geometryGrader';

export interface LocalGradeResult {
  isCorrect: boolean;
  correctAnswer: string;
  confidence: 'high' | 'low';
  method: 'local';
}

/**
 * Attempt to grade a math exercise locally. Returns null if unsupported.
 */
export function localGrade(question: string, userAnswer: string): LocalGradeResult | null {
  const q = question.trim();
  const a = userAnswer.trim();

  if (!q || !a) return null;

  // 1. Try geometry first
  const geoResult = gradeGeometry(q, a);
  if (geoResult) return geoResult;

  // 2. Try percentage calculation: "X% of Y"
  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|de|von)\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const base = parseFloat(pctMatch[2]);
    const correct = (pct / 100) * base;
    return compareNumeric(correct, a);
  }

  // 3. Try simple linear equation: ax + b = c  or  ax - b = c  etc.
  const eqResult = solveLinearEquation(q);
  if (eqResult !== null) {
    const userVal = parseFloat(a.replace(/[^-\d.]/g, ''));
    if (!isNaN(userVal)) {
      const isCorrect = Math.abs(userVal - eqResult) < 0.01;
      return {
        isCorrect,
        correctAnswer: String(eqResult),
        confidence: 'high',
        method: 'local',
      };
    }
  }

  // 4. Try combining like terms: e.g. "2x + 3x"
  const likeTerms = solveLikeTerms(q);
  if (likeTerms !== null) {
    const userCoeff = parseFloat(a.replace(/[^-\d.]/g, ''));
    if (!isNaN(userCoeff)) {
      const isCorrect = Math.abs(userCoeff - likeTerms) < 0.01;
      return {
        isCorrect,
        correctAnswer: `${likeTerms}x`,
        confidence: 'high',
        method: 'local',
      };
    }
  }

  // 5. Try arithmetic via mathValidation (covers +, -, *, /, ^, √, fractions)
  const mathResult = areMathematicallyEquivalent(q, a);
  if (mathResult !== null) {
    // Extract the correct answer for internal storage
    const correctVal = extractArithmeticAnswer(q);
    return {
      isCorrect: mathResult,
      correctAnswer: correctVal !== null ? String(correctVal) : '',
      confidence: 'high',
      method: 'local',
    };
  }

  return null; // Unsupported — fall back to AI
}

function compareNumeric(correct: number, userAnswer: string): LocalGradeResult {
  const stripped = userAnswer.replace(/[^-\d.]/g, '');
  const userVal = parseFloat(stripped);
  const isCorrect = !isNaN(userVal) && Math.abs(userVal - correct) < 0.01;
  return {
    isCorrect,
    correctAnswer: String(Math.round(correct * 10000) / 10000),
    confidence: 'high',
    method: 'local',
  };
}

function solveLinearEquation(q: string): number | null {
  // ax + b = c  or  ax - b = c
  const match = q.match(/([+-]?\d*\.?\d*)x\s*([+-])\s*(\d+\.?\d*)\s*=\s*([+-]?\d+\.?\d*)/);
  if (!match) return null;
  const [, coeffStr, op, constStr, rhs] = match;
  const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr);
  const constant = parseFloat(op + constStr);
  const result = parseFloat(rhs);
  if (isNaN(coeff) || isNaN(constant) || isNaN(result) || coeff === 0) return null;
  return (result - constant) / coeff;
}

function solveLikeTerms(q: string): number | null {
  // Match patterns like "2x + 3x" or "5x - 2x + x"
  const termRegex = /([+-]?\s*\d*\.?\d*)x/g;
  const matches = [...q.matchAll(termRegex)];
  if (matches.length < 2) return null;
  // Make sure there's no = sign (that's an equation, not like-terms)
  if (q.includes('=')) return null;
  let sum = 0;
  for (const m of matches) {
    let coeffStr = m[1].replace(/\s/g, '');
    if (coeffStr === '' || coeffStr === '+') coeffStr = '1';
    else if (coeffStr === '-') coeffStr = '-1';
    sum += parseFloat(coeffStr);
  }
  return isNaN(sum) ? null : sum;
}

function extractArithmeticAnswer(q: string): number | null {
  // Division
  const divMatch = q.match(/(\d+(?:\.\d+)?)\s*[÷\/]\s*(\d+(?:\.\d+)?)/);
  if (divMatch) return parseFloat(divMatch[1]) / parseFloat(divMatch[2]);

  // Basic arithmetic
  const arithMatch = q.match(/(\d+(?:\.\d+)?)\s*([+\-*/×])\s*(\d+(?:\.\d+)?)/);
  if (arithMatch) {
    const a = parseFloat(arithMatch[1]);
    const b = parseFloat(arithMatch[3]);
    switch (arithMatch[2]) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': case '×': return a * b;
      case '/': return a / b;
    }
  }

  // Power
  const powMatch = q.match(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/);
  if (powMatch) return Math.pow(parseFloat(powMatch[1]), parseFloat(powMatch[2]));

  // Square root
  const sqrtMatch = q.match(/(?:√|sqrt\(?)(\d+(?:\.\d+)?)/);
  if (sqrtMatch) return Math.sqrt(parseFloat(sqrtMatch[1]));

  return null;
}
