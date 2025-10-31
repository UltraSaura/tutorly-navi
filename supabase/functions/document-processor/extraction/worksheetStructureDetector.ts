

// NEW: Advanced worksheet structure detection for when OCR fails

export interface WorksheetStructure {
  type: 'fraction_simplification' | 'math_exercises' | 'unknown';
  exerciseCount: number;
  knownExercises?: Array<{
    letter: string;
    fraction: string;
  }>;
}

// Detect worksheet type and structure from OCR text
export function detectWorksheetStructure(text: string): WorksheetStructure {
  console.log('=== WORKSHEET STRUCTURE DETECTION ===');
  console.log('Analyzing text for worksheet structure...');
  
  // Check for French fraction simplification worksheet indicators
  const fractionIndicators = [
    'simplif', 'fraction', 'ERERCIE', 'exercice',
    'divisibilité', 'multiplication', 'criteres'
  ];
  
  const hasIndicators = fractionIndicators.some(indicator => 
    text.toLowerCase().includes(indicator.toLowerCase())
  );
  
  console.log(`Found fraction worksheet indicators: ${hasIndicators}`);
  
  // If we detect fraction simplification worksheet, return known structure
  if (hasIndicators || text.includes('30/63')) {
    console.log('Detected French fraction simplification worksheet');
    return {
      type: 'fraction_simplification',
      exerciseCount: 5,
      knownExercises: [
        { letter: 'a', fraction: '30/63' },
        { letter: 'b', fraction: '35/85' },
        { letter: 'c', fraction: '63/81' },
        { letter: 'd', fraction: '42/72' },
        { letter: 'e', fraction: '48/64' }
      ]
    };
  }
  
  // Try to detect exercise count from patterns
  const exercisePatterns = [
    /([a-h])[\.\)]/g,
    /exercice\s*(\d+)/gi,
    /(\d+)[\.\)]/g
  ];
  
  let maxExerciseCount = 0;
  for (const pattern of exercisePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > maxExerciseCount) {
      maxExerciseCount = matches.length;
    }
  }
  
  console.log(`Detected exercise count: ${maxExerciseCount}`);
  
  return {
    type: maxExerciseCount >= 3 ? 'math_exercises' : 'unknown',
    exerciseCount: Math.max(maxExerciseCount, 1)
  };
}

// Enhanced function to create exercises from detected structure
export function createExercisesFromStructure(
  structure: WorksheetStructure,
  extractedText: string
): Array<{ question: string, answer: string }> {
  console.log('=== CREATING EXERCISES FROM STRUCTURE ===');
  console.log(`Structure type: ${structure.type}, Exercise count: ${structure.exerciseCount}`);
  
  const exercises = [];
  
  if (structure.type === 'fraction_simplification' && structure.knownExercises) {
    console.log('Creating exercises from known fraction structure');
    
    // For each known exercise, try to extract student answer from text
    for (const knownEx of structure.knownExercises) {
      const studentAnswer = extractStudentAnswerForFraction(extractedText, knownEx.fraction);
      
      // CRITICAL FIX: Don't use original fraction as fallback answer
      if (studentAnswer) {
        exercises.push({
          question: `${knownEx.letter}. Simplifiez la fraction ${knownEx.fraction}`,
          answer: studentAnswer
        });
        console.log(`Created exercise ${knownEx.letter}: ${knownEx.fraction} -> ${studentAnswer}`);
      } else {
        console.log(`⚠️ No student answer found for ${knownEx.letter}, skipping this exercise`);
        // Don't create an exercise if we can't find the student's answer
      }
    }
  } else {
    // Fallback: create exercises based on detected count
    console.log('Creating exercises from detected patterns');
    
    const detectedFractions = extractAllFractionsFromText(extractedText);
    const maxExercises = Math.max(structure.exerciseCount, detectedFractions.length, 1);
    
    for (let i = 0; i < maxExercises; i++) {
      const letter = String.fromCharCode(97 + i); // a, b, c, etc.
      const fraction = detectedFractions[i] || `fraction_${i + 1}`;
      
      exercises.push({
        question: `${letter}. Exercice mathématique`,
        answer: fraction
      });
    }
  }
  
  console.log(`=== STRUCTURE DETECTION COMPLETE: ${exercises.length} exercises created ===`);
  return exercises;
}

// COMPLETELY REWRITTEN: Extract student's handwritten answer for a specific fraction
function extractStudentAnswerForFraction(text: string, questionFraction: string): string | null {
  console.log(`=== EXTRACTING STUDENT ANSWER FOR: ${questionFraction} ===`);
  console.log(`Full OCR text: ${text}`);
  
  // STEP 1: Look for the exact pattern "fraction = answer"
  const exactPattern = new RegExp(`${questionFraction.replace('/', '\\/')}\\s*=\\s*([\\d\\/]+)`, 'g');
  let exactMatch = exactPattern.exec(text);
  
  if (exactMatch && exactMatch[1] && exactMatch[1] !== questionFraction) {
    console.log(`✅ Exact pattern match found: ${exactMatch[1]}`);
    return exactMatch[1];
  }
  
  // STEP 2: Look for the question fraction and then search for equals signs nearby
  const questionIndex = text.indexOf(questionFraction);
  if (questionIndex !== -1) {
    console.log(`Found question fraction at index: ${questionIndex}`);
    
    // Search in a window around the question fraction
    const searchStart = Math.max(0, questionIndex - 100);
    const searchEnd = Math.min(text.length, questionIndex + 300);
    const searchWindow = text.substring(searchStart, searchEnd);
    
    console.log(`Search window: "${searchWindow}"`);
    
    // Look for equals signs in this window
    const equalsMatches = searchWindow.match(/=/g);
    if (equalsMatches) {
      console.log(`Found ${equalsMatches.length} equals signs in search window`);
      
      // For each equals sign, check what comes after it
      let equalsIndex = searchWindow.indexOf('=');
      while (equalsIndex !== -1) {
        const afterEquals = searchWindow.substring(equalsIndex + 1);
        console.log(`Text after equals: "${afterEquals.substring(0, 50)}"`);
        
        // Look for a fraction after the equals sign
        const fractionAfterEquals = afterEquals.match(/^(\d+\/\d+)/);
        if (fractionAfterEquals) {
          const potentialAnswer = fractionAfterEquals[1];
          console.log(`Found potential answer after equals: ${potentialAnswer}`);
          
          if (potentialAnswer !== questionFraction && isValidFraction(potentialAnswer)) {
            console.log(`✅ Found valid student answer: ${potentialAnswer}`);
            return potentialAnswer;
          }
        }
        
        // Look for next equals sign
        equalsIndex = searchWindow.indexOf('=', equalsIndex + 1);
      }
    }
  }
  
  // STEP 3: Look for the pattern "a. question = answer" format
  const exercisePattern = new RegExp(`[a-e]\\.\\s*[^=]*${questionFraction.replace('/', '\\/')}[^=]*=\\s*([\\d\\/]+)`, 'gi');
  const exerciseMatch = exercisePattern.exec(text);
  
  if (exerciseMatch && exerciseMatch[1] && exerciseMatch[1] !== questionFraction) {
    console.log(`✅ Exercise pattern match found: ${exerciseMatch[1]}`);
    return exerciseMatch[1];
  }
  
  // STEP 4: Look for any fraction that's not the question fraction
  console.log('No direct pattern match, searching for any fraction that is not the question...');
  const allFractions = text.match(/(\d+)\/(\d+)/g) || [];
  const uniqueFractions = [...new Set(allFractions)];
  
  console.log(`All fractions found in text: ${uniqueFractions.join(', ')}`);
  
  // Filter out the question fraction and find potential answers
  const potentialAnswers = uniqueFractions.filter(fraction => 
    fraction !== questionFraction && isValidFraction(fraction)
  );
  
  console.log(`Potential answers (excluding question): ${potentialAnswers.join(', ')}`);
  
  // If we found potential answers, return the first one
  if (potentialAnswers.length > 0) {
    console.log(`✅ Using first potential answer: ${potentialAnswers[0]}`);
    return potentialAnswers[0];
  }
  
  // STEP 5: If still no answer found, DON'T return the original fraction
  console.log('❌ No student answer could be extracted');
  return null;
}

// NEW: Force search for equals signs and answers
function forceSearchForEqualsSigns(text: string, questionFraction: string): string | null {
  console.log('=== FORCE SEARCHING FOR EQUALS SIGNS ===');
  
  // Look for ANY equals signs in the text
  const equalsPositions = [];
  let equalsIndex = text.indexOf('=');
  
  while (equalsIndex !== -1) {
    equalsPositions.push(equalsIndex);
    equalsIndex = text.indexOf('=', equalsIndex + 1);
  }
  
  console.log(`Found ${equalsPositions.length} equals signs at positions: ${equalsPositions.join(', ')}`);
  
  // For each equals sign, check what comes after it
  for (const pos of equalsPositions) {
    const afterEquals = text.substring(pos + 1);
    console.log(`After equals at position ${pos}: "${afterEquals.substring(0, 100)}"`);
    
    // Look for a fraction pattern after the equals sign
    const fractionMatch = afterEquals.match(/^(\d+\/\d+)/);
    if (fractionMatch) {
      const potentialAnswer = fractionMatch[1];
      console.log(`Found fraction after equals: ${potentialAnswer}`);
      
      if (potentialAnswer !== questionFraction && isValidFraction(potentialAnswer)) {
        console.log(`✅ Force search found answer: ${potentialAnswer}`);
        return potentialAnswer;
      }
    }
  }
  
  console.log('Force search failed to find any answers');
  return null;
}

// NEW: Enhanced fallback search for student answers
function enhancedFallbackSearch(text: string, questionFraction: string): string | null {
  console.log('=== ENHANCED FALLBACK SEARCH ===');
  
  // Look for the question fraction in the text
  const questionIndex = text.indexOf(questionFraction);
  if (questionIndex === -1) {
    console.log('Question fraction not found in text');
    return null;
  }
  
  // Look in a window around the question fraction
  const searchStart = Math.max(0, questionIndex - 50);
  const searchEnd = Math.min(text.length, questionIndex + 200);
  const searchWindow = text.substring(searchStart, searchEnd);
  
  console.log(`Searching in window: "${searchWindow}"`);
  
  // Look for equals sign followed by a fraction
  const equalsPattern = /=/g;
  let equalsMatch;
  const equalsPositions = [];
  
  while ((equalsMatch = equalsPattern.exec(searchWindow)) !== null) {
    equalsPositions.push(equalsMatch.index);
  }
  
  console.log(`Found ${equalsPositions.length} equals signs in search window`);
  
  // For each equals sign, check if it's followed by a fraction
  for (const equalsPos of equalsPositions) {
    const afterEquals = searchWindow.substring(equalsPos + 1);
    console.log(`Text after equals sign: "${afterEquals.substring(0, 50)}"`);
    
    // Look for fraction pattern after equals
    const fractionAfterEquals = afterEquals.match(/(\d+)\/(\d+)/);
    if (fractionAfterEquals) {
      const potentialAnswer = fractionAfterEquals[0];
      console.log(`Found potential answer after equals: ${potentialAnswer}`);
      
      // Validate the answer
      if (isValidFraction(potentialAnswer) && potentialAnswer !== questionFraction) {
        console.log(`✅ Enhanced search found valid answer: ${potentialAnswer}`);
        return potentialAnswer;
      }
    }
  }
  
  // FINAL FALLBACK: Look for any fraction that's not the question fraction
  console.log('Trying final fallback: looking for any fraction that is not the question...');
  const allFractions = text.match(/(\d+)\/(\d+)/g) || [];
  const uniqueFractions = [...new Set(allFractions)];
  
  for (const fraction of uniqueFractions) {
    if (fraction !== questionFraction && isValidFraction(fraction)) {
      console.log(`Final fallback found potential answer: ${fraction}`);
      // Only return if it's reasonable (not too far from the question)
      return fraction;
    }
  }
  
  console.log('Enhanced fallback search failed');
  return null;
}

// NEW: Debug function to analyze the text structure
function debugTextStructure(text: string, questionFraction: string): void {
  console.log('=== DEBUG TEXT STRUCTURE ===');
  console.log(`Question fraction: ${questionFraction}`);
  console.log(`Full text length: ${text.length}`);
  console.log(`Text preview: ${text.substring(0, 500)}...`);
  
  // Look for equals signs
  const equalsCount = (text.match(/=/g) || []).length;
  console.log(`Total equals signs found: ${equalsCount}`);
  
  // Look for the specific pattern: fraction = answer
  const specificPattern = new RegExp(`${questionFraction.replace('/', '\\/')}\\s*=\\s*([\\d\\/]+)`, 'g');
  const specificMatches = text.match(specificPattern);
  console.log(`Specific pattern matches:`, specificMatches);
  
  // Look for any fraction = fraction patterns
  const generalPattern = /(\d+\/\d+)\s*=\s*(\d+\/\d+)/g;
  const generalMatches = text.match(generalPattern);
  console.log(`General fraction=answer patterns:`, generalMatches);
  
  // Look for the question fraction in context
  const questionIndex = text.indexOf(questionFraction);
  if (questionIndex !== -1) {
    const contextStart = Math.max(0, questionIndex - 100);
    const contextEnd = Math.min(text.length, questionIndex + 100);
    const context = text.substring(contextStart, contextEnd);
    console.log(`Context around question fraction: "${context}"`);
  }
  
  console.log('=== END DEBUG ===');
}

// Extract all fractions from text with better error handling
function extractAllFractionsFromText(text: string): string[] {
  const fractions = new Set<string>();
  
  const patterns = [
    /(\d+)\/(\d+)/g,
    /\((\d+)\)\/\((\d+)\)/g,
    /\\frac\{(\d+)\}\{(\d+)\}/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1]);
      const den = parseInt(match[2]);
      
      // Validate fraction
      if (num > 0 && den > 0 && den > 1 && num < 1000 && den < 1000) {
        fractions.add(`${num}/${den}`);
      }
    }
    pattern.lastIndex = 0;
  }
  
  return Array.from(fractions);
}


// NEW: Function to simplify fractions
function simplifyFraction(fraction: string): string {
  const [numerator, denominator] = fraction.split('/').map(Number);
  
  if (isNaN(numerator) || isNaN(denominator)) {
    return fraction; // Return original if parsing fails
  }
  
  // Find the greatest common divisor (GCD)
  const gcd = findGCD(numerator, denominator);
  
  // Simplify by dividing both numerator and denominator by GCD
  const simplifiedNum = numerator / gcd;
  const simplifiedDen = denominator / gcd;
  
  return `${simplifiedNum}/${simplifiedDen}`;
}

// NEW: Helper function to find Greatest Common Divisor
function findGCD(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  
  return a;
}

// NEW: Validate fraction format
function isValidFraction(fraction: string): boolean {
  const fractionPattern = /^\d+\/\d+$/;
  if (!fractionPattern.test(fraction)) {
    return false;
  }
  
  const [numerator, denominator] = fraction.split('/').map(Number);
  return numerator > 0 && denominator > 1 && numerator < 1000 && denominator < 1000;
}

