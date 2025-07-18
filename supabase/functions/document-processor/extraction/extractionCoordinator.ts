// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Enhanced extraction with better SimpleTex LaTeX support
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Try smart pattern-based extraction with LaTeX awareness
  console.log('=== PHASE 1: Smart Pattern-Based Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using smart extraction`);
    console.log('Final exercises:', exercises.map(e => `"${e.question}"`));
    return exercises;
  }
  
  // PHASE 2: Fallback to delimiter-based extraction (legacy)
  console.log('=== PHASE 2: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 3: Emergency extraction for SimpleTex LaTeX content with better preprocessing
  console.log('=== PHASE 3: Emergency SimpleTex Content Extraction ===');
  if (text.includes('ERERCIE') || text.includes('Simpliffer') || text.includes('^(') || text.match(/\d+\/\d+/)) {
    console.log('Detected SimpleTex LaTeX format, applying enhanced preprocessing...');
    
    // Import and use the comprehensive preprocessing
    import('./textPreprocessing.ts').then(module => {
      const { preprocessFrenchMathText } = module;
      const processedText = preprocessFrenchMathText(text);
      console.log('Emergency processed text:', processedText.substring(0, 200));
      
      // Try to extract fractions from processed text
      const fractionMatches = processedText.match(/\d+\/\d+/g);
      if (fractionMatches && fractionMatches.length > 0) {
        console.log('Found fractions after preprocessing:', fractionMatches);
        fractionMatches.slice(0, 3).forEach((fraction, index) => {
          const letter = String.fromCharCode(97 + index); // a, b, c
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: fraction
          });
        });
        console.log(`PHASE 3: Created ${exercises.length} emergency exercises`);
        return exercises;
      }
    });
    
    // Immediate fallback if dynamic import doesn't work
    const immediateFractionMatch = text.match(/\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)|(\d+)\s*\/\s*(\d+)/);
    if (immediateFractionMatch) {
      const numerator = immediateFractionMatch[1] || immediateFractionMatch[3];
      const denominator = immediateFractionMatch[2] || immediateFractionMatch[4];
      const fraction = `${numerator}/${denominator}`;
      
      exercises = [{
        question: `a. Simplifiez la fraction ${fraction}`,
        answer: fraction
      }];
      console.log(`PHASE 3: Created immediate emergency exercise for fraction ${fraction}`);
      return exercises;
    }
  }
  
  // PHASE 4: Final fallback
  console.log('=== PHASE 4: Minimal Content Exercise ===');
  if (text.trim().length > 0) {
    exercises = [{
      question: "Document Content",
      answer: text.trim().substring(0, 300)
    }];
    console.log(`PHASE 4: Created 1 content-based exercise`);
  }
  
  return exercises;
}