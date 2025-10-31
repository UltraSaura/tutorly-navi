
import { detectMultipleExercises } from './multiExerciseDetector.ts';
import { extractSmartMathExercises } from './smartMathExtraction.ts';

export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('\n🚀 === EXERCISE EXTRACTION COORDINATOR ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 300 chars):', text.substring(0, 300));
  
  let allExercises = [] as Array<{ question: string, answer: string }>;
  
  // PHASE 1: ENHANCED MULTI-EXERCISE DETECTION (PRIMARY METHOD)
  console.log('\n🎯 === PHASE 1: ENHANCED MULTI-EXERCISE DETECTION ===');
  const multiExercises = detectMultipleExercises(text);
  
  if (multiExercises.length > 0) {
    console.log(`✅ Enhanced detection found ${multiExercises.length} exercises - using as primary result`);
    allExercises = multiExercises.map(ex => ({
      question: `${ex.letter}. ${ex.question}`,
      answer: ex.answer || "" // Only use student-provided answer, empty if none
    }));
    
    multiExercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}: ${ex.letter}. ${ex.question} -> Answer: "${ex.answer || 'NO ANSWER PROVIDED'}"`);
    });
    
    return allExercises;
  }
  
  // PHASE 2: SMART MATH EXTRACTION (FALLBACK)
  console.log('\n🔍 === PHASE 2: SMART MATH EXTRACTION ===');
  const smartExercises = extractSmartMathExercises(text);
  
  if (smartExercises.length > 0) {
    console.log(`✅ Smart extraction found ${smartExercises.length} exercises`);
    allExercises = [...allExercises, ...smartExercises];
    
    smartExercises.forEach((ex, idx) => {
      console.log(`Smart Exercise ${idx + 1}: ${ex.question} -> Answer: "${ex.answer || 'NO ANSWER PROVIDED'}"`);
    });
    
    return allExercises;
  }
  
  // PHASE 3: FRACTION-BASED EXTRACTION (SUPPLEMENTARY)
  console.log('\n📊 === PHASE 3: FRACTION-BASED EXTRACTION ===');
  const fractionExercises = extractAllFractionsAsExercises(text);
  
  if (fractionExercises.length > 0) {
    console.log(`Found ${fractionExercises.length} fraction-based exercises`);
    
    // Add non-duplicate exercises
    for (const newEx of fractionExercises) {
      const isDuplicate = allExercises.some(existing => 
        existing.question.includes(newEx.question.replace(/^[a-e]\.\s*/, '')) ||
        existing.answer === newEx.answer
      );
      
      if (!isDuplicate) {
        allExercises.push(newEx);
        console.log(`Added fraction exercise: ${newEx.question} -> ${newEx.answer || 'NO ANSWER PROVIDED'}`);
      }
    }
  }
  
  // PHASE 4: EMERGENCY SINGLE-EXERCISE CREATION
  if (allExercises.length === 0) {
    console.log('\n🚨 === PHASE 4: EMERGENCY SINGLE-EXERCISE CREATION ===');
    
    // Look for any fraction pattern to create a single exercise
    const anyFraction = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (anyFraction) {
      allExercises = [{
        question: `Simplifiez la fraction ${anyFraction[1]}/${anyFraction[2]}`,
        answer: "" // No answer provided - student needs to enter one
      }];
      console.log(`Emergency: Created single fraction exercise: ${anyFraction[1]}/${anyFraction[2]} (no answer provided)`);
    } else if (text.trim().length > 0) {
      // Generic fallback
      allExercises = [{
        question: text.trim().substring(0, 200) + (text.length > 200 ? '...' : ''),
        answer: "" // No answer provided - student needs to enter one
      }];
      console.log('Emergency: Created generic exercise from text');
    }
  }
  
  console.log(`\n✅ FINAL RESULT: ${allExercises.length} exercises extracted`);
  allExercises.forEach((ex, idx) => {
    console.log(`Final Exercise ${idx + 1}: ${ex.question} -> Answer: "${ex.answer || 'NEEDS STUDENT INPUT'}"`);
  });
  
  return allExercises;
}

// Enhanced function to extract all fractions as separate exercises
function extractAllFractionsAsExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED FRACTION EXTRACTION ===');
  const exercises: Array<{ question: string, answer: string }> = [];
  const foundFractions = new Set<string>();
  
  // Enhanced fraction patterns
  const patterns = [
    /\((\d+)\)\/(\((\d+)\))/g,
    /\\frac\{(\d+)\}\{(\d+)\}/g,
    /(\d+)\s*\/\s*(\d+)/g,
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g,
  ];
  
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      const fraction = `${num}/${den}`;
      
      if (num > 0 && den > 0 && !foundFractions.has(fraction)) {
        foundFractions.add(fraction);
      }
    }
  }
  
  // Create exercises for each unique fraction found - but don't provide answers
  Array.from(foundFractions).forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index);
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: "" // No answer provided - student needs to enter one
    });
  });
  
  console.log(`Found ${exercises.length} fraction exercises (all need student answers)`);
  return exercises;
}
