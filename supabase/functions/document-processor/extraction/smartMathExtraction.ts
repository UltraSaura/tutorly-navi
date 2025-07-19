
// Enhanced mathematical exercise extraction with direct LaTeX processing

import { preprocessFrenchMathText } from './textPreprocessing.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== DEFINITIVE MULTI-EXERCISE EXTRACTION ===');
  console.log('Raw text length:', rawText.length);
  console.log('Raw text preview:', rawText.substring(0, 300));
  
  // Skip extraction if this looks like an error message
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error/emergency text, skipping exercise extraction');
    return [];
  }
  
  // PHASE 1: Direct LaTeX fraction extraction from SimpleTex output
  console.log('🔍 PHASE 1: Direct LaTeX fraction extraction');
  const latexFractions = extractFractionsFromLatex(rawText);
  
  if (latexFractions.length > 0) {
    console.log(`✅ Found ${latexFractions.length} fractions in LaTeX format, creating exercises`);
    return createExercisesFromFractions(latexFractions);
  }
  
  // PHASE 2: Comprehensive raw text fraction scanning
  console.log('🔍 PHASE 2: Comprehensive raw text fraction scanning');
  const allFractions = extractAllFractionsFromRawText(rawText);
  
  if (allFractions.length > 0) {
    console.log(`✅ Found ${allFractions.length} fractions in raw text, creating exercises`);
    return createExercisesFromFractions(allFractions);
  }
  
  // PHASE 3: Try LaTeX-aware extraction (for other formats)
  console.log('🔍 PHASE 3: LaTeX-aware extraction fallback');
  const latexExercises = extractFromLatexText(rawText);
  if (latexExercises.length > 0) {
    console.log(`✅ Found ${latexExercises.length} exercises using LaTeX extraction`);
    return latexExercises;
  }
  
  console.log('No exercises found in any extraction phase');
  return [];
}

// NEW: Direct LaTeX fraction extraction specifically for SimpleTex output
function extractFractionsFromLatex(text: string): string[] {
  console.log('Extracting fractions directly from LaTeX format...');
  
  const fractions = [];
  
  // Comprehensive LaTeX fraction patterns
  const latexPatterns = [
    /\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g, // \frac{30}{63}
    /\\mathrm\{[^}]*\}\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g, // \mathrm{a~}\frac{30}{63}
    /\\\([^)]*\\frac\{(\d{1,3})\}\{(\d{1,3})\}[^)]*\\\)/g, // LaTeX inline fractions
  ];
  
  // Also look for parenthesized fractions in arrays
  const arrayPatterns = [
    /\((\d{1,3})\)\/\((\d{1,3})\)/g, // (30)/(63) in arrays
    /(\d{1,3})\/(\d{1,3})/g, // Simple fractions
  ];
  
  const allPatterns = [...latexPatterns, ...arrayPatterns];
  
  for (const pattern of allPatterns) {
    console.log(`Testing LaTeX pattern: ${pattern.source}`);
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      let numerator, denominator;
      
      // Handle different capture group positions
      if (match[1] && match[2]) {
        numerator = parseInt(match[1]);
        denominator = parseInt(match[2]);
      } else if (match[3] && match[4]) {
        numerator = parseInt(match[3]);
        denominator = parseInt(match[4]);
      }
      
      if (numerator && denominator && numerator > 0 && denominator > 0 && 
          numerator < 1000 && denominator > 1) {
        const fraction = `${numerator}/${denominator}`;
        
        if (!fractions.includes(fraction)) {
          fractions.push(fraction);
          console.log(`✅ Found LaTeX fraction: ${fraction} at position ${match.index}`);
        }
      }
    }
  }
  
  console.log(`Total LaTeX fractions found: ${fractions.length}`, fractions);
  return fractions;
}

// Enhanced fraction extraction from raw text with more patterns
function extractAllFractionsFromRawText(text: string): string[] {
  console.log('Extracting ALL fractions from raw text...');
  
  const fractionPatterns = [
    /\(\s*(\d{1,3})\s*\)\s*\/\s*\(\s*(\d{1,3})\s*\)/g, // (30)/(63)
    /(\d{1,3})\s*\/\s*(\d{1,3})/g, // 30/63
    /\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g, // \frac{30}{63}
    /(\d{1,3})\s*÷\s*(\d{1,3})/g, // 30÷63
    /(\d{1,3})\s*:\s*(\d{1,3})/g, // 30:63 (ratio format)
  ];
  
  const allFractions = [];
  
  for (const pattern of fractionPatterns) {
    console.log(`Testing pattern: ${pattern.source}`);
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      const numerator = parseInt(match[1]);
      const denominator = parseInt(match[2]);
      
      // Validate fraction makes sense
      if (numerator > 0 && denominator > 0 && numerator < 1000 && denominator > 1) {
        const fraction = `${numerator}/${denominator}`;
        
        if (!allFractions.includes(fraction)) {
          allFractions.push(fraction);
          console.log(`✅ Found unique fraction: ${fraction} at position ${match.index}`);
        }
      }
    }
  }
  
  console.log(`Total unique fractions found: ${allFractions.length}`, allFractions);
  return allFractions;
}

// Create lettered exercises from fractions
function createExercisesFromFractions(fractions: string[]): Array<{ question: string, answer: string }> {
  console.log(`Creating ${fractions.length} exercises from fractions:`, fractions);
  
  const exercises = [];
  
  fractions.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, d, e, etc.
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created exercise ${index + 1}: ${exercise.question}`);
  });
  
  return exercises;
}

// Helper function to detect error/emergency text
function isErrorText(text: string): boolean {
  const errorIndicators = [
    'OCR extraction failed',
    'manual review required',
    'could not be processed automatically',
    'Document uploaded at',
    'Status: OCR extraction failed',
    'Try uploading again',
    'emergency text extraction'
  ];
  
  const lowerText = text.toLowerCase();
  const hasErrorIndicator = errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  const hasMathContent = /\d+\/\d+|\d+\.\d+|exercice|fraction/i.test(text);
  
  return hasErrorIndicator && !hasMathContent;
}

// Extract exercises from LaTeX-formatted text (fallback)
function extractFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('Attempting LaTeX-aware extraction fallback...');
  
  const exercises = [];
  
  // Apply preprocessing
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  
  // Find ALL fractions using the enhanced extraction
  const allFoundFractions = extractAllFractionsFromRawText(text); // Use raw text for better detection
  
  console.log(`LaTeX fallback found ${allFoundFractions.length} fractions:`, allFoundFractions);
  
  if (allFoundFractions.length > 0) {
    return createExercisesFromFractions(allFoundFractions);
  }
  
  console.log('No fractions found in LaTeX fallback extraction');
  return exercises;
}
