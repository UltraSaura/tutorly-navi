import { normalizeLatexForDisplay, isLatex, latexToPlainText } from './latexUtils';

export interface ProcessedMathContent {
  original: string;
  processed: string;
  isMath: boolean;
  displayFormat: 'latex' | 'html' | 'text';
}

/**
 * Comprehensive math content processor for display
 */
export const processMathContentForDisplay = (content: string): ProcessedMathContent => {
  console.log('[mathDisplayProcessor] Processing content:', content);
  
  // Check if content contains LaTeX
  if (isLatex(content)) {
    const normalized = normalizeLatexForDisplay(content);
    return {
      original: content,
      processed: normalized,
      isMath: true,
      displayFormat: 'latex'
    };
  }
  
  // Check if content contains mathematical patterns
  const mathPatterns = [
    /√\s*\(?\s*[0-9a-zA-Z]+\)?/g,  // Unicode square root (√9, √x, √(9))
    /sqrt\(\d+\)/g,
    /sqrt\d+/g,                      // sqrt without parentheses (sqrt9)
    /sin\(\d+\)/g,
    /cos\(\d+\)/g,
    /tan\(\d+\)/g,
    /log\(\d+\)/g,
    /ln\(\d+\)/g,
    /exp\(\d+\)/g,
    /abs\(\d+\)/g,
    /\d+\^\d+/g,
    /\d+\/\d+/g,
    /(\d+(?:\.\d+)?)pow(\d+(?:\.\d+)?)/g,  // 2pow2
    /(\d+(?:\.\d+)?)\s+pow\s+(\d+(?:\.\d+)?)/g,  // 2 pow 2
    /pow\([^,]+,\s*[^)]+\)/g,        // pow(2,3)
    /([a-zA-Z]+)\^(\d+)/g,           // x^2, y^3
    /[+\-*/=()^]/g,
    /\d+\.\d+/g
  ];
  
  const hasMathPattern = mathPatterns.some(pattern => pattern.test(content));
  
  if (hasMathPattern) {
    // Convert plain text math to LaTeX
    const latex = convertPlainTextToLatex(content);
    return {
      original: content,
      processed: latex,
      isMath: true,
      displayFormat: 'latex'
    };
  }
  
  return {
    original: content,
    processed: content,
    isMath: false,
    displayFormat: 'text'
  };
};

/**
 * Convert plain text mathematical expressions to LaTeX
 */
const convertPlainTextToLatex = (text: string): string => {
  return text
    // Convert Unicode square root symbols
    .replace(/√\s*\(?\s*([0-9a-zA-Z]+)\)?/g, '\\sqrt{$1}')
    
    // Convert power expressions (do these before other exponent rules)
    .replace(/(\d+(?:\.\d+)?)pow(\d+(?:\.\d+)?)/g, '$1^{$2}')  // 2pow2 → 2^{2}
    .replace(/(\d+(?:\.\d+)?)\s+pow\s+(\d+(?:\.\d+)?)/g, '$1^{$2}')  // 2 pow 2 → 2^{2}
    .replace(/pow\(([^,]+),\s*([^)]+)\)/g, '$1^{$2}')  // pow(2,3) → 2^{3}
    
    // Convert function calls
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/sqrt(\d+(?:\.\d+)?)/g, '\\sqrt{$1}')  // sqrt without parentheses
    .replace(/sin\((\d+(?:\.\d+)?)\)/g, '\\sin($1)')
    .replace(/cos\((\d+(?:\.\d+)?)\)/g, '\\cos($1)')
    .replace(/tan\((\d+(?:\.\d+)?)\)/g, '\\tan($1)')
    .replace(/log\((\d+(?:\.\d+)?)\)/g, '\\log($1)')
    .replace(/ln\((\d+(?:\.\d+)?)\)/g, '\\ln($1)')
    .replace(/exp\((\d+(?:\.\d+)?)\)/g, '\\exp($1)')
    .replace(/abs\((\d+(?:\.\d+)?)\)/g, '\\abs($1)')
    
    // Convert exponents (including variables like x^2)
    .replace(/([a-zA-Z]+)\^(\d+)/g, '$1^{$2}')  // x^2 → x^{2}
    .replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g, '$1^{$2}')  // 2^3 → 2^{3}
    
    // Convert fractions
    .replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, '\\frac{$1}{$2}')
    
    // Convert basic operations with proper spacing
    .replace(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/g, '$1 + $2')
    .replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g, '$1 - $2')
    .replace(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)/g, '$1 \\cdot $2')
    .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, '\\frac{$1}{$2}')
    
    // Handle complex expressions with parentheses
    .replace(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g, '$1 + $2 = $3')
    .replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g, '$1 - $2 = $3')
    .replace(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g, '$1 \\cdot $2 = $3')
    .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g, '\\frac{$1}{$2} = $3');
};