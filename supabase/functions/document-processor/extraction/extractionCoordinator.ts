
// ENHANCED: Comprehensive extraction coordinator with robust multi-exercise detection

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';
import { isEducationalContent } from './validationUtils.ts';
import { detectMultipleExercises } from './multiExerciseDetector.ts';
import { enhancedWorksheetPreprocessing, preprocessFrenchMathText } from './enhancedOCRPreprocessor.ts';

// ENHANCED: Main extraction function with robust multi-exercise detection
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('\n🚀 === ENHANCED MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 300 chars):', text.substring(0, 300));
  
  let allExercises = [];
  
  // NEW: PHASE 0: DIRECT EXERCISE-ANSWER EXTRACTION 
  console.log('\n🎯 === PHASE 0: DIRECT EXERCISE-ANSWER EXTRACTION ===');
  const directExercises = extractExercisesWithAnswers(text);
  console.log(`🎯 PHASE 0 RESULT: ${directExercises.length} exercises with answers found`);
  
  if (directExercises.length >= 2) {
    console.log(`✅ Direct extraction found ${directExercises.length} exercises with answers - using as primary result`);
    directExercises.forEach((ex, idx) => {
      console.log(`  Direct Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    
    console.log('\n🏆 === DIRECT EXTRACTION SUCCESS - EXERCISES WITH ANSWERS FOUND ===');
    return directExercises;
  }

  // PHASE 1: ENHANCED MULTI-EXERCISE DETECTION (PRIMARY METHOD)
  console.log('\n🎯 === PHASE 1: ENHANCED MULTI-EXERCISE DETECTION ===');
  const multiExercises = detectMultipleExercises(text);
  console.log(`🎯 PHASE 1 RESULT: ${multiExercises.length} exercises found`);
  
    if (multiExercises.length >= 1) {
    console.log(`✅ Enhanced detection found ${multiExercises.length} exercises - using as primary result`);
    allExercises = multiExercises.map(ex => ({
      question: `${ex.letter}. ${ex.question}`,
      answer: ex.answer || "" // Use answer if found, otherwise empty
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
          answer: "" // Emergency exercises also have no user answer
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

// NEW: Extract exercises with answers in specific format (letter. fraction = answer...)
function extractExercisesWithAnswers(text: string): Array<{ question: string, answer: string }> {
  console.log('=== DIRECT EXERCISE-ANSWER EXTRACTION ===');
  console.log('Looking for pattern: letter. fraction = answer...');
  
  const exercises = [];
  
  // Enhanced patterns to match your document format: a. 30/63 = 41/55...
  const exerciseAnswerPatterns = [
    /([a-e])\s*[\.\)]\s*.*?(\d+)\s*\/\s*(\d+)\s*=\s*(\d+\/\d+)[\.\s]*/gi,
    /([a-e])\s*[\.\)]\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+\/\d+)[\.\s]*/gi,
    /([a-e])\s*[\.\)]\s*.*?(\d+)\s*\/\s*(\d+)\s*=\s*(\d+\/\d+)/gi,
  ];
  
  for (const pattern of exerciseAnswerPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toLowerCase();
      const numerator = match[2];
      const denominator = match[3];
      const answer = match[4];
      const fraction = `${numerator}/${denominator}`;
      
      // Validate fraction and answer
      if (parseInt(numerator) > 0 && parseInt(denominator) > 1 && answer.includes('/')) {
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${fraction}`,
          answer: answer
        });
        
        console.log(`✅ Found exercise with answer: ${letter}. ${fraction} = ${answer}`);
      }
    }
    pattern.lastIndex = 0;
  }
  
  console.log(`Direct extraction found ${exercises.length} exercises with answers`);
  return exercises;
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
  
  // Create exercises from found fractions - check for answers nearby
  Array.from(foundFractions).forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index);
    
    // Try to find an answer for this fraction in the text
    const answerRegex = new RegExp(`${fraction.replace('/', '\\/')}\\s*=\\s*(\\d+\\/\\d+)[\.\\s]*`, 'i');
    const answerMatch = text.match(answerRegex);
    
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: answerMatch ? answerMatch[1] : "" // Use found answer or empty
    });
    
    if (answerMatch) {
      console.log(`✅ Found answer for ${fraction}: ${answerMatch[1]}`);
    }
  });
  
  console.log(`Enhanced fraction extraction found ${exercises.length} exercises`);
  return exercises;
}
