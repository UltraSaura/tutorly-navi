// Enhanced mathematical exercise extraction with comprehensive logging and multi-exercise support

import { preprocessFrenchMathText } from './textPreprocessing.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART MATH EXTRACTION START ===');
  console.log('Input text length:', rawText.length);
  console.log('Raw text preview (first 500 chars):', rawText.substring(0, 500));
  
  // Skip extraction if this looks like an error message
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error/emergency text, skipping exercise extraction');
    return [];
  }
  
  // PHASE 1: Direct LaTeX fraction extraction from SimpleTex output
  console.log('🔍 PHASE 1: Direct LaTeX fraction extraction');
  const latexFractions = extractFractionsFromLatex(rawText);
  console.log(`PHASE 1 RESULT: Found ${latexFractions.length} LaTeX fractions:`, latexFractions);
  
  if (latexFractions.length > 0) {
    console.log(`✅ Creating ${latexFractions.length} exercises from LaTeX fractions`);
    const exercises = createExercisesFromFractions(latexFractions);
    console.log(`PHASE 1 SUCCESS: Created ${exercises.length} exercises from LaTeX`);
    return exercises;
  }
  
  // PHASE 2: Comprehensive raw text fraction scanning
  console.log('🔍 PHASE 2: Comprehensive raw text fraction scanning');
  const allFractions = extractAllFractionsFromRawText(rawText);
  console.log(`PHASE 2 RESULT: Found ${allFractions.length} raw text fractions:`, allFractions);
  
  if (allFractions.length > 0) {
    console.log(`✅ Creating ${allFractions.length} exercises from raw text fractions`);
    const exercises = createExercisesFromFractions(allFractions);
    console.log(`PHASE 2 SUCCESS: Created ${exercises.length} exercises from raw text`);
    return exercises;
  }
  
  // PHASE 3: Try LaTeX-aware extraction (for other formats)
  console.log('🔍 PHASE 3: LaTeX-aware extraction fallback');
  const latexExercises = extractFromLatexText(rawText);
  console.log(`PHASE 3 RESULT: Found ${latexExercises.length} exercises using LaTeX extraction`);
  if (latexExercises.length > 0) {
    console.log(`PHASE 3 SUCCESS: Created ${latexExercises.length} exercises using LaTeX extraction`);
    return latexExercises;
  }
  
  console.log('❌ NO EXERCISES FOUND in any extraction phase');
  return [];
}

// Enhanced LaTeX fraction extraction with comprehensive logging
function extractFractionsFromLatex(text: string): string[] {
  console.log('--- LATEX FRACTION EXTRACTION START ---');
  console.log('Searching for LaTeX fractions in text...');
  
  const fractions = [];
  
  // Comprehensive LaTeX fraction patterns with detailed logging
  const latexPatterns = [
    { name: 'Standard \\frac{}{}', pattern: /\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g },
    { name: 'Mathrm with \\frac{}{}', pattern: /\\mathrm\{[^}]*\}\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g },
    { name: 'Inline LaTeX fractions', pattern: /\\\([^)]*\\frac\{(\d{1,3})\}\{(\d{1,3})\}[^)]*\\\)/g },
    { name: 'Array parenthesized fractions', pattern: /\((\d{1,3})\)\/\((\d{1,3})\)/g },
    { name: 'Simple fractions', pattern: /(\d{1,3})\/(\d{1,3})/g }
  ];
  
  for (const { name, pattern } of latexPatterns) {
    console.log(`Testing pattern: ${name} - ${pattern.source}`);
    
    // Reset regex lastIndex to ensure proper matching
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`Pattern "${name}" found ${matches.length} matches`);
    
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
          console.log(`✅ Added unique LaTeX fraction: ${fraction} (from pattern: ${name}) at position ${match.index}`);
        } else {
          console.log(`⚠️ Skipping duplicate fraction: ${fraction}`);
        }
      } else {
        console.log(`❌ Invalid fraction values: ${numerator}/${denominator}`);
      }
    }
  }
  
  console.log(`--- LATEX EXTRACTION COMPLETE: ${fractions.length} unique fractions ---`);
  fractions.forEach((frac, idx) => console.log(`Fraction ${idx + 1}: ${frac}`));
  return fractions;
}

// Enhanced raw text fraction extraction with comprehensive logging
function extractAllFractionsFromRawText(text: string): string[] {
  console.log('--- RAW TEXT FRACTION EXTRACTION START ---');
  console.log('Searching for fractions in raw text...');
  
  const fractionPatterns = [
    { name: 'Parenthesized fractions', pattern: /\(\s*(\d{1,3})\s*\)\s*\/\s*\(\s*(\d{1,3})\s*\)/g },
    { name: 'Simple fractions', pattern: /(\d{1,3})\s*\/\s*(\d{1,3})/g },
    { name: 'LaTeX \\frac commands', pattern: /\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g },
    { name: 'Division symbol fractions', pattern: /(\d{1,3})\s*÷\s*(\d{1,3})/g },
    { name: 'Ratio format fractions', pattern: /(\d{1,3})\s*:\s*(\d{1,3})/g }
  ];
  
  const allFractions = [];
  
  for (const { name, pattern } of fractionPatterns) {
    console.log(`Testing raw text pattern: ${name} - ${pattern.source}`);
    
    // Reset regex lastIndex to ensure proper matching
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`Raw text pattern "${name}" found ${matches.length} matches`);
    
    for (const match of matches) {
      const numerator = parseInt(match[1]);
      const denominator = parseInt(match[2]);
      
      console.log(`Found potential fraction: ${numerator}/${denominator} from pattern "${name}"`);
      
      // Validate fraction makes sense
      if (numerator > 0 && denominator > 0 && numerator < 1000 && denominator > 1) {
        const fraction = `${numerator}/${denominator}`;
        
        if (!allFractions.includes(fraction)) {
          allFractions.push(fraction);
          console.log(`✅ Added unique raw text fraction: ${fraction} at position ${match.index}`);
        } else {
          console.log(`⚠️ Skipping duplicate fraction: ${fraction}`);
        }
      } else {
        console.log(`❌ Invalid fraction rejected: ${numerator}/${denominator}`);
      }
    }
  }
  
  console.log(`--- RAW TEXT EXTRACTION COMPLETE: ${allFractions.length} unique fractions ---`);
  allFractions.forEach((frac, idx) => console.log(`Raw fraction ${idx + 1}: ${frac}`));
  return allFractions;
}

// Enhanced exercise creation with comprehensive logging
function createExercisesFromFractions(fractions: string[]): Array<{ question: string, answer: string }> {
  console.log(`--- EXERCISE CREATION START ---`);
  console.log(`Creating exercises from ${fractions.length} fractions:`, fractions);
  
  if (fractions.length === 0) {
    console.log('❌ No fractions provided for exercise creation');
    return [];
  }
  
  const exercises = [];
  
  fractions.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, d, e, etc.
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created exercise ${index + 1}: "${exercise.question}" with answer: "${exercise.answer}"`);
  });
  
  console.log(`--- EXERCISE CREATION COMPLETE: ${exercises.length} exercises created ---`);
  exercises.forEach((ex, idx) => console.log(`Final exercise ${idx + 1}: ${ex.question}`));
  
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
