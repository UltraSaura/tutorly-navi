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
    /\d+\^\d+/g,                     // Numeric exponents (2^3)
    /[a-zA-Z]+\^\d+/g,              // Variable exponents (x^2, y^3)
    /\d+[²³⁴⁵⁶⁷⁸⁹⁰¹]/g,           // Unicode superscripts (2², 3³)
    /[a-zA-Z]+[²³⁴⁵⁶⁷⁸⁹⁰¹]/g,     // Variable with Unicode superscripts (x², y³)
    /[₀₁₂₃₄₅₆₇₈₉]/g,              // Unicode subscripts (x₁, H₂O)
    /\d+\/\d+/g,
    /(\d+(?:\.\d+)?)pow(\d+(?:\.\d+)?)/g,  // 2pow2
    /(\d+(?:\.\d+)?)\s+pow\s+(\d+(?:\.\d+)?)/g,  // 2 pow 2
    /pow\([^,]+,\s*[^)]+\)/g,        // pow(2,3)
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
    
    // Convert Unicode superscripts to LaTeX (do this first)
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/⁴/g, '^{4}')
    .replace(/⁵/g, '^{5}')
    .replace(/⁶/g, '^{6}')
    .replace(/⁷/g, '^{7}')
    .replace(/⁸/g, '^{8}')
    .replace(/⁹/g, '^{9}')
    .replace(/⁰/g, '^{0}')
    .replace(/¹/g, '^{1}')
    
    // Convert Unicode subscripts to LaTeX
    .replace(/₀/g, '_{0}')
    .replace(/₁/g, '_{1}')
    .replace(/₂/g, '_{2}')
    .replace(/₃/g, '_{3}')
    .replace(/₄/g, '_{4}')
    .replace(/₅/g, '_{5}')
    .replace(/₆/g, '_{6}')
    .replace(/₇/g, '_{7}')
    .replace(/₈/g, '_{8}')
    .replace(/₉/g, '_{9}')
    
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