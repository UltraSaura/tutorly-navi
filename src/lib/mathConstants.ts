/**
 * Mathematical snippets and constants for MathLive integration
 */

export const MATH_SNIPPETS = {
  frac: '\\frac{\\placeholder{}}{\\placeholder{}}',
  sqrt: '\\sqrt{\\placeholder{}}',
  nroot: '\\sqrt[\\placeholder{}]{\\placeholder{}}',
  ln: '\\ln\\left(\\placeholder{}\\right)',
  log: '\\log\\left(\\placeholder{}\\right)',
  sin: '\\sin\\left(\\placeholder{}\\right)',
  cos: '\\cos\\left(\\placeholder{}\\right)',
  tan: '\\tan\\left(\\placeholder{}\\right)',
  parens: '\\left(\\placeholder{}\\right)',
  power: '^{\\placeholder{}}',
  hole: '\\placeholder{}'
} as const;

// Legacy format for backward compatibility with MathPad
export const MATH_PAD_SNIPPETS = {
  frac: '\\frac{}{}',
  sqrt: '\\sqrt{}',
  nroot: '\\sqrt[]{}',
  ln: '\\ln\\left(\\right)',
  log: '\\log\\left(\\right)',
  sin: '\\sin\\left(\\right)',
  cos: '\\cos\\left(\\right)',
  tan: '\\tan\\left(\\right)',
  parens: '\\left(\\right)',
  power: '^{}',
  hole: '\\placeholder{}'
} as const;

// Display labels for the snippets
export const SNIPPET_LABELS: Record<string, string> = {
  "\\div": "÷",
  "\\times": "×", 
  "\\frac{}{}": "a⁄b",
  "\\sqrt{}": "√",
  "^{}": "x^n",
  "\\ln\\left(\\right)": "ln( )",
  "\\log\\left(\\right)": "log( )",
  "\\sin\\left(\\right)": "sin( )",
  "\\cos\\left(\\right)": "cos( )",
  "\\tan\\left(\\right)": "tan( )",
  "\\left(\\right)": "(  )",
  "\\sqrt[]{}": "ⁿ√"
};

// Base calculator keys
export const BASE_KEYS = [
  ["7", "8", "9", "\\div"],
  ["4", "5", "6", "\\times"],
  ["1", "2", "3", "-"],
  ["0", ".", "+", "("],
];

// Advanced function keys using the snippets
export const ADVANCED_KEYS = [
  [MATH_PAD_SNIPPETS.frac, MATH_PAD_SNIPPETS.sqrt, MATH_PAD_SNIPPETS.power, MATH_PAD_SNIPPETS.parens],
  [MATH_PAD_SNIPPETS.ln, MATH_PAD_SNIPPETS.log, "\\pi", "e"],
  [MATH_PAD_SNIPPETS.sin, MATH_PAD_SNIPPETS.cos, MATH_PAD_SNIPPETS.tan, MATH_PAD_SNIPPETS.nroot],
]; 