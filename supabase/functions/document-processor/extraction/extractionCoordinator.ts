
// Enhanced extraction coordinator with comprehensive multi-exercise detection

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Enhanced function to extract multiple lettered exercises
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== EXTRACTING LETTERED EXERCISES ===');
  const exercises = [];
  
  // Multiple patterns for lettered exercises
  const patterns = [
    /(?:^|\n)\s*([a-h])[\.\)\:]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)\:]).*)*)/gim,
    /([a-h])\s*[\.\)\:]\s*([^a-h\n]+)/gi,
    /([a-h])\s*~\s*([^\n]+)/gi // For SimpleTex format like "a ~"
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    console.log(`Pattern found ${matches.length} lettered matches`);
    
    if (matches.length >= 2) {
      matches.forEach((match) => {
        const letter = match[1].toLowerCase();
        const content = match[2].trim();
        
        // Extract fractions from the content
        const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
        if (fractionMatch) {
          const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: fraction
          });
          console.log(`✅ Created lettered exercise: ${letter}. Simplifiez la fraction ${fraction}`);
        } else if (content.length > 3) {
          exercises.push({
            question: `${letter}. ${content}`,
            answer: content.substring(0, 50)
          });
          console.log(`✅ Created lettered exercise: ${letter}. ${content.substring(0, 30)}...`);
        }
      });
      
      if (exercises.length > 0) break; // Use first successful pattern
    }
  }
  
  console.log(`=== LETTERED EXTRACTION RESULT: ${exercises.length} exercises ===`);
  return exercises;
}

// Enhanced function to extract all fractions and create individual exercises
function extractAllFractionsAsExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== EXTRACTING ALL FRACTIONS AS INDIVIDUAL EXERCISES ===');
  const exercises = [];
  
  // Comprehensive fraction patterns
  const fractionPatterns = [
    /(?:\(\s*)?(\d+)\s*\/\s*(\d+)(?:\s*\))?/g, // Basic fractions with optional parentheses
    /(\d+)\s*\/\s*(\d+)/g, // Simple fractions
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g // Parenthesized fractions
  ];
  
  const foundFractions = new Set(); // Avoid duplicates
  
  for (const pattern of fractionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const fraction = `${numerator}/${denominator}`;
      
      if (!foundFractions.has(fraction)) {
        foundFractions.add(fraction);
        console.log(`✅ Found unique fraction: ${fraction}`);
      }
    }
    pattern.lastIndex = 0; // Reset pattern
  }
  
  // Create exercises from all found fractions
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    });
    console.log(`✅ Created fraction exercise: ${letter}. Simplifiez la fraction ${fraction}`);
  });
  
  console.log(`=== FRACTION EXTRACTION RESULT: ${exercises.length} exercises ===`);
  return exercises;
}

// Enhanced numbered exercise extraction
function extractNumberedExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== EXTRACTING NUMBERED EXERCISES ===');
  const exercises = [];
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm;
  const matches = [...text.matchAll(numberedPattern)];
  
  console.log(`Found ${matches.length} numbered matches`);
  
  if (matches.length >= 2) {
    matches.forEach((match) => {
      const number = match[1];
      const content = match[2].trim();
      
      const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        exercises.push({
          question: `${number}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created numbered exercise: ${number}. Simplifiez la fraction ${fraction}`);
      } else if (content.length > 3) {
        exercises.push({
          question: `${number}. ${content}`,
          answer: content.substring(0, 50)
        });
      }
    });
  }
  
  console.log(`=== NUMBERED EXTRACTION RESULT: ${exercises.length} exercises ===`);
  return exercises;
}

// Main extraction function with comprehensive multi-exercise detection
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 600 chars):', text.substring(0, 600));
  
  let exercises = [];
  
  // PHASE 1: Smart pattern-based extraction (original method)
  console.log('\n=== PHASE 1: Smart Pattern-Based Extraction ===');
  exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using smart extraction`);
    return exercises;
  }
  
  // PHASE 2: Extract all fractions as individual exercises
  console.log('\n=== PHASE 2: All Fractions as Individual Exercises ===');
  exercises = extractAllFractionsAsExercises(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} fraction exercises`);
    return exercises;
  }
  
  // PHASE 3: Lettered exercise detection
  console.log('\n=== PHASE 3: Lettered Exercise Detection ===');
  exercises = extractLetteredExercises(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 3 SUCCESS: Found ${exercises.length} lettered exercises`);
    return exercises;
  }
  
  // PHASE 4: Numbered exercise detection
  console.log('\n=== PHASE 4: Numbered Exercise Detection ===');
  exercises = extractNumberedExercises(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 4 SUCCESS: Found ${exercises.length} numbered exercises`);
    return exercises;
  }
  
  // PHASE 5: Delimiter-based extraction (fallback)
  console.log('\n=== PHASE 5: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 5 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 6: Emergency single-exercise extraction
  console.log('\n=== PHASE 6: Emergency Single Exercise ===');
  if (text.trim().length > 0) {
    // Look for any math content
    const fractionMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
      const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
      exercises = [{
        question: `Simplifiez la fraction ${fraction}`,
        answer: fraction
      }];
      console.log(`PHASE 6: Created single fraction exercise: ${fraction}`);
    } else {
      exercises = [{
        question: "Document Content",
        answer: text.trim().substring(0, 300)
      }];
      console.log(`PHASE 6: Created content-based exercise`);
    }
  }
  
  console.log(`=== FINAL EXTRACTION RESULT: ${exercises.length} exercises ===`);
  exercises.forEach((ex, idx) => {
    console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
  });
  
  return exercises;
}
