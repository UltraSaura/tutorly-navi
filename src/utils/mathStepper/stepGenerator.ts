/**
 * Step Generator for Interactive Math Stepper
 * Generates visual steps for arithmetic operations with animations
 */

import { MathStep, VisualStepData, HighlightData, CarryData, BorrowData, Token } from './types';
import { parseExpression } from './parser';

/**
 * Generates steps for addition with carries
 */
function generateAdditionSteps(left: number, right: number): MathStep[] {
  const steps: MathStep[] = [];
  const leftStr = left.toString();
  const rightStr = right.toString();
  const maxLength = Math.max(leftStr.length, rightStr.length);
  
  // Step 1: Align numbers
  const paddedLeft = leftStr.padStart(maxLength, ' ');
  const paddedRight = rightStr.padStart(maxLength, ' ');
  const line = '-'.repeat(maxLength + 1);
  
  steps.push({
    stepNumber: 1,
    description: 'Align the numbers vertically',
    operation: 'addition',
    operands: { left, right },
    result: left + right,
    visualData: {
      type: 'column',
      layout: {
        rows: [paddedLeft, `+${paddedRight}`, line]
      }
    },
    explanation: 'Write the numbers one above the other, aligning the digits by place value.'
  });
  
  // Step 2: Add column by column with carries
  let result = '';
  let carry = 0;
  const carries: CarryData[] = [];
  
  for (let i = maxLength - 1; i >= 0; i--) {
    const leftDigit = parseInt(leftStr[leftStr.length - maxLength + i] || '0');
    const rightDigit = parseInt(rightStr[rightStr.length - maxLength + i] || '0');
    const sum = leftDigit + rightDigit + carry;
    
    const digit = sum % 10;
    carry = Math.floor(sum / 10);
    
    if (carry > 0 && i > 0) {
      carries.push({
        fromColumn: i,
        toColumn: i - 1,
        value: carry,
        description: `Carry ${carry} to the next column`
      });
    }
    
    result = digit.toString() + result;
    
    // Create partial result display
    const partialResult = result.padStart(maxLength, ' ');
    const highlights: HighlightData[] = [
      {
        row: 0,
        column: i,
        color: 'bg-blue-200',
        description: `Add ${leftDigit} + ${rightDigit}${carry > 0 ? ` + ${carry}` : ''} = ${sum}`
      },
      {
        row: 1,
        column: i,
        color: 'bg-blue-200',
        description: ''
      },
      {
        row: 2,
        column: i,
        color: 'bg-green-200',
        description: `Write ${digit}${carry > 0 ? `, carry ${carry}` : ''}`
      }
    ];
    
    steps.push({
      stepNumber: steps.length + 1,
      description: `Add the ${['ones', 'tens', 'hundreds', 'thousands'][maxLength - 1 - i]} column`,
      operation: 'addition',
      operands: { left, right },
      result: left + right,
      visualData: {
        type: 'column',
        layout: {
          rows: [paddedLeft, `+${paddedRight}`, line, partialResult],
          highlights,
          carries: carries.filter(c => c.fromColumn === i)
        }
      },
      explanation: `${leftDigit} + ${rightDigit}${carry > 0 ? ` + ${carry} (carry)` : ''} = ${sum}. Write ${digit}${carry > 0 ? ` and carry ${carry}` : ''}.`
    });
  }
  
  // Final step: Show complete result
  steps.push({
    stepNumber: steps.length + 1,
    description: 'Final answer',
    operation: 'addition',
    operands: { left, right },
    result: left + right,
    visualData: {
      type: 'column',
      layout: {
        rows: [paddedLeft, `+${paddedRight}`, line, result]
      }
    },
    explanation: `The final answer is ${left + right}.`
  });
  
  return steps;
}

/**
 * Generates steps for subtraction with borrowing
 */
function generateSubtractionSteps(left: number, right: number): MathStep[] {
  const steps: MathStep[] = [];
  const leftStr = left.toString();
  const rightStr = right.toString();
  const maxLength = Math.max(leftStr.length, rightStr.length);
  
  // Step 1: Align numbers
  const paddedLeft = leftStr.padStart(maxLength, ' ');
  const paddedRight = rightStr.padStart(maxLength, ' ');
  const line = '-'.repeat(maxLength + 1);
  
  steps.push({
    stepNumber: 1,
    description: 'Align the numbers vertically',
    operation: 'subtraction',
    operands: { left, right },
    result: left - right,
    visualData: {
      type: 'column',
      layout: {
        rows: [paddedLeft, `-${paddedRight}`, line]
      }
    },
    explanation: 'Write the numbers one above the other, aligning the digits by place value.'
  });
  
  // Step 2: Subtract column by column with borrowing
  let result = '';
  let borrow = 0;
  const borrows: BorrowData[] = [];
  
  for (let i = maxLength - 1; i >= 0; i--) {
    const leftDigit = parseInt(leftStr[leftStr.length - maxLength + i] || '0');
    const rightDigit = parseInt(rightStr[rightStr.length - maxLength + i] || '0');
    
    let topDigit = leftDigit - borrow;
    borrow = 0;
    
    if (topDigit < rightDigit) {
      topDigit += 10;
      borrow = 1;
      borrows.push({
        fromColumn: i - 1,
        toColumn: i,
        value: 1,
        description: `Borrow 1 from the next column`
      });
    }
    
    const digit = topDigit - rightDigit;
    result = digit.toString() + result;
    
    // Create partial result display
    const partialResult = result.padStart(maxLength, ' ');
    const highlights: HighlightData[] = [
      {
        row: 0,
        column: i,
        color: 'bg-blue-200',
        description: `${topDigit} - ${rightDigit} = ${digit}`
      },
      {
        row: 1,
        column: i,
        color: 'bg-blue-200',
        description: ''
      },
      {
        row: 2,
        column: i,
        color: 'bg-green-200',
        description: `Write ${digit}`
      }
    ];
    
    steps.push({
      stepNumber: steps.length + 1,
      description: `Subtract the ${['ones', 'tens', 'hundreds', 'thousands'][maxLength - 1 - i]} column`,
      operation: 'subtraction',
      operands: { left, right },
      result: left - right,
      visualData: {
        type: 'column',
        layout: {
          rows: [paddedLeft, `-${paddedRight}`, line, partialResult],
          highlights,
          borrows: borrows.filter(b => b.toColumn === i)
        }
      },
      explanation: `${topDigit} - ${rightDigit} = ${digit}${borrow > 0 ? ' (borrowed 1)' : ''}.`
    });
  }
  
  // Final step: Show complete result
  steps.push({
    stepNumber: steps.length + 1,
    description: 'Final answer',
    operation: 'subtraction',
    operands: { left, right },
    result: left - right,
    visualData: {
      type: 'column',
      layout: {
        rows: [paddedLeft, `-${paddedRight}`, line, result]
      }
    },
    explanation: `The final answer is ${left - right}.`
  });
  
  return steps;
}

/**
 * Generates steps for multiplication with partial products
 */
function generateMultiplicationSteps(left: number, right: number): MathStep[] {
  const steps: MathStep[] = [];
  const leftStr = left.toString();
  const rightStr = right.toString();
  
  // Step 1: Align numbers
  steps.push({
    stepNumber: 1,
    description: 'Align the numbers vertically',
    operation: 'multiplication',
    operands: { left, right },
    result: left * right,
    visualData: {
      type: 'column',
      layout: {
        rows: [leftStr, `×${rightStr}`, '-'.repeat(Math.max(leftStr.length, rightStr.length) + 1)]
      }
    },
    explanation: 'Write the numbers one above the other.'
  });
  
  // Step 2: Multiply by each digit
  const partialProducts: number[] = [];
  let stepNumber = 2;
  
  for (let i = rightStr.length - 1; i >= 0; i--) {
    const digit = parseInt(rightStr[i]);
    const partialProduct = left * digit;
    partialProducts.push(partialProduct);
    
    const highlights: HighlightData[] = [
      {
        row: 1,
        column: i,
        color: 'bg-blue-200',
        description: `Multiply by ${digit}`
      }
    ];
    
    steps.push({
      stepNumber,
      description: `Multiply ${left} by ${digit}`,
      operation: 'multiplication',
      operands: { left, right },
      result: left * right,
      visualData: {
        type: 'grid',
        layout: {
          rows: [leftStr, `×${rightStr}`, '-'.repeat(Math.max(leftStr.length, rightStr.length) + 1), partialProduct.toString()],
          highlights
        }
      },
      explanation: `${left} × ${digit} = ${partialProduct}`
    });
    
    stepNumber++;
  }
  
  // Step 3: Add partial products
  let sum = 0;
  for (let i = 0; i < partialProducts.length; i++) {
    sum += partialProducts[i] * Math.pow(10, partialProducts.length - 1 - i);
  }
  
  steps.push({
    stepNumber,
    description: 'Add the partial products',
    operation: 'multiplication',
    operands: { left, right },
    result: left * right,
    visualData: {
      type: 'grid',
      layout: {
        rows: [
          leftStr,
          `×${rightStr}`,
          '-'.repeat(Math.max(leftStr.length, rightStr.length) + 1),
          ...partialProducts.map(p => p.toString()),
          '-'.repeat(Math.max(leftStr.length, rightStr.length) + 1),
          sum.toString()
        ]
      }
    },
    explanation: `Add all partial products: ${partialProducts.join(' + ')} = ${sum}`
  });
  
  return steps;
}

/**
 * Generates steps for long division
 */
function generateDivisionSteps(dividend: number, divisor: number): MathStep[] {
  const steps: MathStep[] = [];
  
  // Step 1: Set up long division
  steps.push({
    stepNumber: 1,
    description: 'Set up long division',
    operation: 'division',
    operands: { left: dividend, right: divisor },
    result: dividend / divisor,
    visualData: {
      type: 'long-division',
      layout: {
        rows: [`${divisor})${dividend}`]
      }
    },
    explanation: `We need to divide ${dividend} by ${divisor}.`
  });
  
  // Step 2: Long division steps
  let quotient = '';
  let remainder = 0;
  const dividendStr = dividend.toString();
  
  for (let i = 0; i < dividendStr.length; i++) {
    remainder = remainder * 10 + parseInt(dividendStr[i]);
    
    if (remainder >= divisor) {
      const digit = Math.floor(remainder / divisor);
      quotient += digit.toString();
      remainder = remainder % divisor;
      
      steps.push({
        stepNumber: steps.length + 1,
        description: `Divide ${remainder * 10 + parseInt(dividendStr[i])} by ${divisor}`,
        operation: 'division',
        operands: { left: dividend, right: divisor },
        result: dividend / divisor,
        visualData: {
          type: 'long-division',
          layout: {
            rows: [
              `${divisor})${dividend}`,
              quotient,
              `${remainder}`
            ]
          }
        },
        explanation: `${remainder * 10 + parseInt(dividendStr[i])} ÷ ${divisor} = ${digit} remainder ${remainder}`
      });
    } else {
      quotient += '0';
    }
  }
  
  // Final step: Show result with decimals
  const finalResult = parseFloat((dividend / divisor).toFixed(2));
  steps.push({
    stepNumber: steps.length + 1,
    description: 'Final answer',
    operation: 'division',
    operands: { left: dividend, right: divisor },
    result: finalResult,
    visualData: {
      type: 'long-division',
      layout: {
        rows: [
          `${divisor})${dividend}`,
          finalResult.toString()
        ]
      }
    },
    explanation: `The final answer is ${finalResult}.`
  });
  
  return steps;
}

/**
 * Generates steps for percentage calculation
 */
function generatePercentageSteps(left: number, right: number): MathStep[] {
  const steps: MathStep[] = [];
  
  steps.push({
    stepNumber: 1,
    description: 'Convert percentage to decimal',
    operation: 'percentage',
    operands: { left, right },
    result: left * (right / 100),
    visualData: {
      type: 'percentage',
      layout: {
        rows: [`${left} × ${right}%`, `${left} × ${right/100}`, `${left * (right/100)}`]
      }
    },
    explanation: `Convert ${right}% to decimal: ${right}% = ${right/100}`
  });
  
  steps.push({
    stepNumber: 2,
    description: 'Multiply',
    operation: 'percentage',
    operands: { left, right },
    result: left * (right / 100),
    visualData: {
      type: 'percentage',
      layout: {
        rows: [`${left} × ${right/100}`, `${left * (right/100)}`]
      }
    },
    explanation: `${left} × ${right/100} = ${left * (right/100)}`
  });
  
  return steps;
}

/**
 * Generates steps for unary minus
 */
function generateUnaryMinusSteps(value: number): MathStep[] {
  return [{
    stepNumber: 1,
    description: 'Apply negative sign',
    operation: 'unary',
    operands: { left: value },
    result: -value,
    visualData: {
      type: 'unary',
      layout: {
        rows: [`-${value}`, `${-value}`]
      }
    },
    explanation: `The negative of ${value} is ${-value}.`
  }];
}

/**
 * Main function to generate steps for any expression
 */
export function generateSteps(expression: string): MathStep[] {
  const parsed = parseExpression(expression);
  
  if (!parsed.isValid) {
    throw new Error(parsed.error || 'Invalid expression');
  }
  
  // For simple expressions, generate appropriate steps
  const tokens = parsed.tokens;
  
  // Find the main operation
  const operatorToken = tokens.find(t => t.type === 'OPERATOR');
  const unaryToken = tokens.find(t => t.type === 'UNARY_MINUS');
  
  if (!operatorToken && unaryToken) {
    // Unary minus
    const numberToken = tokens.find(t => t.type === 'NUMBER');
    if (numberToken) {
      return generateUnaryMinusSteps(parseFloat(numberToken.value));
    }
  }
  
  if (!operatorToken) {
    // Single number
    const numberToken = tokens.find(t => t.type === 'NUMBER');
    return [{
      stepNumber: 1,
      description: 'Single number',
      operation: 'addition',
      operands: { left: parseFloat(numberToken?.value || '0') },
      result: parseFloat(numberToken?.value || '0'),
      visualData: {
        type: 'column',
        layout: {
          rows: [numberToken?.value || '0']
        }
      },
      explanation: `The number is ${numberToken?.value || '0'}.`
    }];
  }
  
  // Extract operands
  const leftToken = tokens[tokens.indexOf(operatorToken) - 1];
  const rightToken = tokens[tokens.indexOf(operatorToken) + 1];
  
  if (!leftToken || !rightToken || leftToken.type !== 'NUMBER' || rightToken.type !== 'NUMBER') {
    throw new Error('Invalid expression format');
  }
  
  const left = parseFloat(leftToken.value);
  const right = parseFloat(rightToken.value);
  
  switch (operatorToken.value) {
    case '+':
      return generateAdditionSteps(left, right);
    case '-':
      return generateSubtractionSteps(left, right);
    case '×':
    case '*':
      return generateMultiplicationSteps(left, right);
    case '÷':
    case '/':
      return generateDivisionSteps(left, right);
    case '%':
      return generatePercentageSteps(left, right);
    default:
      throw new Error(`Unsupported operation: ${operatorToken.value}`);
  }
}
