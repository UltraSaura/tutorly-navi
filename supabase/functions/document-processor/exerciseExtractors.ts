
// Tiered extraction approach: Pattern-based first, then Vision API fallback
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== TIER 1: Pattern-Based Extraction ===');
  console.log('Input text length:', text.length);
  console.log('Raw text:', text);
  
  // Preprocessing pipeline for French math worksheets
  const preprocessedText = preprocessFrenchMathText(text);
  console.log('Preprocessed text:', preprocessedText);
  
  // Try structured extraction first
  let exercises = extractStructuredExercises(preprocessedText);
  
  if (exercises.length > 0) {
    console.log(`TIER 1 SUCCESS: Found ${exercises.length} exercises using pattern matching`);
    return exercises;
  }
  
  console.log('=== TIER 2: Mathematical Content Detection ===');
  exercises = extractMathematicalContent(preprocessedText);
  
  if (exercises.length > 0) {
    console.log(`TIER 2 SUCCESS: Found ${exercises.length} exercises using math detection`);
    return exercises;
  }
  
  console.log('=== TIER 3: Fallback Extraction ===');
  exercises = createFallbackExercises(text);
  console.log(`TIER 3: Created ${exercises.length} fallback exercises`);
  
  return exercises;
}

// Preprocessing pipeline specifically for French educational worksheets
function preprocessFrenchMathText(text: string): string {
  console.log('Preprocessing French educational text...');
  
  return text
    // Clean up excessive dots from completion lines (major issue causing single exercise extraction)
    .replace(/\.{4,}/g, '___') // Replace 4+ dots with placeholder
    .replace(/_{4,}/g, '___') // Replace 4+ underscores with placeholder
    .replace(/\s+\.{3,}\s+/g, ' ___ ') // Isolated dot sequences
    
    // Remove LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French
    .replace(/([a-zA-Z0-9])\s*,\s*/g, '$1. ')  // Fix a, -> a.
    .replace(/([a-zA-Z0-9])\s*\.\s*/g, '$1. ') // Normalize spacing
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    .replace(/=\s*/g, '= ')
    
    // Normalize exercise separators
    .replace(/([a-zA-Z0-9]\s*[.\)])\s*([a-zA-Z0-9]\s*[.\)])/g, '$1\n$2') // Separate exercises on new lines
    
    // Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Structured extraction for French worksheet format - UNIVERSAL PATTERNS
function extractStructuredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Universal exercise patterns for French worksheets
  const universalPatterns = [
    // Numbers with dots: 1., 2., 3., 10., 15., etc.
    /(\d+)\s*\.\s*([^0-9]+?)(?=\s*\d+\s*\.|$)/gi,
    // Letters with dots: a., b., c., d., etc.
    /([a-h])\s*\.\s*([^a-h\.]+?)(?=\s*[a-h]\s*\.|$)/gi,
    // Numbers with parentheses: 1), 2), 3), etc.
    /(\d+)\s*\)\s*([^0-9)]+?)(?=\s*\d+\s*\)|$)/gi,
    // Letters with parentheses: a), b), c), etc.
    /([a-h])\s*\)\s*([^a-h)]+?)(?=\s*[a-h]\s*\)|$)/gi,
    // Exercise keywords: Exercice 1:, Ex 2:, Problème 3:, Question 4:
    /((?:exercice|ex|problème|question)\s*\d*\s*[:\.]?)\s*([^E]+?)(?=\s*(?:exercice|ex|problème|question)|$)/gi,
    // Roman numerals: I., II., III., IV., etc.
    /([IVX]+)\s*\.\s*([^IVX\.]+?)(?=\s*[IVX]+\s*\.|$)/gi
  ];
  
  // Try each pattern
  for (const pattern of universalPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const identifier = match[1];
      const content = match[2].trim();
      
      // Validate that this looks like educational content
      if (isEducationalContent(content)) {
        exercises.push({
          question: `${identifier}. ${content}`,
          answer: ""
        });
        console.log(`Universal extraction found: ${identifier}. ${content}`);
      }
    }
    
    // If we found exercises with this pattern, return them
    if (exercises.length > 0) {
      console.log(`Found ${exercises.length} exercises using pattern: ${pattern.source}`);
      return exercises;
    }
  }
  
  return exercises;
}

// Check if content contains educational/mathematical elements
function isEducationalContent(content: string): boolean {
  const educationalIndicators = [
    /\d+\/\d+/, // fractions
    /\d+\s*[+\-×÷]\s*\d+/, // operations
    /=/, // equals
    /\d+/, // any numbers
    /(calcul|résoudre|simplifi|réduire|complet|écris|trouve)/i, // French educational keywords
    /[A-Za-z]{3,}/ // meaningful text (not just single characters)
  ];
  
  return educationalIndicators.some(pattern => pattern.test(content)) && 
         content.length > 2 &&
         !/^[.\s_-]+$/.test(content); // not just dots, spaces, underscores, or dashes
}

// Extract any mathematical content as exercises
function extractMathematicalContent(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Find fraction patterns with context
  const fractionPattern = /([a-z]\s*\.\s*.*?\d+\/\d+.*?)(?=[a-z]\s*\.|$)/gi;
  let match;
  
  while ((match = fractionPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 3) {
      exercises.push({
        question: content,
        answer: ""
      });
      console.log(`Math content found: ${content}`);
    }
  }
  
  // If still no matches, try simpler fraction detection
  if (exercises.length === 0) {
    const simpleFractions = text.match(/\d+\/\d+/g);
    if (simpleFractions) {
      simpleFractions.forEach((fraction, index) => {
        const context = extractContextAroundFraction(text, fraction);
        exercises.push({
          question: `Exercise ${index + 1}: ${context}`,
          answer: ""
        });
      });
    }
  }
  
  return exercises;
}

// Extract context around a fraction
function extractContextAroundFraction(text: string, fraction: string): string {
  const index = text.indexOf(fraction);
  if (index === -1) return fraction;
  
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + fraction.length + 15);
  return text.substring(start, end).trim();
}

// Create fallback exercises when pattern matching fails
function createFallbackExercises(text: string): Array<{ question: string, answer: string }> {
  if (text.length < 10) {
    return [];
  }
  
  // Split text into chunks that might be exercises
  const chunks = text.split(/\n+/).filter(chunk => chunk.trim().length > 5);
  
  return chunks.slice(0, 5).map((chunk, index) => ({
    question: `Exercise ${index + 1}: ${chunk.trim()}`,
    answer: ""
  }));
}

