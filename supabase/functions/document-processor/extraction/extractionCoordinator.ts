// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Simplified extraction with smart pattern recognition
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Try smart pattern-based extraction (new approach)
  console.log('=== PHASE 1: Smart Pattern-Based Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using smart extraction`);
    return exercises;
  }
  
  // PHASE 2: Fallback to delimiter-based extraction (legacy)
  console.log('=== PHASE 2: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 3: Create minimal exercise from content
  console.log('=== PHASE 3: Minimal Content Exercise ===');
  if (text.trim().length > 0) {
    exercises = [{
      question: "Document Content",
      answer: text.trim().substring(0, 300)
    }];
    console.log(`PHASE 3: Created 1 content-based exercise`);
  }
  
  return exercises;
}