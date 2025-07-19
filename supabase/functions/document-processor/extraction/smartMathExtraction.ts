
// Enhanced mathematical exercise extraction with LaTeX support from SimpleTex

import { preprocessFrenchMathText } from './textPreprocessing.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED MULTI-EXERCISE EXTRACTION ===');
  console.log('Raw text length:', rawText.length);
  console.log('Raw text preview:', rawText.substring(0, 300));
  
  // Skip extraction if this looks like an error message or emergency text
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error/emergency text, skipping exercise extraction');
    return [];
  }
  
  // PHASE 1: Extract ALL fractions from raw text BEFORE any preprocessing
  console.log('🔍 PHASE 1: Pre-extraction fraction detection');
  const allFractionsFromRaw = extractAllFractionsFromRawText(rawText);
  
  if (allFractionsFromRaw.length > 1) {
    console.log(`✅ Found ${allFractionsFromRaw.length} fractions in raw text, creating exercises`);
    return createExercisesFromFractions(allFractionsFromRaw);
  }
  
  // PHASE 2: Try LaTeX-aware extraction (for SimpleTex output)
  console.log('🔍 PHASE 2: LaTeX-aware extraction');
  const latexExercises = extractFromLatexText(rawText);
  if (latexExercises.length > 0) {
    console.log(`✅ Found ${latexExercises.length} exercises using LaTeX extraction`);
    return latexExercises;
  }
  
  // PHASE 3: Fallback to pure OCR-based extraction
  console.log('🔍 PHASE 3: OCR-based pattern extraction');
  return extractMathExercisesDirectly(rawText);
}

// NEW: Extract ALL fractions from raw text before any processing
function extractAllFractionsFromRawText(text: string): string[] {
  console.log('Extracting ALL fractions from raw text...');
  
  const fractionPatterns = [
    /\(\s*(\d{1,3})\s*\)\s*\/\s*\(\s*(\d{1,3})\s*\)/g, // (30)/(63)
    /(\d{1,3})\s*\/\s*(\d{1,3})/g, // 30/63
    /\\frac\{(\d{1,3})\}\{(\d{1,3})\}/g, // \frac{30}{63}
    /(\d{1,3})\s*÷\s*(\d{1,3})/g, // 30÷63
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

// NEW: Create exercises from a list of fractions
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

// Helper function to detect error/emergency text (more restrictive to allow SimpleTex LaTeX)
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
  // Only consider it error text if it contains these AND doesn't have math content
  const hasErrorIndicator = errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  const hasMathContent = /\d+\/\d+|\d+\.\d+|exercice|fraction/i.test(text);
  
  return hasErrorIndicator && !hasMathContent;
}

// Extract exercises from LaTeX-formatted text (SimpleTex output) - ENHANCED VERSION
function extractFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('Attempting LaTeX-aware extraction...');
  
  const exercises = [];
  
  // STEP 1: Apply comprehensive French math text preprocessing
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  console.log('Cleaned text length:', cleanedText.length);
  
  // STEP 2: Look for exercise title and content
  const exerciseMatch = cleanedText.match(/EXERCICE\s+(\d+|[IVX]+)/i);
  const exerciseTitle = exerciseMatch ? `EXERCICE ${exerciseMatch[1]}` : 'EXERCICE';
  
  // STEP 3: Look for instruction text
  const instructionMatch = cleanedText.match(/(Simplifiez?|Calculez?|Résolvez?)[^.]*\./i);
  const instruction = instructionMatch ? instructionMatch[0] : 'Simplifiez les fractions suivantes';
  
  // STEP 4: Find ALL fractions with comprehensive patterns - FIXED VERSION
  const allFoundFractions = extractAllFractionsFromRawText(text); // Use raw text for better detection
  
  console.log(`LaTeX extraction found ${allFoundFractions.length} fractions:`, allFoundFractions);
  
  // STEP 5: Create exercises from ALL found fractions
  if (allFoundFractions.length > 0) {
    return createExercisesFromFractions(allFoundFractions);
  }
  
  console.log('No fractions found in LaTeX extraction');
  return exercises;
}

// Direct OCR-based exercise extraction using precise pattern matching - ENHANCED VERSION
function extractMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('Starting direct OCR pattern extraction...');
  
  // Use the comprehensive fraction extraction
  const allFractions = extractAllFractionsFromRawText(rawText);
  
  if (allFractions.length > 0) {
    console.log(`Direct extraction found ${allFractions.length} fractions`);
    return createExercisesFromFractions(allFractions);
  }
  
  console.log('No fractions found in direct extraction');
  return [];
}
