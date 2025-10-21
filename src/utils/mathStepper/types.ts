/**
 * TypeScript interfaces for the Interactive Math Stepper
 */

export type TokenType = 'NUMBER' | 'OPERATOR' | 'PARENTHESIS' | 'PERCENTAGE' | 'UNARY_MINUS';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ParsedExpression {
  tokens: Token[];
  isValid: boolean;
  error?: string;
  result?: number;
}

export interface MathStep {
  stepNumber: number;
  description: string;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'percentage' | 'unary' | 'parentheses';
  operands: {
    left: number;
    right?: number;
  };
  result: number;
  visualData: VisualStepData;
  explanation: string;
}

export interface VisualStepData {
  type: 'column' | 'grid' | 'long-division' | 'percentage' | 'unary' | 'parentheses';
  layout: {
    rows: string[];
    highlights?: HighlightData[];
    carries?: CarryData[];
    borrows?: BorrowData[];
  };
}

export interface HighlightData {
  row: number;
  column: number;
  color: string;
  description: string;
}

export interface CarryData {
  fromColumn: number;
  toColumn: number;
  value: number;
  description: string;
}

export interface BorrowData {
  fromColumn: number;
  toColumn: number;
  value: number;
  description: string;
}

export interface StepperState {
  currentStep: number;
  totalSteps: number;
  steps: MathStep[];
  isPlaying: boolean;
  showAnswer: boolean;
  error?: string;
}

export interface InteractiveMathStepperProps {
  expression: string;
  className?: string;
  autoPlay?: boolean;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
}

export interface OperationGridProps {
  visualData: VisualStepData;
  className?: string;
}

export interface StepDisplayProps {
  step: MathStep;
  isActive: boolean;
  className?: string;
}
