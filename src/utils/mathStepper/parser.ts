/**
 * Math Expression Parser with Tokenizer and Shunting-Yard Algorithm
 * Supports: +, -, ×, ÷, /, %, parentheses, unary minus, decimals
 */

import { Token, TokenType, ParsedExpression } from './types';

const OPERATORS = {
  '+': { precedence: 1, associativity: 'left' },
  '-': { precedence: 1, associativity: 'left' },
  '×': { precedence: 2, associativity: 'left' },
  '*': { precedence: 2, associativity: 'left' },
  '÷': { precedence: 2, associativity: 'left' },
  '/': { precedence: 2, associativity: 'left' },
  '%': { precedence: 3, associativity: 'left' },
};

/**
 * Tokenizes a math expression into tokens
 */
export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expression.length) {
    const char = expression[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/\d/.test(char)) {
      let number = '';
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        number += expression[i];
        i++;
      }
      tokens.push({
        type: 'NUMBER',
        value: number,
        position: i - number.length
      });
      continue;
    }
    
    // Operators
    if (char in OPERATORS) {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        position: i
      });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({
        type: 'PARENTHESIS',
        value: char,
        position: i
      });
      i++;
      continue;
    }
    
    // Unary minus detection
    if (char === '-') {
      const prevToken = tokens[tokens.length - 1];
      const isUnary = !prevToken || 
        prevToken.type === 'OPERATOR' || 
        (prevToken.type === 'PARENTHESIS' && prevToken.value === '(');
      
      tokens.push({
        type: isUnary ? 'UNARY_MINUS' : 'OPERATOR',
        value: char,
        position: i
      });
      i++;
      continue;
    }
    
    // Invalid character
    throw new Error(`Invalid character '${char}' at position ${i}`);
  }
  
  return tokens;
}

/**
 * Converts infix expression to postfix using Shunting-Yard algorithm
 */
export function infixToPostfix(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];
  
  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      output.push(token);
    } else if (token.type === 'UNARY_MINUS') {
      operators.push(token);
    } else if (token.type === 'OPERATOR') {
      while (
        operators.length > 0 &&
        operators[operators.length - 1].type !== 'PARENTHESIS' &&
        (
          OPERATORS[operators[operators.length - 1].value as keyof typeof OPERATORS].precedence > OPERATORS[token.value as keyof typeof OPERATORS].precedence ||
          (
            OPERATORS[operators[operators.length - 1].value as keyof typeof OPERATORS].precedence === OPERATORS[token.value as keyof typeof OPERATORS].precedence &&
            OPERATORS[token.value as keyof typeof OPERATORS].associativity === 'left'
          )
        )
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    } else if (token.value === '(') {
      operators.push(token);
    } else if (token.value === ')') {
      while (operators.length > 0 && operators[operators.length - 1].value !== '(') {
        output.push(operators.pop()!);
      }
      if (operators.length === 0) {
        throw new Error('Mismatched parentheses');
      }
      operators.pop(); // Remove '('
    }
  }
  
  while (operators.length > 0) {
    const op = operators.pop()!;
    if (op.value === '(' || op.value === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }
  
  return output;
}

/**
 * Evaluates a postfix expression
 */
export function evaluatePostfix(postfixTokens: Token[]): number {
  const stack: number[] = [];
  
  for (const token of postfixTokens) {
    if (token.type === 'NUMBER') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'UNARY_MINUS') {
      if (stack.length === 0) {
        throw new Error('Invalid unary minus');
      }
      stack.push(-stack.pop()!);
    } else if (token.type === 'OPERATOR') {
      if (stack.length < 2) {
        throw new Error('Invalid expression: insufficient operands');
      }
      
      const right = stack.pop()!;
      const left = stack.pop()!;
      
      let result: number;
      switch (token.value) {
        case '+':
          result = left + right;
          break;
        case '-':
          result = left - right;
          break;
        case '×':
        case '*':
          result = left * right;
          break;
        case '÷':
        case '/':
          if (right === 0) {
            throw new Error('Division by zero');
          }
          result = left / right;
          break;
        case '%':
          result = left * (right / 100);
          break;
        default:
          throw new Error(`Unknown operator: ${token.value}`);
      }
      
      stack.push(result);
    }
  }
  
  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }
  
  return stack[0];
}

/**
 * Normalizes an expression by converting ÷ to / and handling percentages
 */
export function normalizeExpression(expression: string): string {
  return expression
    .replace(/÷/g, '/')  // Convert ÷ to /
    .replace(/%/g, '/100'); // Convert % to /100
}

/**
 * Parses a math expression and returns tokens, validation, and result
 */
export function parseExpression(expression: string): ParsedExpression {
  try {
    // Normalize the expression
    const normalized = normalizeExpression(expression);
    
    // Validate basic syntax
    if (!normalized.trim()) {
      return {
        tokens: [],
        isValid: false,
        error: 'Empty expression'
      };
    }
    
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of normalized) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return {
          tokens: [],
          isValid: false,
          error: 'Mismatched parentheses'
        };
      }
    }
    if (parenCount !== 0) {
      return {
        tokens: [],
        isValid: false,
        error: 'Unclosed parentheses'
      };
    }
    
    // Tokenize
    const tokens = tokenize(normalized);
    
    // Convert to postfix
    const postfixTokens = infixToPostfix(tokens);
    
    // Evaluate
    const result = evaluatePostfix(postfixTokens);
    
    return {
      tokens,
      isValid: true,
      result: parseFloat(result.toFixed(2)) // Round to 2 decimals
    };
    
  } catch (error) {
    return {
      tokens: [],
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid expression'
    };
  }
}

/**
 * Extracts a math expression from text (e.g., from AI example)
 * Looks for patterns like "23 + 45 = 68" or "12 × 3" or multi-line column format
 */
export function extractExpressionFromText(text: string): string | null {
  // Pattern 1: "number operator number = result"
  const equationMatch = text.match(/(\d+(?:\.\d+)?)\s*([+\-×÷*/])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/);
  if (equationMatch) {
    return `${equationMatch[1]} ${equationMatch[2]} ${equationMatch[3]}`;
  }
  
  // Pattern 2: "number operator number" (without equals)
  const expressionMatch = text.match(/(\d+(?:\.\d+)?)\s*([+\-×÷*/])\s*(\d+(?:\.\d+)?)/);
  if (expressionMatch) {
    return `${expressionMatch[1]} ${expressionMatch[2]} ${expressionMatch[3]}`;
  }
  
  // Pattern 3: Multi-line column format
  // Matches patterns like:
  // 2345
  // + 1789
  // ------
  // 4134
  const columnMatch = text.match(/(\d+(?:\.\d+)?)\s*\n\s*([+\-×÷*/])\s*(\d+(?:\.\d+)?)\s*\n/);
  if (columnMatch) {
    return `${columnMatch[1]} ${columnMatch[2]} ${columnMatch[3]}`;
  }
  
  // Pattern 4: Multi-line column format with different spacing
  // Matches patterns like:
  // 2345
  // +1789
  // ------
  const columnMatch2 = text.match(/(\d+(?:\.\d+)?)\s*\n\s*([+\-×÷*/])(\d+(?:\.\d+)?)\s*\n/);
  if (columnMatch2) {
    return `${columnMatch2[1]} ${columnMatch2[2]} ${columnMatch2[3]}`;
  }
  
  // Pattern 5: More complex expressions with parentheses
  const complexMatch = text.match(/\([^)]+\)\s*[+\-×÷*/]\s*\d+|\([^)]+\)\s*[+\-×÷*/]\s*\([^)]+\)/);
  if (complexMatch) {
    return complexMatch[0];
  }
  
  return null;
}
