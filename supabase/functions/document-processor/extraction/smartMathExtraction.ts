// Enhanced mathematical exercise extraction with comprehensive OCR error correction

import { preprocessFrenchMathText, cleanHandwrittenAnswer, extractQuestionFraction } from './textPreprocessing.ts';
import { detectMultipleExercises } from './multiExerciseDetector.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED MULTI-EXERCISE MATH EXTRACTION WITH OCR CORRECTION ===');
  console.log('Raw text length:', rawText.length);
  console.log('Raw text preview:', rawText.substring(0, 400));
  
  // Skip extraction if this looks like an error message
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error text, skipping extraction');
    return [];
  }
  
  // NEW: Try multi-exercise detection first (for structured worksheets)
  console.log('🎯 Trying multi-exercise detection for structured worksheets...');
  const multiExercises = detectMultipleExercises(rawText);
  
  if (multiExercises.length >= 2) {
    console.log(`✅ Multi-exercise detection found ${multiExercises.length} exercises`);
    return multiExercises.map(ex => ({
      question: `${ex.letter}. ${ex.question}`,
      answer: ex.answer || ex.fraction
    }));
  }
  
  // Fallback to original comprehensive LaTeX-aware extraction with OCR correction
  const latexExercises = extractMultipleFromLatexTextWithOCRCorrection(rawText);
  console.log(`LaTeX extraction with OCR correction found ${latexExercises.length} exercises`);
  
  if (latexExercises.length > 0) {
    console.log(`✅ Found ${latexExercises.length} exercises using enhanced LaTeX extraction`);
    return latexExercises;
  }
  
  // Final fallback to direct OCR-based extraction with error correction
  console.log('🔄 Falling back to direct OCR extraction with correction');
  const ocrExercises = extractMultipleMathExercisesWithOCRCorrection(rawText);
  
  console.log(`=== FINAL SMART EXTRACTION RESULT: ${ocrExercises.length} exercises ===`);
  return ocrExercises;
}

function isErrorText(text: string): boolean {
  const errorIndicators = [
    'OCR extraction failed',
    'manual review required',
    'could not be processed automatically',
    'Status: OCR extraction failed'
  ];
  
  const lowerText = text.toLowerCase();
  const hasErrorIndicator = errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  const hasMathContent = /\d+\/\d+|\d+\.\d+|exercice|fraction/i.test(text);
  
  return hasErrorIndicator && !hasMathContent;
}

// ENHANCED: LaTeX extraction with OCR error correction
function extractMultipleFromLatexTextWithOCRCorrection(text: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE LATEX EXTRACTION WITH OCR CORRECTION ===');
  
  const exercises = [];
  
  // Apply enhanced preprocessing with OCR correction
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text for LaTeX extraction:', cleanedText.substring(0, 400));
  
  // Enhanced fraction detection patterns with OCR error tolerance
  const fractionPatterns = [
    /(\d+)\s*\/\s*(\d+)/g, // Basic fractions like 30/63
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions
    /\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, // Single parenthesized fractions
    /\\frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions
    /frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fractions without backslash
  ];
  
  const foundFractions = new Set();
  
  // Find ALL unique fractions using multiple patterns
  for (const pattern of fractionPatterns) {
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const fraction = `${numerator}/${denominator}`;
      
      // Enhanced validation for fractions
      if (isValidFraction(numerator, denominator)) {
        foundFractions.add(fraction);
        console.log(`✅ Found valid LaTeX fraction: ${fraction}`);
      } else {
        console.log(`❌ Rejected invalid fraction: ${fraction}`);
      }
    }
    pattern.lastIndex = 0; // Reset regex state
  }
  
  console.log(`Total unique LaTeX fractions found: ${foundFractions.size}`);
  console.log('All found fractions:', Array.from(foundFractions));
  
  // Create exercises from ALL found fractions with enhanced answer detection
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    
    // Try to extract student's handwritten answer
    const handwrittenAnswer = extractStudentAnswer(text, fraction);
    
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: handwrittenAnswer || fraction // Use handwritten answer if found, otherwise original fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created LaTeX exercise ${index + 1}: ${exercise.question} -> ${exercise.answer}`);
  });
  
  console.log(`=== LATEX EXTRACTION RESULT: ${exercises.length} exercises created from ${foundFractions.size} fractions ===`);
  return exercises;
}

// ENHANCED: Direct OCR extraction with error correction
function extractMultipleMathExercisesWithOCRCorrection(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== COMPREHENSIVE DIRECT OCR EXTRACTION WITH CORRECTION ===');
  
  const exercises = [];
  
  // Find all fractions in the text with OCR error tolerance
  const fractionPatterns = [
    /\b(\d{1,3})\/(\d{1,3})\b/g, // Basic fractions
    /\((\d{1,3})\/(\d{1,3})\)/g, // Parenthesized fractions
    /(\d{1,3})\s*\/\s*(\d{1,3})/g, // Fractions with spaces
  ];
  
  const foundFractions = new Set();
  
  // Use multiple patterns to find ALL fractions
  for (const pattern of fractionPatterns) {
    let fractionMatch;
    while ((fractionMatch = pattern.exec(rawText)) !== null) {
      const numerator = fractionMatch[1];
      const denominator = fractionMatch[2];
      
      // Enhanced validation
      if (isValidFraction(numerator, denominator)) {
        const fraction = `${numerator}/${denominator}`;
        foundFractions.add(fraction);
        console.log(`✅ Found valid OCR fraction: ${fraction}`);
      }
    }
    pattern.lastIndex = 0; // Reset regex state
  }
  
  console.log(`Total OCR fractions found: ${foundFractions.size}`);
  console.log('All OCR fractions:', Array.from(foundFractions));
  
  // Create exercises from ALL found fractions with answer detection
  const fractionsArray = Array.from(foundFractions);
  fractionsArray.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    
    // Try to extract student's answer
    const studentAnswer = extractStudentAnswer(rawText, fraction);
    
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: studentAnswer || fraction
    };
    exercises.push(exercise);
    console.log(`✅ Created OCR exercise ${index + 1}: ${exercise.question} -> ${exercise.answer}`);
  });
  
  // Enhanced fallback patterns if no fractions found
  if (exercises.length === 0) {
    console.log('No fractions found, looking for other math patterns...');
    
    // Look for decimal patterns
    const decimalPattern = /\b(\d+\.\d+)\b/g;
    const foundDecimals = new Set();
    let decimalMatch;
    
    while ((decimalMatch = decimalPattern.exec(rawText)) !== null && foundDecimals.size < 5) {
      const decimal = decimalMatch[1];
      foundDecimals.add(decimal);
      console.log(`✅ Found decimal: ${decimal}`);
    }
    
    Array.from(foundDecimals).forEach((decimal, index) => {
      const letter = String.fromCharCode(97 + index);
      exercises.push({
        question: `${letter}. Calculez avec le nombre décimal ${decimal}`,
        answer: decimal
      });
    });
  }
  
  console.log(`=== DIRECT OCR RESULT: ${exercises.length} exercises ===`);
  return exercises;
}

// NEW: Enhanced fraction validation
function isValidFraction(numerator: string, denominator: string): boolean {
  const num = parseInt(numerator);
  const den = parseInt(denominator);
  
  return num > 0 && den > 0 && den > 1 && num < 1000 && den < 1000 && den !== num;
}

// NEW: Extract student's handwritten answer near a question
function extractStudentAnswer(text: string, questionFraction: string): string | null {
  console.log(`Looking for student answer near question fraction: ${questionFraction}`);
  
  // Find the position of the question fraction
  const questionIndex = text.indexOf(questionFraction);
  if (questionIndex === -1) return null;
  
  // Look for answer in text after the question (within reasonable distance)
  const afterQuestion = text.substring(questionIndex + questionFraction.length, questionIndex + questionFraction.length + 200);
  console.log('Text after question:', afterQuestion.substring(0, 100));
  
  // Look for equals sign followed by a fraction or number
  const answerPatterns = [
    /=\s*(\d+\/\d+)/,  // = 41/55
    /=\s*(\d+\.\d+)/,  // = 0.75
    /=\s*(\d+)/,       // = 1
  ];
  
  for (const pattern of answerPatterns) {
    const match = afterQuestion.match(pattern);
    if (match) {
      const rawAnswer = match[1];
      const cleanedAnswer = cleanHandwrittenAnswer(rawAnswer);
      if (cleanedAnswer) {
        console.log(`Found student answer: ${cleanedAnswer}`);
        return cleanedAnswer;
      }
    }
  }
  
  console.log('No student answer found');
  return null;
}
