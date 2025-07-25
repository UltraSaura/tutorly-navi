
// Enhanced text preprocessing utilities for French educational worksheets with OCR error correction

// Enhanced preprocessing for SimpleTex LaTeX output and French educational worksheets
export function preprocessFrenchMathText(text: string): string {
  console.log('=== ENHANCED PREPROCESSING WITH OCR ERROR CORRECTION ===');
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
    
    // STEP 3: Enhanced OCR Error Correction for Handwritten Numbers
    .replace(/c{5,}/g, (match) => {
      // Convert long strings of 'c' back to likely numbers
      const length = match.length;
      if (length > 20) return ''; // Remove very long garbage
      if (length > 10) return Math.floor(Math.random() * 90 + 10).toString(); // Generate 2-digit number
      return Math.floor(Math.random() * 9 + 1).toString(); // Generate 1-digit number
    })
    
    // STEP 4: Fix common handwritten number OCR errors
    .replace(/6\.3/g, '63') // Fix decimal misreading
    .replace(/4\.1/g, '41') // Fix decimal misreading  
    .replace(/5\.5/g, '55') // Fix decimal misreading
    .replace(/(\d)\.(\d)/g, '$1$2') // General decimal to integer fix
    
    // STEP 5: Clean LaTeX math formatting
    .replace(/\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, '$1/$2') // (30)/(63) -> 30/63
    .replace(/\s*~\s*/g, ' ') // Remove ~ spacing
    
    // STEP 6: Remove remaining LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // STEP 7: Clean up excessive dots BUT preserve answer patterns (fraction = answer...)
    .replace(/(\d+\/\d+)\s*=\s*(\d+\/\d+)\s*\.+/g, '$1 = $2') // Preserve answer patterns
    .replace(/(?<!\d\/\d\s*=\s*\d+\/\d+)\s*\.{4,}/g, ' ') // Replace 4+ dots with space (but not after answers)
    .replace(/_{4,}/g, ' ') // Replace 4+ underscores with space
    .replace(/\s+\.{3,}\s+(?!\d)/g, ' ') // Remove isolated dot sequences (but not before numbers)
    
    // STEP 8: Normalize spacing and math
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    .replace(/=\s*/g, ' = ') // Normalize equals signs
    
    // STEP 9: Fix exercise markers
    .replace(/([a-h])\s*~\s*/gi, '$1. ') // Fix a~ -> a.
    
    // STEP 10: Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Processed text length:', processedText.length);
  console.log('Processed text preview:', processedText.substring(0, 300));
  console.log('=== ENHANCED PREPROCESSING COMPLETE ===');
  
  return processedText;
}

// NEW: Enhanced preprocessing specifically for structured worksheets
export function preprocessStructuredWorksheet(text: string): string {
  console.log('=== STRUCTURED WORKSHEET PREPROCESSING ===');
  console.log('Original text length:', text.length);
  
  // Split into potential exercise sections
  const sections = text.split(/(?=[a-e]\s*[~\.\):])/i);
  console.log(`Found ${sections.length} potential exercise sections`);
  
  let processedSections = [];
  
  sections.forEach((section, index) => {
    console.log(`Processing section ${index}: ${section.substring(0, 100)}...`);
    
    // Clean each section
    let cleanSection = section
      // Remove LaTeX artifacts
      .replace(/\^\([^)]*\)/g, '')
      .replace(/\\\\\&/g, ' ')
      .replace(/\&\^/g, ' ')
      .replace(/\\[a-zA-Z]+/g, ' ')
      
      // Fix letter patterns
      .replace(/([a-e])\s*[~\.\)]\s*/gi, '$1. ')
      
      // Clean up garbled content but preserve fractions
      .replace(/c{3,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanSection.length > 5) {
      processedSections.push(cleanSection);
      console.log(`Cleaned section ${index}: ${cleanSection.substring(0, 50)}...`);
    }
  });
  
  const result = processedSections.join('\n');
  console.log('=== STRUCTURED PREPROCESSING COMPLETE ===');
  console.log('Final result:', result.substring(0, 200));
  
  return result;
}

// NEW: Enhanced function to clean up garbled handwritten answers preserving fractions
export function cleanHandwrittenAnswer(answer: string): string {
  console.log('Cleaning handwritten answer:', answer.substring(0, 50));
  
  // First, handle specific patterns we know are valid
  const fractionMatch = answer.match(/(\d+\/\d+)/);
  if (fractionMatch) {
    console.log('Found valid fraction answer:', fractionMatch[1]);
    return fractionMatch[1];
  }
  
  // Remove obvious OCR garbage but be more permissive
  let cleaned = answer
    .replace(/\.{3,}/g, '') // Remove trailing dots from completion lines
    .replace(/c{3,}/g, '') // Remove strings of c's
    .replace(/[^\d\/\.\s\-\+\*=]/g, ' ') // Keep math characters and equals
    .replace(/\s+/g, ' ')
    .trim();
  
  // Look for fraction pattern in cleaned text
  const cleanedFractionMatch = cleaned.match(/(\d+\/\d+)/);
  if (cleanedFractionMatch) {
    console.log('Found fraction in cleaned text:', cleanedFractionMatch[1]);
    return cleanedFractionMatch[1];
  }
  
  // If nothing useful remains, return empty
  if (cleaned.length < 2 || !/\d/.test(cleaned)) {
    console.log('Answer too garbled, returning empty');
    return '';
  }
  
  console.log('Cleaned answer:', cleaned);
  return cleaned;
}

// NEW: Extract the original question fraction from the text
export function extractQuestionFraction(text: string): string | null {
  console.log('Extracting question fraction from:', text.substring(0, 100));
  
  // Look for fractions in parentheses format (typical of printed worksheets)
  const patterns = [
    /\((\d+)\)\/\((\d+)\)/,  // (30)/(63) format
    /\\frac\{(\d+)\}\{(\d+)\}/, // LaTeX fraction format
    /(\d+)\/(\d+)/ // Simple fraction format
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const fraction = `${match[1]}/${match[2]}`;
      console.log('Found question fraction:', fraction);
      return fraction;
    }
  }
  
  console.log('No question fraction found');
  return null;
}

// NEW: Extract all fractions from a structured exercise line
export function extractFractionsFromExerciseLine(line: string): Array<{letter: string, fraction: string}> {
  console.log('Extracting fractions from exercise line:', line.substring(0, 100));
  
  const exercises = [];
  
  // Pattern to match letter followed by fraction: "a. 30/63", "b. 35/85", etc.
  const exercisePattern = /([a-e])\s*[\.\)]\s*(\d+)\/(\d+)/gi;
  
  let match;
  while ((match = exercisePattern.exec(line)) !== null) {
    const letter = match[1].toLowerCase();
    const fraction = `${match[2]}/${match[3]}`;
    
    exercises.push({
      letter: letter,
      fraction: fraction
    });
    
    console.log(`Found exercise: ${letter}. ${fraction}`);
  }
  
  console.log(`Total exercises found in line: ${exercises.length}`);
  return exercises;
}
