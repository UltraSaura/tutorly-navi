// ENHANCED: Comprehensive extraction coordinator with OCR error correction and better logging

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';
import { isEducationalContent } from './validationUtils.ts';
import { preprocessFrenchMathText, extractQuestionFraction } from './textPreprocessing.ts';
import { detectMultipleExercises } from './multiExerciseDetector.ts';

// ENHANCED: Main extraction function with comprehensive OCR correction and logging
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('\n🚀 === ENHANCED COMPREHENSIVE MULTI-EXERCISE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview (first 400 chars):', text.substring(0, 400));
  
  let allExercises = [];
  
  // PHASE 1: MULTI-EXERCISE DETECTION FOR STRUCTURED WORKSHEETS (NEW PRIMARY METHOD)
  console.log('\n🎯 === PHASE 1: STRUCTURED WORKSHEET MULTI-EXERCISE DETECTION ===');
  const structuredExercises = detectMultipleExercises(text);
  console.log(`🎯 PHASE 1 RESULT: ${structuredExercises.length} exercises found`);
  
  if (structuredExercises.length >= 2) {
    console.log(`✅ Structured detection found ${structuredExercises.length} exercises - using this as primary result`);
    allExercises = structuredExercises.map(ex => ({
      question: `${ex.letter}. ${ex.question}`,
      answer: ex.answer || ex.fraction
    }));
    
    structuredExercises.forEach((ex, idx) => {
      console.log(`  Structured Exercise ${idx + 1}: ${ex.letter}. ${ex.question} -> ${ex.answer || ex.fraction}`);
    });
    
    console.log('\n🏆 === FINAL ENHANCED EXTRACTION RESULTS ===');
    console.log(`Total exercises created: ${allExercises.length}`);
    allExercises.forEach((ex, idx) => {
      console.log(`Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
    console.log('🏆 === ENHANCED EXTRACTION COMPLETE ===\n');
    
    return allExercises;
  }
  
  // PHASE 2: COMPREHENSIVE FRACTION EXTRACTION WITH OCR CORRECTION (FALLBACK)
  console.log('\n🔄 === PHASE 2: COMPREHENSIVE FRACTION EXTRACTION WITH OCR CORRECTION ===');
  const fractionExercises = extractAllFractionsAsExercisesWithOCRCorrection(text);
  console.log(`🔄 PHASE 2 RESULT: ${fractionExercises.length} exercises found`);
  
  // ALWAYS add fraction exercises if found
  if (fractionExercises.length > 0) {
    allExercises = [...fractionExercises];
    console.log(`✅ Added ${fractionExercises.length} comprehensive fraction exercises to final results`);
    fractionExercises.forEach((ex, idx) => {
      console.log(`  Final Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
    });
  }
  
  // PHASE 3: ENHANCED SUPPLEMENTARY EXTRACTIONS
  console.log('\n🔄 === PHASE 3: ENHANCED SUPPLEMENTARY EXTRACTIONS ===');
  
  // Enhanced lettered exercise detection
  const letteredExercises = extractLetteredExercisesWithValidation(text);
  letteredExercises.forEach(letteredEx => {
    const alreadyExists = allExercises.some(ex => ex.question === letteredEx.question);
    if (!alreadyExists) {
      allExercises.push(letteredEx);
      console.log(`✅ Added unique lettered exercise: ${letteredEx.question}`);
    } else {
      console.log(`🔄 Skipped duplicate lettered exercise: ${letteredEx.question}`);
    }
  });
  
  // PHASE 4: FALLBACK METHODS (only if no exercises found yet)
  if (allExercises.length === 0) {
    console.log('\n🆘 === PHASE 4: FALLBACK METHODS ===');
    
    // Smart math extraction fallback
    console.log('Trying enhanced smart math extraction...');
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
      const questionFraction = extractQuestionFraction(text);
      if (questionFraction) {
        allExercises = [{
          question: `Simplifiez la fraction ${questionFraction}`,
          answer: questionFraction
        }];
        console.log(`Emergency: Created single fraction exercise: ${questionFraction}`);
      } else if (text.trim().length > 0) {
        allExercises = [{
          question: "Document Content",
          answer: text.trim().substring(0, 300)
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

// ENHANCED: Comprehensive function to extract ALL fractions as separate exercises with OCR correction
function extractAllFractionsAsExercisesWithOCRCorrection(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE FRACTION EXTRACTION WITH OCR CORRECTION (PRIMARY METHOD) ===');
  console.log('Input text length:', text.length);
  console.log('Raw text preview:', text.substring(0, 500));
  
  const exercises = [];
  
  // Apply OCR error correction preprocessing
  const preprocessedText = preprocessFrenchMathText(text);
  console.log('Preprocessed text preview:', preprocessedText.substring(0, 300));
  
  // Enhanced fraction patterns with OCR error tolerance
  const fractionPatterns = [
    /\((\d+)\)\/\((\d+)\)/g, // LaTeX style (30)/(63)
    /\\frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions \frac{30}{63}
    /frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions without backslash
    /(\d+)\s*\/\s*(\d+)/g, // Basic fractions with optional spaces
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, // Parenthesized fractions
  ];
  
  const foundFractions = new Map(); // Use Map to store fraction -> context
  
  // Process each pattern separately with enhanced logging
  for (let patternIndex = 0; patternIndex < fractionPatterns.length; patternIndex++) {
    const pattern = fractionPatterns[patternIndex];
    console.log(`\n--- Testing Pattern ${patternIndex + 1}: ${pattern} ---`);
    
    // Reset pattern state before each use
    pattern.lastIndex = 0;
    
    let match;
    let patternMatchCount = 0;
    
    // Use while loop with proper regex state management
    while ((match = pattern.exec(preprocessedText)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      
      // Enhanced validation
      const numValue = parseInt(numerator);
      const denValue = parseInt(denominator);
      
      if (numValue > 0 && denValue > 0 && denValue > 1 && numValue < 1000 && denValue < 1000) {
        const fraction = `${numerator}/${denominator}`;
        
        if (!foundFractions.has(fraction)) {
          // Store fraction with context for answer detection
          const context = getContextAroundMatch(preprocessedText, match.index, 100);
          foundFractions.set(fraction, context);
          patternMatchCount++;
          console.log(`✅ Pattern ${patternIndex + 1} found NEW fraction: ${fraction} (match ${patternMatchCount})`);
          console.log(`   Context: ${context.substring(0, 50)}...`);
        } else {
          console.log(`🔄 Pattern ${patternIndex + 1} found DUPLICATE fraction: ${fraction}`);
        }
      } else {
        console.log(`❌ Pattern ${patternIndex + 1} found INVALID fraction: ${numerator}/${denominator}`);
      }
    }
    
    console.log(`Pattern ${patternIndex + 1} total NEW matches: ${patternMatchCount}`);
    
    // Reset pattern state after use
    pattern.lastIndex = 0;
  }
  
  console.log(`\n=== COMPREHENSIVE EXTRACTION SUMMARY ===`);
  console.log(`Total unique fractions found: ${foundFractions.size}`);
  console.log('All unique fractions:', Array.from(foundFractions.keys()));
  
  // Create exercises from ALL found fractions with enhanced answer detection
  const fractionsArray = Array.from(foundFractions.entries());
  fractionsArray.forEach(([fraction, context], index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    
    // Try to extract student's answer from context
    const studentAnswer = extractAnswerFromContext(context, fraction);
    
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: studentAnswer || fraction // Use detected answer or fallback to original
    };
    exercises.push(exercise);
    console.log(`✅ Created exercise ${index + 1}: ${exercise.question}`);
    if (studentAnswer && studentAnswer !== fraction) {
      console.log(`   Student answer detected: ${studentAnswer}`);
    }
  });
  
  console.log(`=== FINAL COMPREHENSIVE RESULT: ${exercises.length} exercises created ===`);
  return exercises;
}

// NEW: Get context around a regex match
function getContextAroundMatch(text: string, matchIndex: number, contextLength: number): string {
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + contextLength);
  return text.substring(start, end);
}

// NEW: Extract student answer from context
function extractAnswerFromContext(context: string, questionFraction: string): string | null {
  console.log(`Extracting answer from context for ${questionFraction}`);
  
  // Look for equals sign followed by fraction or number
  const answerPatterns = [
    /=\s*(\d+\/\d+)/,  // = 41/55
    /=\s*(\d+\.\d+)/,  // = 0.75  
    /=\s*(\d+)/,       // = 1
  ];
  
  for (const pattern of answerPatterns) {
    const match = context.match(pattern);
    if (match) {
      const answer = match[1];
      // Validate the answer is different from question
      if (answer !== questionFraction) {
        console.log(`Found student answer: ${answer}`);
        return answer;
      }
    }
  }
  
  return null;
}

// Enhanced lettered exercise extraction with better validation
function extractLetteredExercisesWithValidation(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== ENHANCED LETTERED EXERCISE EXTRACTION ===');
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
        
        console.log(`Processing lettered content: "${content.substring(0, 50)}..."`);
        
        // Extract question fraction and student answer separately
        const questionFraction = extractQuestionFraction(content);
        if (questionFraction) {
          const studentAnswer = extractAnswerFromContext(content, questionFraction);
          
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${questionFraction}`,
            answer: studentAnswer || questionFraction
          });
          console.log(`✅ Created lettered exercise: ${letter}. Simplifiez la fraction ${questionFraction}`);
          if (studentAnswer) {
            console.log(`   Student answer: ${studentAnswer}`);
          }
        } else if (isEducationalContent(content) && content.length > 10) {
          // Fallback for other educational content
          exercises.push({
            question: `${letter}. ${content.substring(0, 100)}`,
            answer: content.substring(0, 50)
          });
          console.log(`✅ Created educational exercise: ${letter}. ${content.substring(0, 30)}...`);
        }
      });
      
      if (exercises.length > 0) break;
    }
  }
  
  console.log(`Enhanced lettered extraction result: ${exercises.length} exercises`);
  return exercises;
}
