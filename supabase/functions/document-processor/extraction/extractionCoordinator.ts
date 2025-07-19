
// Main extraction coordinator that prioritizes direct fraction extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Enhanced extraction with direct raw text analysis first
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE EXTRACTION COORDINATOR START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview:', text.substring(0, 500));
  
  // PHASE 1: Direct mathematical extraction from raw text (highest priority)
  console.log('=== PHASE 1: Direct Mathematical Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using direct extraction`);
    exercises.forEach((ex, idx) => {
      console.log(`Final Exercise ${idx + 1}: "${ex.question}"`);
    });
    return exercises;
  }
  
  // PHASE 2: Lettered exercise pattern detection
  console.log('=== PHASE 2: Lettered Exercise Pattern Detection ===');
  const letteredExercises = extractLetteredExercises(text);
  if (letteredExercises.length > 1) {
    console.log(`PHASE 2 SUCCESS: Found ${letteredExercises.length} lettered exercises`);
    return letteredExercises;
  }
  
  // PHASE 3: Numbered exercise pattern detection
  console.log('=== PHASE 3: Numbered Exercise Pattern Detection ===');
  const numberedExercises = extractNumberedExercises(text);
  if (numberedExercises.length > 1) {
    console.log(`PHASE 3 SUCCESS: Found ${numberedExercises.length} numbered exercises`);
    return numberedExercises;
  }
  
  // PHASE 4: Delimiter-based extraction (legacy fallback)
  console.log('=== PHASE 4: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 4 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 5: Final content-based exercise
  console.log('=== PHASE 5: Content-Based Exercise Creation ===');
  if (text.trim().length > 0) {
    exercises = [{
      question: "Document Content",
      answer: text.trim().substring(0, 300)
    }];
    console.log(`PHASE 5: Created 1 content-based exercise`);
  }
  
  console.log(`EXTRACTION COMPLETE: ${exercises.length} total exercises`);
  return exercises;
}

// Helper function to extract lettered exercises (a. b. c. etc.)
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  const letteredPattern = /(?:^|\n)\s*([a-h])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)]).*)*)/gm;
  const matches = [...text.matchAll(letteredPattern)];
  
  if (matches.length >= 2) {
    console.log(`Found ${matches.length} lettered exercises`);
    matches.forEach((match) => {
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

// Helper function to extract numbered exercises (1. 2. 3. etc.)
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
