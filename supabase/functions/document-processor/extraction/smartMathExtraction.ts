
// Enhanced mathematical exercise extraction with LaTeX support from SimpleTex

import { preprocessFrenchMathText } from './textPreprocessing.ts';

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED MATH PATTERN EXTRACTION ===');
  console.log('Raw text length:', rawText.length);
  console.log('Raw text preview:', rawText.substring(0, 300));
  
  // Skip extraction if this looks like an error message or emergency text
  if (isErrorText(rawText)) {
    console.log('⚠️ Detected error/emergency text, skipping exercise extraction');
    return [];
  }
  
  // First try LaTeX-aware extraction (for SimpleTex output)
  const latexExercises = extractFromLatexText(rawText);
  if (latexExercises.length > 0) {
    console.log(`✅ Found ${latexExercises.length} exercises using LaTeX extraction`);
    return latexExercises;
  }
  
  // Fallback to pure OCR-based extraction with direct pattern matching
  console.log('🔄 Falling back to OCR-based pattern extraction');
  return extractMathExercisesDirectly(rawText);
}

// Helper function to detect error/emergency text (more restrictive to allow SimpleTex LaTeX)
function isErrorText(text: string): boolean {
  const errorIndicators = [
    'OCR extraction failed',
    'manual review required',
    'could not be processed automatically',
    'Document uploaded at',
    'Status: OCR extraction failed',
    'Try uploading again',
    'emergency text extraction'
  ];
  
  const lowerText = text.toLowerCase();
  // Only consider it error text if it contains these AND doesn't have math content
  const hasErrorIndicator = errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
  const hasMathContent = /\d+\/\d+|\d+\.\d+|exercice|fraction/i.test(text);
  
  return hasErrorIndicator && !hasMathContent;
}

// Extract exercises from LaTeX-formatted text (SimpleTex output)
function extractFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('Attempting LaTeX-aware extraction...');
  
  const exercises = [];
  
  // STEP 1: Apply comprehensive French math text preprocessing
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text (first 500 chars):', cleanedText.substring(0, 500));
  console.log('Cleaned text length:', cleanedText.length);
  
  // STEP 2: Look for exercise title and content
  const exerciseMatch = cleanedText.match(/EXERCICE\s+(\d+|[IVX]+)/i);
  const exerciseTitle = exerciseMatch ? `EXERCICE ${exerciseMatch[1]}` : 'EXERCICE';
  
  // STEP 3: Enhanced pattern matching for question-answer pairs with better OCR error handling
  const questionAnswerPatterns = [
    // Pattern for "a. 30/63 = 41/55" (question = student answer)
    /([a-h])\.\s*(\d+\/\d+)\s*=\s*(\d+\/\d+)/gi,
    // Pattern for "a. 30/63 = ... 41/55 ..." (question with dots = student answer)
    /([a-h])\.\s*(\d+\/\d+)\s*=\s*[.\s]*(\d+\/\d+)/gi,
    // Pattern for "a. 30/63 _____ 41/55" (question with lines = student answer)
    /([a-h])\.\s*(\d+\/\d+)\s*[_\-.]+\s*(\d+\/\d+)/gi,
    // Pattern for fractions with parentheses and equals
    /([a-h])\.\s*\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)\s*=\s*(\d+\/\d+)/gi,
    // Pattern for decimals that should be fractions: "a. 30/6.3 = 41/55"
    /([a-h])\.\s*(\d+)\/(\d+)\.(\d+)\s*=\s*(\d+\/\d+)/gi,
  ];
  
  console.log('Looking for question-answer patterns...');
  
  for (const pattern of questionAnswerPatterns) {
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      const letter = match[1];
      let questionFraction, studentAnswer;
      
      if (match.length === 4) {
        // Standard pattern: letter, question fraction, student answer
        questionFraction = match[2];
        studentAnswer = match[3];
      } else if (match.length === 5) {
        // Parentheses pattern: letter, numerator, denominator, student answer
        questionFraction = `${match[2]}/${match[3]}`;
        studentAnswer = match[4];
      } else if (match.length === 6) {
        // Decimal fraction pattern: letter, numerator, denominator, decimal, student answer
        questionFraction = `${match[2]}/${match[3]}${match[4]}`;
        studentAnswer = match[5];
      }
      
      if (questionFraction && studentAnswer) {
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${questionFraction}`,
          answer: studentAnswer
        });
        console.log(`✅ Found question-answer pair: ${letter}. ${questionFraction} = ${studentAnswer}`);
      }
    }
    pattern.lastIndex = 0; // Reset for next pattern
  }
  
  // STEP 4: If no question-answer pairs found, try to find questions without answers
  if (exercises.length === 0) {
    console.log('No question-answer pairs found, looking for questions only...');
    
    const fractionPatterns = [
      /([a-h])\.\s*(\d+)\s*\/\s*(\d+)/gi, // Basic fractions like a. 30/63
      /([a-h])\.\s*\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/gi, // Parenthesized fractions
      /([a-h])\.\s*(\d+)\/(\d+)\.(\d+)/gi, // Decimal fractions like a. 30/6.3
    ];
    
    for (const pattern of fractionPatterns) {
      let match;
      while ((match = pattern.exec(cleanedText)) !== null) {
        const letter = match[1];
        let numerator, denominator;
        
        if (match.length === 4) {
          numerator = match[2];
          denominator = match[3];
        } else if (match.length === 5) {
          // Decimal fraction pattern
          numerator = match[2];
          denominator = `${match[3]}${match[4]}`;
        }
        
        if (numerator && denominator) {
          const fraction = `${numerator}/${denominator}`;
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: "" // No student answer found
          });
          console.log(`✅ Found question without answer: ${letter}. ${fraction}`);
        }
      }
      pattern.lastIndex = 0;
    }
  }
  
  // STEP 5: If we still have no exercises, try to extract from any fraction patterns
  if (exercises.length === 0) {
    console.log('No lettered exercises found, trying to extract any fractions...');
    
    // Look for any fraction patterns in the text
    const allFractionMatches = cleanedText.match(/\d+\/\d+/g);
    if (allFractionMatches && allFractionMatches.length > 0) {
      console.log('Found fractions in text:', allFractionMatches);
      
      // Try to pair them up as questions and answers
      const uniqueFractions = [...new Set(allFractionMatches)];
      
      if (uniqueFractions.length >= 2) {
        // Assume first half are questions, second half are answers
        const midPoint = Math.floor(uniqueFractions.length / 2);
        const questions = uniqueFractions.slice(0, midPoint);
        const answers = uniqueFractions.slice(midPoint);
        
        questions.forEach((questionFraction, index) => {
          const letter = String.fromCharCode(97 + index);
          const answerFraction = answers[index] || "";
          
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${questionFraction}`,
            answer: answerFraction
          });
          console.log(`✅ Created paired exercise: ${letter}. ${questionFraction} → ${answerFraction}`);
        });
      } else {
        // Just create questions from all fractions
        uniqueFractions.forEach((fraction, index) => {
          const letter = String.fromCharCode(97 + index);
          
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: ""
          });
          console.log(`✅ Created question-only exercise: ${letter}. ${fraction}`);
        });
      }
    }
  }
  
  return exercises;
}

// Direct OCR-based exercise extraction with enhanced answer recognition
function extractMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('Starting direct OCR pattern extraction with answer recognition...');
  
  const exercises = [];
  
  // Step 1: Look for complete question-answer patterns first (with OCR error handling)
  const questionAnswerPatterns = [
    // Pattern for "a. 30/63 = 41/55"
    /([a-h])\.\s*(\d+\/\d+)\s*=\s*(\d+\/\d+)/gi,
    // Pattern for "a. 30/63 ... 41/55" (with dots or spaces)
    /([a-h])\.\s*(\d+\/\d+)\s*[.\s_-]+\s*(\d+\/\d+)/gi,
    // Pattern for lettered exercises with equals and student answers
    /([a-h])\.\s*([^=]+)\s*=\s*(\d+\/\d+)/gi,
    // Pattern for decimal fractions that should be regular fractions
    /([a-h])\.\s*(\d+)\/(\d+)\.(\d+)\s*=\s*(\d+\/\d+)/gi,
  ];
  
  console.log('Looking for question-answer patterns in OCR text...');
  
  for (const pattern of questionAnswerPatterns) {
    let match;
    while ((match = pattern.exec(rawText)) !== null) {
      const letter = match[1];
      let questionPart, studentAnswer;
      
      if (match.length === 4) {
        // Standard pattern
        questionPart = match[2].trim();
        studentAnswer = match[3];
      } else if (match.length === 6) {
        // Decimal fraction pattern
        questionPart = `${match[2]}/${match[3]}${match[4]}`;
        studentAnswer = match[5];
      }
      
      // Clean up the question part
      if (questionPart && questionPart.match(/^\d+\/\d+$/)) {
        // If it's just a fraction, format it properly
        questionPart = `Simplifiez la fraction ${questionPart}`;
      }
      
      if (questionPart && studentAnswer) {
        exercises.push({
          question: `${letter}. ${questionPart}`,
          answer: studentAnswer
        });
        console.log(`✅ Found complete exercise: ${letter}. ${questionPart} → ${studentAnswer}`);
      }
    }
    pattern.lastIndex = 0;
  }
  
  // Step 2: If no complete patterns found, look for questions without answers
  if (exercises.length === 0) {
    console.log('No complete patterns found, looking for questions only...');
    
    const fractionPatterns = [
      /([a-h])\.\s*(\d+\/\d+)/gi,
      /([a-h])\.\s*(\d+)\/(\d+)\.(\d+)/gi, // Handle decimal fractions
    ];
    
    for (const pattern of fractionPatterns) {
      let match;
      while ((match = pattern.exec(rawText)) !== null) {
        const letter = match[1];
        let fraction;
        
        if (match.length === 3) {
          fraction = match[2];
        } else if (match.length === 5) {
          // Decimal fraction - convert to regular fraction
          fraction = `${match[2]}/${match[3]}${match[4]}`;
        }
        
        if (fraction) {
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: "" // No student answer found
          });
          console.log(`✅ Found question without answer: ${letter}. ${fraction}`);
        }
      }
      pattern.lastIndex = 0;
    }
  }
  
  // Step 3: Enhanced fallback - look for any fractions and try to associate them with answers
  if (exercises.length === 0) {
    console.log('Trying enhanced fallback extraction...');
    
    // Find all fractions in the text (including decimal fractions)
    const allFractions = [...rawText.matchAll(/\d+\/\d+(?:\.\d+)?/g)];
    console.log(`Found ${allFractions.length} fractions in text:`, allFractions.map(m => m[0]));
    
    if (allFractions.length >= 2) {
      // Try to pair fractions - assume first half are questions, second half are answers
      const midPoint = Math.floor(allFractions.length / 2);
      const questions = allFractions.slice(0, midPoint);
      const answers = allFractions.slice(midPoint);
      
      questions.forEach((questionMatch, index) => {
        const letter = String.fromCharCode(97 + index);
        let questionFraction = questionMatch[0];
        
        // Fix decimal fractions
        if (questionFraction.includes('.')) {
          questionFraction = questionFraction.replace(/\/(\d+)\.(\d+)/, '/$1$2');
        }
        
        const answerFraction = answers[index] ? answers[index][0] : "";
        
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${questionFraction}`,
          answer: answerFraction
        });
        console.log(`✅ Paired exercise: ${letter}. ${questionFraction} → ${answerFraction}`);
      });
    }
  }
  
  // Step 4: Final validation and cleanup
  const validExercises = exercises.filter(ex => {
    const hasValidQuestion = ex.question.length > 5 && ex.question.includes('fraction');
    const hasValidAnswer = !ex.answer || ex.answer.match(/^\d+\/\d+$/);
    return hasValidQuestion && hasValidAnswer;
  });
  
  console.log(`Final validation: ${exercises.length} raw exercises → ${validExercises.length} valid exercises`);
  
  return validExercises;
}
