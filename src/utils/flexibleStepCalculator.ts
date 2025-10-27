/**
 * Flexible step calculator for all mathematical operations
 * Calculates the exact number of steps needed for each operation type
 */

import { buildMultiplicationPlan, MultiplicationPlan } from './longMultiplicationSteps';

export interface StepCalculation {
  totalSteps: number;
  operationType: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'general';
  details?: {
    addition?: AdditionDetails;
    subtraction?: SubtractionDetails;
    multiplication?: MultiplicationDetails;
    division?: DivisionDetails;
  };
}

export interface AdditionDetails {
  maxLength: number;
  carrySteps: number;
  resultSteps: number;
}

export interface SubtractionDetails {
  maxLength: number;
  borrowSteps: number;
  resultSteps: number;
}

export interface MultiplicationDetails {
  plan: MultiplicationPlan;
  partialProductSteps: number;
  finalSumSteps: number;
}

export interface DivisionDetails {
  dividendLength: number;
  quotientSteps: number;
}

/**
 * Calculate the exact number of steps for any mathematical expression
 */
export function calculateSteps(expression: string): StepCalculation {
  // Clean the expression
  const cleanExpr = expression.trim().replace(/×/g, '*').replace(/÷/g, '/');
  
  // Detect operation type
  if (/^(\s*\d+\s*\+\s*\d+\s*)$/.test(cleanExpr)) {
    return calculateAdditionSteps(cleanExpr);
  } else if (/^(\s*\d+\s*-\s*\d+\s*)$/.test(cleanExpr)) {
    return calculateSubtractionSteps(cleanExpr);
  } else if (/^(\s*\d+\s*[×*]\s*\d+\s*)$/.test(cleanExpr)) {
    return calculateMultiplicationSteps(cleanExpr);
  } else if (/^(\s*\d+\s*[\/÷]\s*\d+\s*)$/.test(cleanExpr)) {
    return calculateDivisionSteps(cleanExpr);
  } else {
    // For complex expressions, use the general stepper
    return {
      totalSteps: 5, // Default fallback
      operationType: 'general'
    };
  }
}

function calculateAdditionSteps(expression: string): StepCalculation {
  const parts = expression.split('+');
  const numA = (parts[0] || '0').replace(/[^0-9]/g, '');
  const numB = (parts[1] || '0').replace(/[^0-9]/g, '');
  
  const maxLength = Math.max(numA.length, numB.length);
  
  // Addition: 2 phases per column (carry + result) + final carry if needed
  const carrySteps = maxLength;
  const resultSteps = maxLength;
  const finalCarryStep = (carrySteps > 0 && (parseInt(numA) + parseInt(numB)).toString().length > maxLength) ? 1 : 0;
  
  const totalSteps = carrySteps + resultSteps + finalCarryStep;
  
  return {
    totalSteps,
    operationType: 'addition',
    details: {
      addition: {
        maxLength,
        carrySteps,
        resultSteps
      }
    }
  };
}

function calculateSubtractionSteps(expression: string): StepCalculation {
  const parts = expression.split('-');
  const numA = (parts[0] || '0').replace(/[^0-9]/g, '');
  const numB = (parts[1] || '0').replace(/[^0-9]/g, '');
  
  const maxLength = Math.max(numA.length, numB.length);
  
  // Subtraction: 2 phases per column (borrow + result)
  const borrowSteps = maxLength;
  const resultSteps = maxLength;
  
  const totalSteps = borrowSteps + resultSteps;
  
  return {
    totalSteps,
    operationType: 'subtraction',
    details: {
      subtraction: {
        maxLength,
        borrowSteps,
        resultSteps
      }
    }
  };
}

function calculateMultiplicationSteps(expression: string): StepCalculation {
  const parts = expression.split(/[×*]/);
  const numA = (parts[0] || '0').replace(/[^0-9]/g, '');
  const numB = (parts[1] || '0').replace(/[^0-9]/g, '');
  
  // Use the long multiplication plan
  const plan = buildMultiplicationPlan(numA, numB);
  
  // Count only the actual mathematical steps, not UI transitions
  // Each partial product step represents digit-by-digit calculation
  // Don't count "moving to next line" as a separate step
  let totalSteps = 0;
  
  for (const step of plan.steps) {
    if (step.kind === 'partial') {
      // Each digit in the partial product is a step
      totalSteps += step.digitsCount;
    } else if (step.kind === 'final') {
      // Final sum calculation steps
      totalSteps += step.digitsCount;
    }
  }
  
  return {
    totalSteps,
    operationType: 'multiplication',
    details: {
      multiplication: {
        plan,
        partialProductSteps: plan.steps.filter(s => s.kind === 'partial').length,
        finalSumSteps: 1
      }
    }
  };
}

function calculateDivisionSteps(expression: string): StepCalculation {
  const parts = expression.split(/[÷\/]/);
  const dividendStr = (parts[0] || '0').replace(/[^0-9]/g, '');
  const divisorStr = (parts[1] || '1').replace(/[^0-9]/g, '');
  
  const dividendLength = dividendStr.length;
  
  // Division: one step per quotient digit (simplified)
  const quotientSteps = dividendLength;
  
  return {
    totalSteps: quotientSteps,
    operationType: 'division',
    details: {
      division: {
        dividendLength,
        quotientSteps
      }
    }
  };
}

/**
 * Get the maximum step index (0-based) for the stepper
 */
export function getMaxStepIndex(expression: string): number {
  const calculation = calculateSteps(expression);
  return calculation.totalSteps - 1;
}

/**
 * Check if a step is valid for the given expression
 */
export function isValidStep(expression: string, stepIndex: number): boolean {
  const maxStep = getMaxStepIndex(expression);
  return stepIndex >= 0 && stepIndex <= maxStep;
}
