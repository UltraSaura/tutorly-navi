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
  
  // Look for equation patterns in the text
  const equationPatterns = [
    // LaTeX equation format: expression = result
    /([^=\n]+)\s*=\s*([^=\n]+)/g,
    // Fraction equals patterns
    /(\d+\/\d+|\(\d+\)\/\(\d+\))\s*=\s*([0-9.,]+)/g,
    // Mathematical operations
    /([0-9+\-×÷()\/.,\s]+)\s*=\s*([0-9.,]+)/g
  ];
  
  let exerciseCount = 0;
  
  for (const pattern of equationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && exerciseCount < 10) {
      const left = match[1].trim();
      const right = match[2].trim();
      
      // Skip if either side is too long or contains non-math characters
      if (left.length > 50 || right.length > 20) continue;
      if (!/[\d\/\(\)+\-×÷=.,]/.test(left)) continue;
      
      const letter = String.fromCharCode(97 + exerciseCount);
      exercises.push({
        question: `${letter}. Calcule: ${left}`,
        answer: right
      });
      
      exerciseCount++;
      console.log(`✅ LaTeX exercise: ${left} = ${right}`);
    }
    
    // Reset regex for next pattern
    pattern.lastIndex = 0;
  }
  
  return exercises;
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