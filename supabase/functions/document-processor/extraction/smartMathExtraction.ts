// Enhanced mathematical exercise extraction with LaTeX support from SimpleTex

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

// Helper function to detect error/emergency text
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
  return errorIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
}

// Extract exercises from LaTeX-formatted text (SimpleTex output)
function extractFromLatexText(text: string): Array<{ question: string, answer: string }> {
  console.log('Attempting LaTeX-aware extraction...');
  
  const exercises = [];
  
  // STEP 1: Apply French math text preprocessing
  const cleanedText = preprocessSimpleTexOutput(text);
  console.log('Cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  
  // STEP 2: Look for exercise title and content
  const exerciseMatch = cleanedText.match(/EXERCICE\s+(\d+|[IVX]+)/i);
  const exerciseTitle = exerciseMatch ? `EXERCICE ${exerciseMatch[1]}` : 'EXERCICE';
  
  // STEP 3: Look for instruction text
  const instructionMatch = cleanedText.match(/(Simplifiez?|Calculez?|Résolvez?)[^.]*\./i);
  const instruction = instructionMatch ? instructionMatch[0] : 'Simplifiez les fractions suivantes';
  
  // STEP 4: Find fractions with specific patterns
  const fractionPatterns = [
    /(\d+)\s*\/\s*(\d+)\s*=?\s*/g, // Basic fractions like 30/63
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // Parenthesized fractions (30)/(63)
  ];
  
  let foundFractions = [];
  
  for (const pattern of fractionPatterns) {
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      const numerator = match[1];
      const denominator = match[2];
      foundFractions.push(`${numerator}/${denominator}`);
      console.log(`✅ Found fraction: ${numerator}/${denominator}`);
    }
    pattern.lastIndex = 0; // Reset for next pattern
  }
  
  // STEP 5: Create exercises from found fractions
  if (foundFractions.length > 0) {
    foundFractions.forEach((fraction, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, etc.
      exercises.push({
        question: `${letter}. Simplifiez la fraction ${fraction}`,
        answer: fraction
      });
      console.log(`✅ Created exercise: ${letter}. Simplifiez la fraction ${fraction}`);
    });
  }
  
  // STEP 6: If no fractions found, look for other math patterns
  if (exercises.length === 0) {
    const mathPatterns = [
      /(\d+[\+\-\×\÷]\d+)\s*=\s*(\d+)/g, // Simple operations
      /(\d+\.\d+)/g, // Decimal numbers
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
      pattern.lastIndex = 0;
    }
  }
  
  return exercises;
}

// Helper function to clean SimpleTex LaTeX output
function preprocessSimpleTexOutput(text: string): string {
  return text
    // Remove LaTeX alignment and array commands
    .replace(/\^\(aligned\)/g, '')
    .replace(/\^\(array\)/g, '')
    .replace(/\\\\\&/g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/\&\^/g, ' ')
    .replace(/c{10,}/g, '') // Remove long strings of 'c'
    
    // Fix French OCR errors
    .replace(/ERERCIE/g, 'EXERCICE')
    .replace(/Simpliffer/g, 'Simplifier')
    .replace(/fiactions/g, 'fractions')
    .replace(/Simpliffes/g, 'Simplifiez')
    
    // Clean up fraction formatting
    .replace(/\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, '$1/$2')
    .replace(/\s*~\s*/g, ' ')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Direct OCR-based exercise extraction using precise pattern matching
function extractMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('Starting direct OCR pattern extraction...');
  
  const exercises = [];
  
  // Step 1: Find all fractions and decimal numbers with precise pattern
  const fractionPattern = /\b(\d{1,3})\/(\d{1,3})\b/g;
  const decimalPattern = /\b(\d+\.\d+)\b/g;
  const mathExpressions = [];
  let fractionMatch, decimalMatch;
  
  // Find fractions
  while ((fractionMatch = fractionPattern.exec(rawText)) !== null) {
    mathExpressions.push({
      expression: fractionMatch[0],
      type: 'fraction',
      numerator: parseInt(fractionMatch[1]),
      denominator: parseInt(fractionMatch[2]),
      position: fractionMatch.index
    });
  }
  
  // Find decimal numbers
  while ((decimalMatch = decimalPattern.exec(rawText)) !== null) {
    mathExpressions.push({
      expression: decimalMatch[0],
      type: 'decimal',
      value: parseFloat(decimalMatch[1]),
      position: decimalMatch.index
    });
  }
  
  console.log('Found math expressions in text:', mathExpressions);
  
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
  
  // Step 3: Create exercises by associating markers with math expressions
  if (exerciseMarkers.length > 0 && mathExpressions.length > 0) {
    // Sort markers and expressions by position
    exerciseMarkers.sort((a, b) => a.position - b.position);
    mathExpressions.sort((a, b) => a.position - b.position);
    
    // Try to match each marker with the closest expression after it
    for (let i = 0; i < exerciseMarkers.length && i < mathExpressions.length; i++) {
      const marker = exerciseMarkers[i];
      const expr = mathExpressions[i];
      
      let questionText = '';
      if (expr.type === 'fraction') {
        questionText = `${marker.marker}. Simplifie la fraction ${expr.expression}`;
      } else if (expr.type === 'decimal') {
        questionText = `${marker.marker}. Calcule avec le nombre décimal ${expr.expression}`;
      }
      
      exercises.push({
        question: questionText,
        answer: expr.expression
      });
      
      console.log(`✅ Created exercise: ${questionText}`);
    }
  } else if (mathExpressions.length > 0) {
    // No markers found, but we have expressions - create exercises directly
    console.log('No exercise markers found, creating exercises from math expressions directly');
    
    mathExpressions.forEach((expr, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, etc.
      let questionText = '';
      
      if (expr.type === 'fraction') {
        questionText = `${letter}. Simplifie la fraction ${expr.expression}`;
      } else if (expr.type === 'decimal') {
        questionText = `${letter}. Calcule avec le nombre décimal ${expr.expression}`;
      }
      
      exercises.push({
        question: questionText,
        answer: expr.expression
      });
      
      console.log(`✅ Created exercise: ${questionText}`);
    });
  }
  
  // Step 4: Validation - ensure we have real math expressions and not endless dots
  const validExercises = exercises.filter(ex => {
    const hasValidFraction = ex.answer.match(/^\d+\/\d+$/);
    const hasValidDecimal = ex.answer.match(/^\d+\.\d+$/);
    const isNotDots = !ex.answer.includes('...');
    return (hasValidFraction || hasValidDecimal) && isNotDots;
  });
  
  console.log(`Validation: ${exercises.length} raw exercises -> ${validExercises.length} valid exercises`);
  
  // Step 5: Final fallback if no valid exercises found
  if (validExercises.length === 0) {
    console.log('No valid exercises found, creating fallback from detected patterns');
    
    // Look for any number patterns that might be fractions or decimals
    const fractionPairs = rawText.match(/\d+\s*\/\s*\d+/g);
    const decimalNumbers = rawText.match(/\d+\.\d+/g);
    
    if (fractionPairs && fractionPairs.length > 0) {
      fractionPairs.slice(0, 5).forEach((pair, index) => {
        const cleanPair = pair.replace(/\s/g, '');
        const letter = String.fromCharCode(97 + index);
        validExercises.push({
          question: `${letter}. Simplifie la fraction ${cleanPair}`,
          answer: cleanPair
        });
      });
    }
    
    if (decimalNumbers && decimalNumbers.length > 0) {
      decimalNumbers.slice(0, 3).forEach((decimal, index) => {
        const letter = String.fromCharCode(97 + validExercises.length + index);
        validExercises.push({
          question: `${letter}. Calcule avec le nombre décimal ${decimal}`,
          answer: decimal
        });
      });
    }
  }
  
  console.log(`Final result: ${validExercises.length} valid exercises extracted`);
  return validExercises;
}