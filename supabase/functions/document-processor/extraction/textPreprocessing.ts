// Text preprocessing utilities for French educational worksheets

// Preprocessing pipeline specifically for French educational worksheets
export function preprocessFrenchMathText(text: string): string {
  console.log('Preprocessing French educational text...');
  
  return text
    // Clean up excessive dots from completion lines
    .replace(/\.{4,}/g, ' ') // Replace 4+ dots with space
    .replace(/_{4,}/g, ' ') // Replace 4+ underscores with space
    .replace(/\s+\.{3,}\s+/g, ' ') // Remove isolated dot sequences
    
    // Remove LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French
    .replace(/([a-zA-Z0-9])\s*,\s*/g, '$1. ')  // Fix a, -> a.
    .replace(/([a-zA-Z0-9])\s*\.\s*/g, '$1. ') // Normalize spacing
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    .replace(/=\s*/g, '= ')
    
    // AGGRESSIVE exercise separation - force line breaks between exercise markers
    .replace(/([a-h]\s*[\.\)])(\s*)([a-h]\s*[\.\)])/gi, '$1\n$3') // a. b. -> a.\nb.
    .replace(/(\d+\s*[\.\)])(\s*)(\d+\s*[\.\)])/g, '$1\n$3') // 1. 2. -> 1.\n2.
    .replace(/([IVX]+\s*\.)(\s*)([IVX]+\s*\.)/gi, '$1\n$3') // I. II. -> I.\nII.
    .replace(/(exercice\s*\d*)(\s*[:\.]?\s*)(exercice\s*\d*)/gi, '$1\n$3') // Exercice separation
    
    // Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}