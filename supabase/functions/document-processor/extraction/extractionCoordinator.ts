

// Enhanced extraction coordinator with comprehensive logging

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Enhanced extraction with detailed logging at each phase
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== EXTRACTION COORDINATOR START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Direct mathematical extraction from raw text (highest priority)
  console.log('=== PHASE 1: Direct Mathematical Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  console.log(`PHASE 1 RESULT: ${exercises.length} exercises found`);
  if (exercises.length > 0) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using direct extraction`);
    exercises.forEach((ex, idx) => {
      console.log(`Phase 1 Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    console.log('=== EXTRACTION COORDINATOR END (Phase 1 success) ===');
    return exercises;
  }
  
  // PHASE 2: Lettered exercise pattern detection
  console.log('=== PHASE 2: Lettered Exercise Pattern Detection ===');
  const letteredExercises = extractLetteredExercises(text);
  console.log(`PHASE 2 RESULT: ${letteredExercises.length} lettered exercises found`);
  
  if (letteredExercises.length > 1) {
    console.log(`PHASE 2 SUCCESS: Found ${letteredExercises.length} lettered exercises`);
    letteredExercises.forEach((ex, idx) => {
      console.log(`Phase 2 Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    console.log('=== EXTRACTION COORDINATOR END (Phase 2 success) ===');
    return letteredExercises;
  }
  
  // PHASE 3: Numbered exercise pattern detection
  console.log('=== PHASE 3: Numbered Exercise Pattern Detection ===');
  const numberedExercises = extractNumberedExercises(text);
  console.log(`PHASE 3 RESULT: ${numberedExercises.length} numbered exercises found`);
  
  if (numberedExercises.length > 1) {
    console.log(`PHASE 3 SUCCESS: Found ${numberedExercises.length} numbered exercises`);
    numberedExercises.forEach((ex, idx) => {
      console.log(`Phase 3 Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    console.log('=== EXTRACTION COORDINATOR END (Phase 3 success) ===');
    return numberedExercises;
  }
  
  // PHASE 4: Delimiter-based extraction (legacy fallback)
  console.log('=== PHASE 4: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  console.log(`PHASE 4 RESULT: ${exercises.length} delimiter-based exercises found`);
  
  if (exercises.length > 0) {
    console.log(`PHASE 4 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    exercises.forEach((ex, idx) => {
      console.log(`Phase 4 Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    console.log('=== EXTRACTION COORDINATOR END (Phase 4 success) ===');
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
    console.log(`Phase 5 Exercise: "${exercises[0].question}" -> "${exercises[0].answer.substring(0, 50)}..."`);
  }
  
  console.log(`=== EXTRACTION COORDINATOR END ===`);
  console.log(`FINAL RESULT: ${exercises.length} total exercises extracted`);
  return exercises;
}

// Enhanced lettered exercise extraction with logging
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('--- LETTERED EXERCISE EXTRACTION START ---');
  const exercises = [];
  const letteredPattern = /(?:^|\n)\s*([a-h])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)]).*)*)/gm;
  
  // Reset regex lastIndex
  letteredPattern.lastIndex = 0;
  const matches = [...text.matchAll(letteredPattern)];
  
  console.log(`Found ${matches.length} potential lettered exercises`);
  
  if (matches.length >= 2) {
    console.log(`Processing ${matches.length} lettered exercises`);
    matches.forEach((match, index) => {
      const letter = match[1];
      const content = match[2].trim();
      
      console.log(`Lettered exercise ${index + 1}: ${letter}. ${content.substring(0, 50)}...`);
      
      // Look for math content in the exercise
      const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created lettered fraction exercise: ${letter}. Simplifiez la fraction ${fraction}`);
      } else {
        exercises.push({
          question: `${letter}. ${content}`,
          answer: content.substring(0, 50)
        });
        console.log(`✅ Created lettered content exercise: ${letter}. ${content.substring(0, 30)}...`);
      }
    });
  }
  
  console.log(`--- LETTERED EXTRACTION COMPLETE: ${exercises.length} exercises ---`);
  return exercises;
}

// Enhanced numbered exercise extraction with logging
function extractNumberedExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('--- NUMBERED EXERCISE EXTRACTION START ---');
  const exercises = [];
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm;
  
  // Reset regex lastIndex
  numberedPattern.lastIndex = 0;
  const matches = [...text.matchAll(numberedPattern)];
  
  console.log(`Found ${matches.length} potential numbered exercises`);
  
  if (matches.length >= 2) {
    console.log(`Processing ${matches.length} numbered exercises`);
    matches.forEach((match, index) => {
      const number = match[1];
      const content = match[2].trim();
      
      console.log(`Numbered exercise ${index + 1}: ${number}. ${content.substring(0, 50)}...`);
      
      // Look for math content in the exercise
      const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        exercises.push({
          question: `${number}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created numbered fraction exercise: ${number}. Simplifiez la fraction ${fraction}`);
      } else {
        exercises.push({
          question: `${number}. ${content}`,
          answer: content.substring(0, 50)
        });
        console.log(`✅ Created numbered content exercise: ${number}. ${content.substring(0, 30)}...`);
      }
    });
  }
  
  console.log(`--- NUMBERED EXTRACTION COMPLETE: ${exercises.length} exercises ---`);
  return exercises;
}

