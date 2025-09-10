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
    
    // Handle sqrt without braces (MathLive format)
    .replace(/\\sqrt(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/\\sqrt([a-zA-Z])/g, 'sqrt($1)')
    
    // Handle other functions without braces (MathLive format)
    .replace(/\\sin(\d+(?:\.\d+)?)/g, 'sin($1)')
    .replace(/\\cos(\d+(?:\.\d+)?)/g, 'cos($1)')
    .replace(/\\tan(\d+(?:\.\d+)?)/g, 'tan($1)')
    .replace(/\\log(\d+(?:\.\d+)?)/g, 'log($1)')
    .replace(/\\ln(\d+(?:\.\d+)?)/g, 'ln($1)')
    .replace(/\\exp(\d+(?:\.\d+)?)/g, 'exp($1)')
    .replace(/\\abs(\d+(?:\.\d+)?)/g, 'abs($1)')
    
    // Handle Unicode square root symbol
    .replace(/√\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/√([0-9]+(?:\.[0-9]+)?)/g, 'sqrt($1)')
    .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
    // Handle direct Unicode square root without delimiters
    .replace(/√/g, 'sqrt')
    
    // Handle exponents
    .replace(/\^\{([^}]+)\}/g, '^$1')  // Convert ^{2} to ^2
    .replace(/\^([0-9]+)/g, '^$1')     // Keep ^2 as ^2
    .replace(/\^\(([^)]+)\)/g, '^$1')  // Convert ^(2) to ^2
    
    // Handle subscripts
    .replace(/_\{([^}]+)\}/g, '_$1')   // Convert _{2} to _2
    .replace(/_([0-9]+)/g, '_$1')      // Keep _2 as _2
    .replace(/_\(([^)]+)\)/g, '_$1')   // Convert _(2) to _2
    
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
    
    // Convert mathematical functions
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/cbrt\(([^)]+)\)/g, '\\sqrt[3]{$1}')
    .replace(/sin\(([^)]+)\)/g, '\\sin($1)')
    .replace(/cos\(([^)]+)\)/g, '\\cos($1)')
    .replace(/tan\(([^)]+)\)/g, '\\tan($1)')
    .replace(/log\(([^)]+)\)/g, '\\log($1)')
    .replace(/ln\(([^)]+)\)/g, '\\ln($1)')
    .replace(/exp\(([^)]+)\)/g, 'e^{$1}')
    
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
 * Normalize LaTeX for proper MathLive rendering
 */
export const normalizeLatexForDisplay = (latex: string): string => {
  return latex
    // Ensure sqrt has braces around argument
    .replace(/\\sqrt([a-zA-Z0-9]+)/g, (match, content) => {
      // If it's a number or variable without braces, add them
      if (/^[a-zA-Z0-9]+$/.test(content)) {
        return `\\sqrt{${content}}`;
      }
      return match;
    })

    // Ensure other functions have proper formatting
    .replace(/\\sin([a-zA-Z0-9]+)/g, '\\sin($1)')
    .replace(/\\cos([a-zA-Z0-9]+)/g, '\\cos($1)')
    .replace(/\\tan([a-zA-Z0-9]+)/g, '\\tan($1)')
    .replace(/\\log([a-zA-Z0-9]+)/g, '\\log($1)')
    .replace(/\\ln([a-zA-Z0-9]+)/g, '\\ln($1)')
    .replace(/\\exp([a-zA-Z0-9]+)/g, '\\exp($1)');
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