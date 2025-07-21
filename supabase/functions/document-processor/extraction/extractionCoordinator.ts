
// ENHANCED: Comprehensive extraction coordinator with robust multi-exercise detection

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';
import { isEducationalContent } from './validationUtils.ts';
import { detectMultipleExercises } from './multiExerciseDetector.ts';
import { enhancedWorksheetPreprocessing } from './enhancedOCRPreprocessor.ts';

// ENHANCED: Main extraction function with robust multi-exercise detection
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('\n🚀 === ENHANCED MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 300 chars):', text.substring(0, 300));
  
  let allExercises = [];
  
  // PHASE 1: ENHANCED MULTI-EXERCISE DETECTION (PRIMARY METHOD)
  console.log('\n🎯 === PHASE 1: ENHANCED MULTI-EXERCISE DETECTION ===');
  const multiExercises = detectMultipleExercises(text);
  console.log(`🎯 PHASE 1 RESULT: ${multiExercises.length} exercises found`);
  
  if (multiExercises.length >= 1) {
    console.log(`✅ Enhanced detection found ${multiExercises.length} exercises - using as primary result`);
    allExercises = multiExercises.map(ex => ({
      question: `${ex.letter}. ${ex.question}`,
      answer: ex.answer || ex.fraction
    }));
    
    multiExercises.forEach((ex, idx) => {
      console.log(`  Enhanced Exercise ${idx + 1}: ${ex.letter}. ${ex.question} -> ${ex.answer || ex.fraction}`);
    });
    
    // If we have 5 exercises (typical worksheet), return immediately
    if (allExercises.length === 5) {
      console.log('\n🏆 === COMPLETE WORKSHEET DETECTED - RETURNING ALL 5 EXERCISES ===');
      allExercises.forEach((ex, idx) => {
        console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
      });
      console.log('🏆 === ENHANCED EXTRACTION COMPLETE ===\n');
      return allExercises;
    }
  }
  
  // PHASE 2: SUPPLEMENTARY EXTRACTION (only if we don't have enough)
  if (allExercises.length < 3) {
    console.log('\n🔄 === PHASE 2: SUPPLEMENTARY EXTRACTION ===');
    
    // Enhanced preprocessing for supplementary extraction
    const preprocessedText = enhancedWorksheetPreprocessing(text);
    
    // Try comprehensive fraction extraction
    const fractionExercises = extractAllFractionsAsExercises(preprocessedText);
    console.log(`🔄 PHASE 2 RESULT: ${fractionExercises.length} supplementary exercises found`);
    
    // Add non-duplicate exercises
    for (const newEx of fractionExercises) {
      const isDuplicate = allExercises.some(existing => 
        existing.question.includes(newEx.question.replace(/^[a-e]\.\s*/, '')) ||
        existing.answer === newEx.answer
      );
      
      if (!isDuplicate) {
        allExercises.push(newEx);
        console.log(`✅ Added supplementary exercise: ${newEx.question}`);
      }
    }
  }
  
  // PHASE 3: FALLBACK METHODS (only if still insufficient)
  if (allExercises.length === 0) {
    console.log('\n🆘 === PHASE 3: FALLBACK METHODS ===');
    
    // Smart math extraction fallback
    console.log('Trying smart math extraction...');
    const smartExercises = extractMathExercisesFromRawText(text);
    console.log(`Smart extraction found: ${smartExercises.length} exercises`);
    allExercises.push(...smartExercises);
    
    // Delimiter-based extraction fallback
    if (allExercises.length === 0) {
      console.log('Trying delimiter-based extraction...');
      const delimiterExercises = extractWithDelimiters(text);
      console.log(`Delimiter extraction found: ${delimiterExercises.length} exercises`);
      allExercises.push(...delimiterExercises);
    }
    
    // Emergency single-exercise creation
    if (allExercises.length === 0) {
      console.log('Creating emergency exercise...');
      const anyFraction = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (anyFraction) {
        allExercises = [{
          question: `Simplifiez la fraction ${anyFraction[1]}/${anyFraction[2]}`,
          answer: `${anyFraction[1]}/${anyFraction[2]}`
        }];
        console.log(`Emergency: Created single fraction exercise: ${anyFraction[1]}/${anyFraction[2]}`);
      } else if (text.trim().length > 0) {
        allExercises = [{
          question: "Document Content",
          answer: text.trim().substring(0, 200)
        }];
        console.log(`Emergency: Created content-based exercise`);
      }
    }
  }
  
  console.log('\n🏆 === FINAL ENHANCED EXTRACTION RESULTS ===');
  console.log(`Total exercises created: ${allExercises.length}`);
  allExercises.forEach((ex, idx) => {
    console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
  });
  console.log('🏆 === ENHANCED EXTRACTION COMPLETE ===\n');
  
  return allExercises;
}

// Enhanced function to extract all fractions as separate exercises
function extractAllFractionsAsExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED FRACTION EXTRACTION ===');
  const exercises = [];
  const foundFractions = new Set();
  
  // Enhanced fraction patterns
  const patterns = [
    /\((\d+)\)\/\((\d+)\)/g,
    /\\frac\{(\d+)\}\{(\d+)\}/g,
    /(\d+)\s*\/\s*(\d+)/g,
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      
      if (num > 0 && den > 0 && den > 1 && num < 1000 && den < 1000) {
        const fraction = `${num}/${den}`;
        foundFractions.add(fraction);
      }
    }
    pattern.lastIndex = 0;
  }
  
  // Create exercises from found fractions
  Array.from(foundFractions).forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index);
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    });
  });
  
  console.log(`Enhanced fraction extraction found ${exercises.length} exercises`);
  return exercises;
}
