
// Enhanced mathematical exercise extraction with comprehensive multi-exercise support

import { preprocessFrenchMathText } from './textPreprocessing.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED MULTI-EXERCISE MATH EXTRACTION ===');
  console.log('Raw text length:', rawText.length);
  console.log('Raw text preview:', rawText.substring(0, 400));
  
  // Skip extraction if this looks like an error message
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error text, skipping extraction');
    return [];
  }
  
  // First try comprehensive LaTeX-aware extraction
  const latexExercises = extractMultipleFromLatexText(rawText);
  console.log(`LaTeX extraction found ${latexExercises.length} exercises`);
  
  if (latexExercises.length > 0) {
    console.log(`✅ Found ${latexExercises.length} exercises using LaTeX extraction`);
    return latexExercises;
  }
  
  // Fallback to direct OCR-based extraction
  console.log('🔄 Falling back to direct OCR extraction');
  const ocrExercises = extractMultipleMathExercisesDirectly(rawText);
  
  console.log(`=== FINAL SMART EXTRACTION RESULT: ${ocrExercises.length} exercises ===`);
  return ocrExercises;
}

function isErrorText(text: string): boolean {
  const errorIndicators = [
    'OCR extraction failed',
    'manual review required',
    'could not be processed automatically',
    'Status: OCR extraction failed'
  ];
  
  const lowerText = text.toLowerCase();
  const hasErrorIndicator = errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  const hasMathContent = /\d+\/\d+|\d+\.\d+|exercice|fraction/i.test(text);
  
  return hasErrorIndicator && !hasMathContent;
}

// Enhanced LaTeX extraction that finds ALL fractions and creates separate exercises
function extractMultipleFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE LATEX MULTI-EXERCISE EXTRACTION ===');
  
  const exercises = [];
  
  // Apply preprocessing but preserve structure
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text for LaTeX extraction:', cleanedText.substring(0, 400));
  
  // Enhanced fraction detection patterns
  const fractionPatterns = [
    /(\d+)\s*\/\s*(\d+)/g, // Basic fractions
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, // Single parenthesized fractions
    /\\frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions
  ];
  
  const foundFractions = new Set();
  
  // Find all unique fractions using multiple patterns
  for (const pattern of fractionPatterns) {
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const fraction = `${numerator}/${denominator}`;
      
      // Validate fraction (avoid obviously wrong matches)
      if (parseInt(numerator) > 0 && parseInt(denominator) > 0 && parseInt(denominator) > parseInt(numerator)/100) {
        foundFractions.add(fraction);
        console.log(`✅ Found valid LaTeX fraction: ${fraction}`);
      }
    }
    pattern.lastIndex = 0;
  }
  
  console.log(`Total unique LaTeX fractions found: ${foundFractions.size}`);
  
  // Create exercises from ALL found fractions - THIS WAS THE BUG!
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created LaTeX exercise ${index + 1}: ${exercise.question}`);
  });
  
  console.log(`=== LATEX EXTRACTION RESULT: ${exercises.length} exercises ===`);
  return exercises;
}

// Enhanced direct OCR extraction that creates multiple exercises
function extractMultipleMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE DIRECT OCR EXTRACTION ===');
  
  const exercises = [];
  
  // Find all fractions in the text
  const fractionPattern = /\b(\d{1,3})\/(\d{1,3})\b/g;
  const foundFractions = new Set();
  let fractionMatch;
  
  while ((fractionMatch = fractionPattern.exec(rawText)) !== null) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    
    // Validate fraction
    if (numerator > 0 && denominator > 0 && denominator > 1 && numerator < 1000 && denominator < 1000) {
      const fraction = `${numerator}/${denominator}`;
      foundFractions.add(fraction);
      console.log(`✅ Found valid OCR fraction: ${fraction}`);
    }
  }
  
  console.log(`Total OCR fractions found: ${foundFractions.size}`);
  
  // Create exercises from ALL found fractions - THIS WAS ALSO THE BUG!
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created OCR exercise ${index + 1}: ${exercise.question}`);
  });
  
  // Enhanced fallback patterns if no fractions found
  if (exercises.length === 0) {
    console.log('No fractions found, looking for other math patterns...');
    
    // Look for decimal patterns
    const decimalPattern = /\b(\d+\.\d+)\b/g;
    const foundDecimals = new Set();
    let decimalMatch;
    
    while ((decimalMatch = decimalPattern.exec(rawText)) !== null && foundDecimals.size < 5) {
      const decimal = decimalMatch[1];
      foundDecimals.add(decimal);
      console.log(`✅ Found decimal: ${decimal}`);
    }
    
    Array.from(foundDecimals).forEach((decimal, index) => {
      const letter = String.fromCharCode(97 + index);
      exercises.push({
        question: `${letter}. Calculez avec le nombre décimal ${decimal}`,
        answer: decimal
      });
    });
  }
  
  console.log(`=== DIRECT OCR RESULT: ${exercises.length} exercises ===`);
  return exercises;
}
