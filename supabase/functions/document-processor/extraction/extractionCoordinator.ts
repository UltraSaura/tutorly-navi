
// Enhanced extraction coordinator with comprehensive multi-exercise detection

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// FIXED: Enhanced function to extract multiple lettered exercises
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
    
    if (matches.length >= 1) {
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

// FIXED: Enhanced function to extract all fractions and create individual exercises
function extractAllFractionsAsExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== EXTRACTING ALL FRACTIONS AS INDIVIDUAL EXERCISES ===');
  const exercises = [];
  
  // Comprehensive fraction patterns including LaTeX
  const fractionPatterns = [
    /\\frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions \frac{30}{63}
    /frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions without backslash
    /(?:\(\s*)?(\d+)\s*\/\s*(\d+)(?:\s*\))?/g, // Basic fractions with optional parentheses
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions
  ];
  
  const foundFractions = new Set(); // Avoid duplicates
  
  for (const pattern of fractionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const fraction = `${numerator}/${denominator}`;
      
      // Validate fraction (reasonable numbers)
      if (parseInt(numerator) > 0 && parseInt(denominator) > 0 && parseInt(denominator) > 1) {
        foundFractions.add(fraction);
        console.log(`✅ Found unique fraction: ${fraction}`);
      }
    }
    pattern.lastIndex = 0; // Reset pattern
  }
  
  console.log(`Total unique fractions found: ${foundFractions.size}`);
  console.log('All unique fractions:', Array.from(foundFractions));
  
  // Create exercises from ALL found fractions
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
  
  if (matches.length >= 1) {
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

// SIMPLIFIED: Main extraction function that prioritizes comprehensive fraction extraction
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== SIMPLIFIED MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 600 chars):', text.substring(0, 600));
  
  let allExercises = [];
  
  // PHASE 1: Comprehensive fraction extraction (PRIMARY METHOD)
  console.log('\n=== PHASE 1: Comprehensive Fraction Extraction (PRIMARY) ===');
  const fractionExercises = extractAllFractionsAsExercises(text);
  console.log(`PHASE 1 RESULT: ${fractionExercises.length} exercises found`);
  
  if (fractionExercises.length > 0) {
    allExercises = [...allExercises, ...fractionExercises];
    console.log(`✅ Added ${fractionExercises.length} fraction exercises`);
  }
  
  // PHASE 2: Lettered exercise detection (SUPPLEMENTARY)
  console.log('\n=== PHASE 2: Lettered Exercise Detection (SUPPLEMENTARY) ===');
  const letteredExercises = extractLetteredExercises(text);
  console.log(`PHASE 2 RESULT: ${letteredExercises.length} exercises found`);
  
  // Add lettered exercises that aren't already covered by fraction exercises
  letteredExercises.forEach(letteredEx => {
    const alreadyExists = allExercises.some(ex => ex.question === letteredEx.question);
    if (!alreadyExists) {
      allExercises.push(letteredEx);
      console.log(`✅ Added unique lettered exercise: ${letteredEx.question}`);
    }
  });
  
  // PHASE 3: Numbered exercise detection (SUPPLEMENTARY)
  console.log('\n=== PHASE 3: Numbered Exercise Detection (SUPPLEMENTARY) ===');
  const numberedExercises = extractNumberedExercises(text);
  console.log(`PHASE 3 RESULT: ${numberedExercises.length} exercises found`);
  
  // Add numbered exercises that aren't already covered
  numberedExercises.forEach(numberedEx => {
    const alreadyExists = allExercises.some(ex => ex.question === numberedEx.question);
    if (!alreadyExists) {
      allExercises.push(numberedEx);
      console.log(`✅ Added unique numbered exercise: ${numberedEx.question}`);
    }
  });
  
  // PHASE 4: Smart math extraction (FALLBACK)
  if (allExercises.length === 0) {
    console.log('\n=== PHASE 4: Smart Math Extraction (FALLBACK) ===');
    const smartExercises = extractMathExercisesFromRawText(text);
    console.log(`PHASE 4 RESULT: ${smartExercises.length} exercises found`);
    allExercises = [...allExercises, ...smartExercises];
  }
  
  // PHASE 5: Delimiter-based extraction (FINAL FALLBACK)
  if (allExercises.length === 0) {
    console.log('\n=== PHASE 5: Delimiter-Based Fallback ===');
    const delimiterExercises = extractWithDelimiters(text);
    console.log(`PHASE 5 RESULT: ${delimiterExercises.length} exercises found`);
    allExercises = [...allExercises, ...delimiterExercises];
  }
  
  // PHASE 6: Emergency single-exercise extraction
  if (allExercises.length === 0) {
    console.log('\n=== PHASE 6: Emergency Single Exercise ===');
    if (text.trim().length > 0) {
      // Look for any math content
      const fractionMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
        allExercises = [{
          question: `Simplifiez la fraction ${fraction}`,
          answer: fraction
        }];
        console.log(`PHASE 6: Created single fraction exercise: ${fraction}`);
      } else {
        allExercises = [{
          question: "Document Content",
          answer: text.trim().substring(0, 300)
        }];
        console.log(`PHASE 6: Created content-based exercise`);
      }
    }
  }
  
  console.log(`=== FINAL EXTRACTION RESULT: ${allExercises.length} exercises ===`);
  allExercises.forEach((ex, idx) => {
    console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
  });
  
  return allExercises;
}
