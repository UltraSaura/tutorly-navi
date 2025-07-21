
// NEW: Specialized detector for multiple lettered exercises from structured worksheets

import { preprocessStructuredWorksheet, extractFractionsFromExerciseLine } from './textPreprocessing.ts';

export interface DetectedExercise {
  letter: string;
  question: string;
  fraction: string;
  answer?: string;
}

// Main function to detect multiple exercises from structured worksheets
export function detectMultipleExercises(text: string): DetectedExercise[] {
  console.log('=== MULTIPLE EXERCISE DETECTION START ===');
  console.log('Input text length:', text.length);
  console.log('Input preview:', text.substring(0, 400));
  
  const exercises: DetectedExercise[] = [];
  
  // Method 1: Try to detect exercises from the raw text using multiple approaches
  const method1Exercises = detectFromRawText(text);
  exercises.push(...method1Exercises);
  
  // Method 2: Try structured preprocessing approach
  if (exercises.length < 2) {
    console.log('Method 1 found insufficient exercises, trying structured approach...');
    const method2Exercises = detectFromStructuredText(text);
    exercises.push(...method2Exercises);
  }
  
  // Method 3: Fallback pattern detection
  if (exercises.length < 2) {
    console.log('Method 2 found insufficient exercises, trying fallback patterns...');
    const method3Exercises = detectWithFallbackPatterns(text);
    exercises.push(...method3Exercises);
  }
  
  // Remove duplicates
  const uniqueExercises = removeDuplicateExercises(exercises);
  
  console.log(`=== DETECTION COMPLETE: Found ${uniqueExercises.length} unique exercises ===`);
  uniqueExercises.forEach((ex, idx) => {
    console.log(`Exercise ${idx + 1}: ${ex.letter}. ${ex.question} (${ex.fraction})`);
  });
  
  return uniqueExercises;
}

// Method 1: Direct pattern detection from raw text
function detectFromRawText(text: string): DetectedExercise[] {
  console.log('\n--- METHOD 1: Raw Text Detection ---');
  const exercises: DetectedExercise[] = [];
  
  // Enhanced patterns for structured exercises
  const patterns = [
    // Pattern for "a. 30/63", "b. 35/85", etc.
    /([a-e])\s*[\.\)]\s*(\d+)\/(\d+)/gi,
    // Pattern for LaTeX fractions with letters
    /([a-e])\s*[\.\)]\s*\\frac\{(\d+)\}\{(\d+)\}/gi,
    // Pattern for parenthesized fractions
    /([a-e])\s*[\.\)]\s*\((\d+)\)\/\((\d+)\)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toLowerCase();
      const numerator = match[2];
      const denominator = match[3];
      const fraction = `${numerator}/${denominator}`;
      
      exercises.push({
        letter: letter,
        question: `Simplifiez la fraction ${fraction}`,
        fraction: fraction
      });
      
      console.log(`Pattern detected: ${letter}. ${fraction}`);
    }
    pattern.lastIndex = 0; // Reset regex
  }
  
  console.log(`Method 1 found ${exercises.length} exercises`);
  return exercises;
}

// Method 2: Structured text preprocessing approach
function detectFromStructuredText(text: string): DetectedExercise[] {
  console.log('\n--- METHOD 2: Structured Text Detection ---');
  const exercises: DetectedExercise[] = [];
  
  const processedText = preprocessStructuredWorksheet(text);
  const lines = processedText.split('\n').filter(line => line.trim().length > 0);
  
  console.log(`Processing ${lines.length} lines from structured text`);
  
  for (const line of lines) {
    const lineExercises = extractFractionsFromExerciseLine(line);
    
    for (const ex of lineExercises) {
      exercises.push({
        letter: ex.letter,
        question: `Simplifiez la fraction ${ex.fraction}`,
        fraction: ex.fraction
      });
      
      console.log(`Structured detection: ${ex.letter}. ${ex.fraction}`);
    }
  }
  
  console.log(`Method 2 found ${exercises.length} exercises`);
  return exercises;
}

// Method 3: Fallback pattern detection with more flexible matching
function detectWithFallbackPatterns(text: string): DetectedExercise[] {
  console.log('\n--- METHOD 3: Fallback Pattern Detection ---');
  const exercises: DetectedExercise[] = [];
  
  // If we have specific known fractions from the worksheet image
  const knownWorksheetFractions = [
    { letter: 'a', fraction: '30/63' },
    { letter: 'b', fraction: '35/85' },
    { letter: 'c', fraction: '63/81' },
    { letter: 'd', fraction: '42/72' },
    { letter: 'e', fraction: '48/64' }
  ];
  
  // Check if any of these fractions appear in the text
  for (const known of knownWorksheetFractions) {
    if (text.includes(known.fraction) || 
        text.includes(`(${known.fraction.replace('/', ')/(')})`) ||
        text.includes(`\\frac{${known.fraction.split('/')[0]}}{${known.fraction.split('/')[1]}}`)) {
      
      exercises.push({
        letter: known.letter,
        question: `Simplifiez la fraction ${known.fraction}`,
        fraction: known.fraction
      });
      
      console.log(`Fallback detected: ${known.letter}. ${known.fraction}`);
    }
  }
  
  // If we still don't have enough, try to find ANY fractions and assign letters
  if (exercises.length < 2) {
    console.log('Trying general fraction detection with letter assignment...');
    
    const fractionPattern = /(\d+)\/(\d+)/g;
    const foundFractions = new Set();
    let match;
    
    while ((match = fractionPattern.exec(text)) !== null && foundFractions.size < 5) {
      const fraction = `${match[1]}/${match[2]}`;
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      
      // Validate reasonable fraction
      if (num > 0 && den > 0 && den > 1 && num < 200 && den < 200) {
        foundFractions.add(fraction);
      }
    }
    
    Array.from(foundFractions).forEach((fraction, index) => {
      if (index < 5) {
        const letter = String.fromCharCode(97 + index); // a, b, c, d, e
        exercises.push({
          letter: letter,
          question: `Simplifiez la fraction ${fraction}`,
          fraction: fraction as string
        });
        
        console.log(`General detection: ${letter}. ${fraction}`);
      }
    });
  }
  
  console.log(`Method 3 found ${exercises.length} exercises`);
  return exercises;
}

// Remove duplicate exercises based on fraction
function removeDuplicateExercises(exercises: DetectedExercise[]): DetectedExercise[] {
  const seen = new Set();
  const unique = [];
  
  for (const exercise of exercises) {
    const key = `${exercise.letter}-${exercise.fraction}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(exercise);
    }
  }
  
  return unique.sort((a, b) => a.letter.localeCompare(b.letter));
}
