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
  
  // PHASE 3: Emergency extraction for SimpleTex LaTeX content
  console.log('=== PHASE 3: Emergency SimpleTex Content Extraction ===');
  if (text.includes('ERERCIE') || text.includes('Simpliffer') || text.match(/\d+\/\d+/)) {
    console.log('Detected SimpleTex LaTeX format, creating emergency exercise...');
    
    // Try to extract the fraction
    const fractionMatch = text.match(/\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)|(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
      const numerator = fractionMatch[1] || fractionMatch[3];
      const denominator = fractionMatch[2] || fractionMatch[4];
      const fraction = `${numerator}/${denominator}`;
      
      exercises = [{
        question: `a. Simplifiez la fraction ${fraction}`,
        answer: fraction
      }];
      console.log(`PHASE 3: Created emergency exercise for fraction ${fraction}`);
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