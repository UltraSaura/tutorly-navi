
// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Helper function to extract lettered exercises (a. b. c. etc.) - ENHANCED VERSION
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  const letteredPattern = /(?:^|\n)\s*([a-h])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)]).*)*)/gm;
  const matches = [...text.matchAll(letteredPattern)];
  
  if (matches.length >= 2) {
    console.log(`Found ${matches.length} lettered exercises`);
    matches.forEach((match, index) => {
      const letter = match[1];
      const content = match[2].trim();
      
      // Look for math content in the exercise
      const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created lettered exercise: ${letter}. Simplifiez la fraction ${fraction}`);
      } else {
        exercises.push({
          question: `${letter}. ${content}`,
          answer: content.substring(0, 50)
        });
        console.log(`✅ Created lettered exercise: ${letter}. ${content.substring(0, 30)}...`);
      }
    });
  }
  
  return exercises;
}

// Helper function to extract numbered exercises (1. 2. 3. etc.) - ENHANCED VERSION
function extractNumberedExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm;
  const matches = [...text.matchAll(numberedPattern)];
  
  if (matches.length >= 2) {
    console.log(`Found ${matches.length} numbered exercises`);
    matches.forEach((match) => {
      const number = match[1];
      const content = match[2].trim();
      
      // Look for math content in the exercise
      const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        exercises.push({
          question: `${number}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created numbered exercise: ${number}. Simplifiez la fraction ${fraction}`);
      } else {
        exercises.push({
          question: `${number}. ${content}`,
          answer: content.substring(0, 50)
        });
        console.log(`✅ Created numbered exercise: ${number}. ${content.substring(0, 30)}...`);
      }
    });
  }
  
  return exercises;
}

// Enhanced extraction with comprehensive multi-exercise detection and raw text analysis
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Try enhanced smart pattern-based extraction with raw text analysis
  console.log('=== PHASE 1: Enhanced Smart Pattern-Based Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using enhanced smart extraction`);
    console.log('Final exercises:', exercises.map(e => `"${e.question}"`));
    return exercises;
  }
  
  // PHASE 2: Enhanced multi-exercise detection for specific patterns
  console.log('=== PHASE 2: Enhanced Multi-Exercise Detection ===');
  
  // Try to detect multiple lettered exercises (common in French worksheets)
  const letteredExercises = extractLetteredExercises(text);
  if (letteredExercises.length > 1) {
    console.log(`PHASE 2: Found ${letteredExercises.length} lettered exercises`);
    return letteredExercises;
  }
  
  // Try to detect multiple numbered exercises
  const numberedExercises = extractNumberedExercises(text);
  if (numberedExercises.length > 1) {
    console.log(`PHASE 2: Found ${numberedExercises.length} numbered exercises`);
    return numberedExercises;
  }
  
  // PHASE 3: Fallback to delimiter-based extraction (legacy)
  console.log('=== PHASE 3: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 3 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 4: Emergency extraction for SimpleTex LaTeX content with comprehensive fraction detection
  if (text.includes('EXERCICE') || text.includes('Simpliffer') || text.includes('^(') || text.match(/\d+\/\d+/)) {
    console.log('=== PHASE 4: Emergency Comprehensive Fraction Extraction ===');
    console.log('Detected SimpleTex LaTeX format, applying comprehensive fraction extraction...');
    
    // Enhanced fraction detection with multiple patterns
    const fractionPatterns = [
      /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions (30)/(63)
      /(\d+)\s*\/\s*(\d+)/g, // Standard fractions 30/63
      /(\d+)\s*÷\s*(\d+)/g, // Division symbol
      /\\?frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fraction format
    ];
    
    const allFractions = [];
    
    for (const pattern of fractionPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const numerator = match[1];
        const denominator = match[2];
        const fraction = `${numerator}/${denominator}`;
        
        // Avoid duplicates and validate
        if (!allFractions.includes(fraction) && 
            parseInt(numerator) > 0 && parseInt(denominator) > 0 &&
            parseInt(numerator) < 1000 && parseInt(denominator) > 1) {
          allFractions.push(fraction);
          console.log(`✅ Found fraction in emergency extraction: ${fraction}`);
        }
      }
    }
    
    if (allFractions.length > 0) {
      console.log(`Emergency extraction found ${allFractions.length} fractions:`, allFractions);
      
      allFractions.forEach((fraction, index) => {
        const letter = String.fromCharCode(97 + index); // a, b, c, d, e
        
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created emergency exercise: ${letter}. Simplifiez la fraction ${fraction}`);
      });
      
      console.log(`PHASE 4 SUCCESS: Created ${exercises.length} fraction exercises`);
      return exercises;
    }
  }
  
  // PHASE 5: Final fallback
  console.log('=== PHASE 5: Minimal Content Exercise ===');
  if (text.trim().length > 0) {
    exercises = [{
      question: "Document Content",
      answer: text.trim().substring(0, 300)
    }];
    console.log(`PHASE 5: Created 1 content-based exercise`);
  }
  
  return exercises;
}
