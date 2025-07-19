
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

// Extract exercises from LaTeX-formatted text (SimpleTex output) - FIXED VERSION
function extractFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('Attempting LaTeX-aware extraction...');
  
  const exercises = [];
  
  // STEP 1: Apply comprehensive French math text preprocessing
  const cleanedText = preprocessFrenchMathText(text);
  console.log('Cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  console.log('Cleaned text length:', cleanedText.length);
  
  // STEP 2: Look for exercise title and content
  const exerciseMatch = cleanedText.match(/EXERCICE\s+(\d+|[IVX]+)/i);
  const exerciseTitle = exerciseMatch ? `EXERCICE ${exerciseMatch[1]}` : 'EXERCICE';
  
  // STEP 3: Look for instruction text
  const instructionMatch = cleanedText.match(/(Simplifiez?|Calculez?|Résolvez?)[^.]*\./i);
  const instruction = instructionMatch ? instructionMatch[0] : 'Simplifiez les fractions suivantes';
  
  // STEP 4: Find ALL fractions with comprehensive patterns - FIXED LOOP
  const fractionPatterns = [
    /(\d+)\s*\/\s*(\d+)/g, // Basic fractions like 30/63
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions (30)/(63)
    /(\d+)\s*÷\s*(\d+)/g, // Division symbol
    /frac\{(\d+)\}\{(\d+)\}/g, // LaTeX fraction format
  ];
  
  let allFoundFractions = [];
  
  // Process each pattern to find ALL matches
  for (const pattern of fractionPatterns) {
    let match;
    const matches = [];
    
    // Collect all matches for this pattern
    while ((match = pattern.exec(cleanedText)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      const fraction = `${numerator}/${denominator}`;
      
      // Avoid duplicates
      if (!allFoundFractions.includes(fraction)) {
        matches.push(fraction);
        allFoundFractions.push(fraction);
        console.log(`✅ Found fraction: ${fraction} at position ${match.index}`);
      }
    }
    
    console.log(`Pattern ${pattern.source} found ${matches.length} unique fractions:`, matches);
  }
  
  console.log(`Total unique fractions found: ${allFoundFractions.length}`, allFoundFractions);
  
  // STEP 5: Create exercises from ALL found fractions
  if (allFoundFractions.length > 0) {
    allFoundFractions.forEach((fraction, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, d, e, etc.
      exercises.push({
        question: `${letter}. Simplifiez la fraction ${fraction}`,
        answer: fraction
      });
      console.log(`✅ Created exercise ${index + 1}: ${letter}. Simplifiez la fraction ${fraction}`);
    });
  }
  
  // STEP 6: If no fractions found, look for other math patterns
  if (exercises.length === 0) {
    console.log('No fractions found, searching for other math patterns...');
    
    const mathPatterns = [
      /(\d+[\+\-\×\÷]\d+)\s*=?\s*(\d+)?/g, // Simple operations
      /(\d+\.\d+)/g, // Decimal numbers
      /(\d+)\s*(fois|times)\s*(\d+)/gi, // Multiplication in words
    ];
    
    for (const pattern of mathPatterns) {
      let match;
      while ((match = pattern.exec(cleanedText)) !== null && exercises.length < 5) {
        const expression = match[1] || match[0];
        const letter = String.fromCharCode(97 + exercises.length);
        exercises.push({
          question: `${letter}. Calculez: ${expression}`,
          answer: expression
        });
        console.log(`✅ Created math exercise: ${expression}`);
      }
    }
  }
  
  // STEP 7: Fallback - if still no exercises, try to extract from any numeric content
  if (exercises.length === 0) {
    console.log('Still no exercises found, trying fallback extraction...');
    
    // Look for any numbers that might be fractions or exercises
    const numbersPattern = /(\d+)[\/\s]*(\d+)/g;
    let match;
    let fallbackExercises = [];
    
    while ((match = numbersPattern.exec(cleanedText)) !== null && fallbackExercises.length < 5) {
      const num1 = match[1];
      const num2 = match[2];
      
      // Only consider it a fraction if it makes sense (numerator < 100, denominator < 100)
      if (parseInt(num1) < 100 && parseInt(num2) < 100 && parseInt(num1) !== parseInt(num2)) {
        const fraction = `${num1}/${num2}`;
        const letter = String.fromCharCode(97 + fallbackExercises.length);
        fallbackExercises.push({
          question: `${letter}. Simplifiez la fraction ${fraction}`,
          answer: fraction
        });
        console.log(`✅ Created fallback exercise: ${letter}. Simplifiez la fraction ${fraction}`);
      }
    }
    
    exercises.push(...fallbackExercises);
  }
  
  console.log(`Final LaTeX extraction result: ${exercises.length} exercises created`);
  return exercises;
}

// Direct OCR-based exercise extraction using precise pattern matching - ENHANCED VERSION
function extractMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('Starting direct OCR pattern extraction...');
  
  const exercises = [];
  
  // Step 1: Find ALL fractions and decimal numbers with comprehensive patterns
  const fractionPatterns = [
    /\b(\d{1,3})\/(\d{1,3})\b/g, // Simple fractions
    /\(\s*(\d{1,3})\s*\)\s*\/\s*\(\s*(\d{1,3})\s*\)/g, // Parenthesized fractions
    /(\d{1,3})\s*÷\s*(\d{1,3})/g, // Division symbol
  ];
  
  const decimalPattern = /\b(\d+\.\d+)\b/g;
  const mathExpressions = [];
  
  // Process each fraction pattern
  for (const pattern of fractionPatterns) {
    let fractionMatch;
    while ((fractionMatch = pattern.exec(rawText)) !== null) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      
      // Validate fraction makes sense
      if (numerator > 0 && denominator > 0 && numerator < 1000 && denominator < 1000) {
        mathExpressions.push({
          expression: `${numerator}/${denominator}`,
          type: 'fraction',
          numerator: numerator,
          denominator: denominator,
          position: fractionMatch.index
        });
        console.log(`✅ Found valid fraction: ${numerator}/${denominator} at position ${fractionMatch.index}`);
      }
    }
  }
  
  // Find decimal numbers
  let decimalMatch;
  while ((decimalMatch = decimalPattern.exec(rawText)) !== null) {
    mathExpressions.push({
      expression: decimalMatch[0],
      type: 'decimal',
      value: parseFloat(decimalMatch[1]),
      position: decimalMatch.index
    });
    console.log(`✅ Found decimal: ${decimalMatch[0]} at position ${decimalMatch.index}`);
  }
  
  console.log('Total math expressions found:', mathExpressions.length);
  
  // Step 2: Find exercise markers (a., b., c., etc.)
  const exerciseMarkerPattern = /\b([a-h])\.\s*/gi;
  const exerciseMarkers = [];
  let markerMatch;
  
  while ((markerMatch = exerciseMarkerPattern.exec(rawText)) !== null) {
    exerciseMarkers.push({
      marker: markerMatch[1].toLowerCase(),
      position: markerMatch.index
    });
  }
  
  console.log('Found exercise markers:', exerciseMarkers);
  
  // Step 3: Create exercises - prioritize matching markers with expressions
  if (exerciseMarkers.length > 0 && mathExpressions.length > 0) {
    // Sort both by position
    exerciseMarkers.sort((a, b) => a.position - b.position);
    mathExpressions.sort((a, b) => a.position - b.position);
    
    // Match each marker with closest expression
    const maxExercises = Math.min(exerciseMarkers.length, mathExpressions.length);
    for (let i = 0; i < maxExercises; i++) {
      const marker = exerciseMarkers[i];
      const expr = mathExpressions[i];
      
      let questionText = '';
      if (expr.type === 'fraction') {
        questionText = `${marker.marker}. Simplifiez la fraction ${expr.expression}`;
      } else if (expr.type === 'decimal') {
        questionText = `${marker.marker}. Calculez avec le nombre décimal ${expr.expression}`;
      }
      
      exercises.push({
        question: questionText,
        answer: expr.expression
      });
      
      console.log(`✅ Created matched exercise: ${questionText}`);
    }
  } else if (mathExpressions.length > 0) {
    // No markers found, create exercises from all math expressions
    console.log(`No exercise markers found, creating ${mathExpressions.length} exercises from math expressions`);
    
    mathExpressions.forEach((expr, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, d, e, etc.
      let questionText = '';
      
      if (expr.type === 'fraction') {
        questionText = `${letter}. Simplifiez la fraction ${expr.expression}`;
      } else if (expr.type === 'decimal') {
        questionText = `${letter}. Calculez avec le nombre décimal ${expr.expression}`;
      }
      
      exercises.push({
        question: questionText,
        answer: expr.expression
      });
      
      console.log(`✅ Created exercise from expression: ${questionText}`);
    });
  }
  
  // Step 4: Final validation and deduplication
  const validExercises = exercises.filter((ex, index, self) => {
    const hasValidFraction = ex.answer.match(/^\d+\/\d+$/);
    const hasValidDecimal = ex.answer.match(/^\d+\.\d+$/);
    const isNotDots = !ex.answer.includes('...');
    const isUnique = self.findIndex(other => other.answer === ex.answer) === index;
    
    return (hasValidFraction || hasValidDecimal) && isNotDots && isUnique;
  });
  
  console.log(`Validation: ${exercises.length} raw exercises -> ${validExercises.length} valid unique exercises`);
  
  return validExercises;
}
