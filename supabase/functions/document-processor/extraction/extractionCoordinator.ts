
// FIXED: Comprehensive extraction coordinator that prioritizes finding ALL fractions as separate exercises

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// FIXED: Comprehensive function to extract ALL fractions as separate lettered exercises
function extractAllFractionsAsExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE FRACTION EXTRACTION (PRIMARY METHOD) ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview:', text.substring(0, 500));
  
  const exercises = [];
  
  // FIXED: Multiple comprehensive fraction patterns with proper regex state management
  const fractionPatterns = [
    /\((\d+)\)\/\((\d+)\)/g, // LaTeX style (30)/(63)
    /\\frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions \frac{30}{63}
    /frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions without backslash
    /(\d+)\s*\/\s*(\d+)/g, // Basic fractions with optional spaces
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, // Parenthesized fractions
  ];
  
  const foundFractions = new Set(); // Use Set to avoid duplicates
  
  // FIXED: Process each pattern separately with proper state management
  for (let patternIndex = 0; patternIndex < fractionPatterns.length; patternIndex++) {
    const pattern = fractionPatterns[patternIndex];
    console.log(`\n--- Testing Pattern ${patternIndex + 1}: ${pattern} ---`);
    
    // Reset pattern state before each use
    pattern.lastIndex = 0;
    
    let match;
    let patternMatchCount = 0;
    
    // FIXED: Use while loop with proper regex state management
    while ((match = pattern.exec(text)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      
      // Validate fraction (reasonable numbers)
      const numValue = parseInt(numerator);
      const denValue = parseInt(denominator);
      
      if (numValue > 0 && denValue > 0 && denValue > 1 && numValue < 1000 && denValue < 1000) {
        const fraction = `${numerator}/${denominator}`;
        
        if (!foundFractions.has(fraction)) {
          foundFractions.add(fraction);
          patternMatchCount++;
          console.log(`✅ Pattern ${patternIndex + 1} found NEW fraction: ${fraction} (match ${patternMatchCount})`);
        } else {
          console.log(`🔄 Pattern ${patternIndex + 1} found DUPLICATE fraction: ${fraction}`);
        }
      } else {
        console.log(`❌ Pattern ${patternIndex + 1} found INVALID fraction: ${numerator}/${denominator}`);
      }
    }
    
    console.log(`Pattern ${patternIndex + 1} total matches: ${patternMatchCount}`);
    
    // Reset pattern state after use
    pattern.lastIndex = 0;
  }
  
  console.log(`\n=== COMPREHENSIVE EXTRACTION SUMMARY ===`);
  console.log(`Total unique fractions found: ${foundFractions.size}`);
  console.log('All unique fractions:', Array.from(foundFractions));
  
  // FIXED: Create exercises from ALL found fractions with lettered naming
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created exercise ${index + 1}: ${exercise.question}`);
  });
  
  console.log(`=== FINAL COMPREHENSIVE RESULT: ${exercises.length} exercises created ===`);
  return exercises;
}

// Enhanced lettered exercise extraction (supplementary)
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== LETTERED EXERCISE EXTRACTION (SUPPLEMENTARY) ===');
  const exercises = [];
  
  const patterns = [
    /(?:^|\n)\s*([a-h])[\.\)\:]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)\:]).*)*)/gim,
    /([a-h])\s*[\.\)\:]\s*([^a-h\n]+)/gi,
    /([a-h])\s*~\s*([^\n]+)/gi // For SimpleTex format like "a ~"
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    console.log(`Lettered pattern found ${matches.length} matches`);
    
    if (matches.length >= 1) {
      matches.forEach((match) => {
        const letter = match[1].toLowerCase();
        const content = match[2].trim();
        
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
        }
      });
      
      if (exercises.length > 0) break;
    }
  }
  
  console.log(`Lettered extraction result: ${exercises.length} exercises`);
  return exercises;
}

// Enhanced numbered exercise extraction (supplementary)
function extractNumberedExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== NUMBERED EXERCISE EXTRACTION (SUPPLEMENTARY) ===');
  const exercises = [];
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm;
  const matches = [...text.matchAll(numberedPattern)];
  
  console.log(`Numbered pattern found ${matches.length} matches`);
  
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
  
  console.log(`Numbered extraction result: ${exercises.length} exercises`);
  return exercises;
}

// FIXED: Main extraction function with comprehensive fraction extraction as PRIMARY method
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('\n🚀 === COMPREHENSIVE MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 400 chars):', text.substring(0, 400));
  
  let allExercises = [];
  
  // PHASE 1: COMPREHENSIVE FRACTION EXTRACTION (PRIMARY METHOD)
  console.log('\n🎯 === PHASE 1: COMPREHENSIVE FRACTION EXTRACTION (PRIMARY) ===');
  const fractionExercises = extractAllFractionsAsExercises(text);
  console.log(`🎯 PHASE 1 RESULT: ${fractionExercises.length} exercises found`);
  
  // ALWAYS add fraction exercises if found
  if (fractionExercises.length > 0) {
    allExercises = [...fractionExercises];
    console.log(`✅ Added ${fractionExercises.length} comprehensive fraction exercises to final results`);
    fractionExercises.forEach((ex, idx) => {
      console.log(`  Final Exercise ${idx + 1}: "${ex.question}"`);
    });
  }
  
  // PHASE 2: SUPPLEMENTARY EXTRACTIONS (only add unique exercises)
  console.log('\n🔄 === PHASE 2: SUPPLEMENTARY EXTRACTIONS ===');
  
  // Lettered exercise detection
  const letteredExercises = extractLetteredExercises(text);
  letteredExercises.forEach(letteredEx => {
    const alreadyExists = allExercises.some(ex => ex.question === letteredEx.question);
    if (!alreadyExists) {
      allExercises.push(letteredEx);
      console.log(`✅ Added unique lettered exercise: ${letteredEx.question}`);
    } else {
      console.log(`🔄 Skipped duplicate lettered exercise: ${letteredEx.question}`);
    }
  });
  
  // Numbered exercise detection
  const numberedExercises = extractNumberedExercises(text);
  numberedExercises.forEach(numberedEx => {
    const alreadyExists = allExercises.some(ex => ex.question === numberedEx.question);
    if (!alreadyExists) {
      allExercises.push(numberedEx);
      console.log(`✅ Added unique numbered exercise: ${numberedEx.question}`);
    } else {
      console.log(`🔄 Skipped duplicate numbered exercise: ${numberedEx.question}`);
    }
  });
  
  // PHASE 3: FALLBACK METHODS (only if no exercises found yet)
  if (allExercises.length === 0) {
    console.log('\n🆘 === PHASE 3: FALLBACK METHODS ===');
    
    // Smart math extraction fallback
    console.log('Trying smart math extraction...');
    const smartExercises = extractMathExercisesFromRawText(text);
    console.log(`Smart extraction found: ${smartExercises.length} exercises`);
    allExercises = [...allExercises, ...smartExercises];
    
    // Delimiter-based extraction fallback
    if (allExercises.length === 0) {
      console.log('Trying delimiter-based extraction...');
      const delimiterExercises = extractWithDelimiters(text);
      console.log(`Delimiter extraction found: ${delimiterExercises.length} exercises`);
      allExercises = [...allExercises, ...delimiterExercises];
    }
    
    // Emergency single-exercise extraction
    if (allExercises.length === 0) {
      console.log('Creating emergency single exercise...');
      if (text.trim().length > 0) {
        const fractionMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (fractionMatch) {
          const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
          allExercises = [{
            question: `Simplifiez la fraction ${fraction}`,
            answer: fraction
          }];
          console.log(`Emergency: Created single fraction exercise: ${fraction}`);
        } else {
          allExercises = [{
            question: "Document Content",
            answer: text.trim().substring(0, 300)
          }];
          console.log(`Emergency: Created content-based exercise`);
        }
      }
    }
  }
  
  console.log('\n🏆 === FINAL EXTRACTION RESULTS ===');
  console.log(`Total exercises created: ${allExercises.length}`);
  allExercises.forEach((ex, idx) => {
    console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
  });
  console.log('🏆 === EXTRACTION COMPLETE ===\n');
  
  return allExercises;
}
