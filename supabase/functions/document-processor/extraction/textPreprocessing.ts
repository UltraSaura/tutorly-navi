// Text preprocessing utilities for French educational worksheets

// Preprocessing pipeline specifically for French educational worksheets
export function preprocessFrenchMathText(text: string): string {
  console.log('=== PREPROCESSING FRENCH EDUCATIONAL TEXT ===');
  console.log('Original text length:', text.length);
  console.log('Original text preview:', text.substring(0, 300));
  
  let processedText = text
    // Clean up excessive dots from completion lines (but preserve fractions)
    .replace(/\.{4,}/g, ' ') // Replace 4+ dots with space
    .replace(/_{4,}/g, ' ') // Replace 4+ underscores with space
    .replace(/\s+\.{3,}\s+/g, ' ') // Remove isolated dot sequences
    
    // Remove LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French - BUT BE MORE CAREFUL
    .replace(/([a-zA-Z0-9])\s*,\s*(?![0-9])/g, '$1. ')  // Fix a, -> a. but not in decimals
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    .replace(/=\s*/g, '= ')
    
    // LESS AGGRESSIVE exercise separation - preserve content better
    .replace(/([a-h])\s*\.\s*([^a-h\n]+?)\s+([a-h])\s*\./gi, '$1. $2\n$3.') // a. content b. -> a. content\nb.
    .replace(/(\d+)\s*\.\s*([^\d\n]+?)\s+(\d+)\s*\./gi, '$1. $2\n$3.') // 1. content 2. -> 1. content\n2.
    .replace(/([IVX]+)\s*\.\s*([^IVX\n]+?)\s+([IVX]+)\s*\./gi, '$1. $2\n$3.') // I. content II. -> I. content\nII.
    
    // Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Processed text length:', processedText.length);
  console.log('Processed text preview:', processedText.substring(0, 300));
  console.log('=== PREPROCESSING COMPLETE ===');
  
  return processedText;
}