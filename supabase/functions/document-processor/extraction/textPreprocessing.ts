// Text preprocessing utilities for French educational worksheets

// Enhanced preprocessing for SimpleTex LaTeX output and French educational worksheets
export function preprocessFrenchMathText(text: string): string {
  console.log('=== PREPROCESSING FRENCH EDUCATIONAL TEXT ===');
  console.log('Original text length:', text.length);
  console.log('Original text preview:', text.substring(0, 300));
  
  let processedText = text
    // STEP 1: Clean up SimpleTex LaTeX format specifically
    .replace(/\^\([^)]*\)/g, '') // Remove ^(aligned), ^(array), etc.
    .replace(/\\\\\&/g, ' ') // Convert \\& to space
    .replace(/\\\\/g, ' ') // Convert \\ to space
    .replace(/\&\^/g, ' ') // Remove &^ connectors
    .replace(/\^array/g, '') // Remove array commands
    .replace(/c{10,}/g, '') // Remove long strings of 'c' characters from arrays
    
    // STEP 2: Fix OCR errors in French text
    .replace(/ERERCIE/g, 'EXERCICE') // Fix "ERERCIE" -> "EXERCICE"
    .replace(/Simpliffer/g, 'Simplifier') // Fix "Simpliffer" -> "Simplifier"
    .replace(/fiactions/g, 'fractions') // Fix "fiactions" -> "fractions"
    .replace(/Simpliffes/g, 'Simplifiez') // Fix "Simpliffes" -> "Simplifiez"
    .replace(/criteres/g, 'critères') // Fix "criteres" -> "critères"
    
    // STEP 3: Clean LaTeX math formatting
    .replace(/\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, '$1/$2') // (30)/(63) -> 30/63
    .replace(/\s*~\s*/g, ' ') // Remove ~ spacing
    
    // STEP 4: Remove remaining LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // STEP 5: Clean up excessive dots from completion lines (but preserve fractions)
    .replace(/\.{4,}/g, ' ') // Replace 4+ dots with space
    .replace(/_{4,}/g, ' ') // Replace 4+ underscores with space
    .replace(/\s+\.{3,}\s+/g, ' ') // Remove isolated dot sequences
    
    // STEP 6: Normalize spacing and math
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    .replace(/=\s*/g, ' = ') // Normalize equals signs
    
    // STEP 7: Fix exercise markers
    .replace(/([a-h])\s*~\s*/gi, '$1. ') // Fix a~ -> a.
    
    // STEP 8: Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Processed text length:', processedText.length);
  console.log('Processed text preview:', processedText.substring(0, 300));
  console.log('=== PREPROCESSING COMPLETE ===');
  
  return processedText;
}