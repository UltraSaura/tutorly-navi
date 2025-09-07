/**
 * Utility functions for LaTeX processing and conversion
 */

/**
 * Convert LaTeX expression to plain text for backend processing
 */
export const latexToPlainText = (latex: string): string => {
  return latex
    // Remove LaTeX delimiters
    .replace(/\$\$?/g, '')
    .replace(/\\[\(\)\[\]]/g, '')
    
    // Convert common LaTeX commands to plain text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$2^(1/$1)')
    .replace(/\^?\{([^}]+)\}/g, '^$1')
    .replace(/_?\{([^}]+)\}/g, '_$1')
    
    // Convert Greek letters
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    
    // Convert operators
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    
    // Convert special symbols
    .replace(/\\infty/g, '∞')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\approx/g, '≈')
    
    // Clean up extra spaces and formatting
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Convert plain text math to LaTeX
 */
export const plainTextToLatex = (text: string): string => {
  return text
    // Convert fractions
    .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
    
    // Convert powers
    .replace(/\^(\d+)/g, '^{$1}')
    .replace(/\^(\([^)]+\))/g, '^{$1}')
    
    // Convert subscripts
    .replace(/_(\d+)/g, '_{$1}')
    .replace(/_(\([^)]+\))/g, '_{$1}')
    
    // Convert sqrt
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    
    // Convert operators
    .replace(/\*/g, '\\cdot ')
    .replace(/>==/g, '\\geq ')
    .replace(/<=/g, '\\leq ')
    .replace(/!=/g, '\\neq ')
    .replace(/~=/g, '\\approx ')
    
    // Wrap in display math if it contains equations
    .replace(/^(.+=.+)$/g, '$$1$');
};

/**
 * Check if a string contains LaTeX syntax
 */
export const isLatex = (text: string): boolean => {
  return /\\[a-zA-Z]+/.test(text) || 
         /\$\$?/.test(text) || 
         /\\[\(\)\[\]]/.test(text) ||
         /\{[^}]*\}/.test(text);
};

/**
 * Normalize mathematical expression for comparison
 */
export const normalizeMathExpression = (expression: string): string => {
  // Convert LaTeX to plain text if needed
  const plainText = isLatex(expression) ? latexToPlainText(expression) : expression;
  
  return plainText
    // Normalize spaces
    .replace(/\s+/g, '')
    
    // Normalize fractions
    .replace(/(\d+)\/(\d+)/g, (match, num, den) => {
      const gcd = findGCD(parseInt(num), parseInt(den));
      return `${parseInt(num) / gcd}/${parseInt(den) / gcd}`;
    })
    
    // Normalize operators
    .replace(/\*/g, '·')
    .replace(/×/g, '·')
    
    // Convert to lowercase for comparison
    .toLowerCase();
};

/**
 * Helper function to find GCD
 */
const findGCD = (a: number, b: number): number => {
  return b === 0 ? Math.abs(a) : findGCD(b, a % b);
};