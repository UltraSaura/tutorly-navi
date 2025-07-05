// Main extraction coordinator that orchestrates all extraction phases

import { extractWithDelimiters } from './delimiterExtraction.ts';
import { extractWithBoundaryDetection } from './boundaryDetection.ts';
import { extractWithContentClustering } from './contentClustering.ts';
import { createForcedSplitExercises } from './forcedSplitting.ts';

// Progressive extraction with delimiter detection and robust fallbacks
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== PROGRESSIVE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Check for Vision API delimiters first
  console.log('=== PHASE 1: Delimiter-Based Extraction ===');
  let exercises = extractWithDelimiters(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 2: Advanced boundary detection with preprocessing
  console.log('=== PHASE 2: Boundary Detection ===');
  exercises = extractWithBoundaryDetection(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} exercises using boundary detection`);
    return exercises;
  }
  
  // PHASE 3: Content clustering fallback
  console.log('=== PHASE 3: Content Clustering ===');
  exercises = extractWithContentClustering(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 3 SUCCESS: Found ${exercises.length} exercises using content clustering`);
    return exercises;
  }
  
  // PHASE 4: Force split if content is substantial
  console.log('=== PHASE 4: Force Split Strategy ===');
  exercises = createForcedSplitExercises(text);
  console.log(`PHASE 4: Created ${exercises.length} exercises using forced split`);
  
  return exercises;
}