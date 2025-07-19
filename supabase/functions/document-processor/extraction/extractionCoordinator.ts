// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Helper function to extract lettered exercises (a. b. c. etc.)
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
      } else {
        exercises.push({
          question: `${letter}. ${content}`,
          answer: content.substring(0, 50)
        });
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
      } else {
        exercises.push({
          question: `${number}. ${content}`,
          answer: content.substring(0, 50)
        });
      }
    });
  }
  
  return exercises;
}

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
  
  // PHASE 3: Enhanced multi-exercise detection for specific patterns
  console.log('=== PHASE 3: Enhanced Multi-Exercise Detection ===');
  
  // Try to detect multiple lettered exercises (common in French worksheets)
  const letteredExercises = extractLetteredExercises(text);
  if (letteredExercises.length > 1) {
    console.log(`PHASE 3: Found ${letteredExercises.length} lettered exercises`);
    return letteredExercises;
  }
  
  // Try to detect multiple numbered exercises
  const numberedExercises = extractNumberedExercises(text);
  if (numberedExercises.length > 1) {
    console.log(`PHASE 3: Found ${numberedExercises.length} numbered exercises`);
    return numberedExercises;
  }
  
  // Emergency extraction for SimpleTex LaTeX content
  if (text.includes('ERERCIE') || text.includes('Simpliffer') || text.includes('^(') || text.match(/\d+\/\d+/)) {
    console.log('Detected SimpleTex LaTeX format, applying enhanced preprocessing...');
    
    // Try to extract all fractions from the text
    const allFractionMatches = text.match(/(?:\(\s*)?(\d+)\s*\/\s*(\d+)(?:\s*\))?/g);
    if (allFractionMatches && allFractionMatches.length > 0) {
      console.log('Found fractions in text:', allFractionMatches);
      
      allFractionMatches.forEach((fractionMatch, index) => {
        // Clean up the fraction format
        const cleanFraction = fractionMatch.replace(/[()]/g, '').replace(/\s/g, '');
        const letter = String.fromCharCode(97 + index); // a, b, c, d, e
        
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${cleanFraction}`,
          answer: cleanFraction
        });
        console.log(`✅ Created exercise: ${letter}. Simplifiez la fraction ${cleanFraction}`);
      });
      
      console.log(`PHASE 3: Created ${exercises.length} fraction exercises`);
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