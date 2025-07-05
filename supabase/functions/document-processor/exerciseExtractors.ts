
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

// Preprocessing pipeline specifically for French math worksheets
function preprocessFrenchMathText(text: string): string {
  console.log('Preprocessing French math text...');
  
  return text
    // Remove LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French
    .replace(/([a-zA-Z])\s*,\s*/g, '$1. ')  // a, -> a.
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. ') // normalize spacing
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // normalize fractions
    .replace(/=\s*/g, '= ')
    
    // Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Structured extraction for French worksheet format
function extractStructuredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Template for French math exercises: letter. mathematical_content
  const exerciseRegex = /([a-h])\s*\.\s*([^a-h\.]+?)(?=\s*[a-h]\s*\.|$)/gi;
  
  let match;
  while ((match = exerciseRegex.exec(text)) !== null) {
    const letter = match[1];
    const content = match[2].trim();
    
    // Validate that this looks like a math exercise
    if (isMathematicalContent(content)) {
      exercises.push({
        question: `${letter.toLowerCase()}. ${content}`,
        answer: ""
      });
      console.log(`Structured extraction found: ${letter}. ${content}`);
    }
  }
  
  return exercises;
}

// Check if content contains mathematical elements
function isMathematicalContent(content: string): boolean {
  const mathIndicators = [
    /\d+\/\d+/, // fractions
    /\d+\s*[+\-×÷]\s*\d+/, // operations
    /=/, // equals
    /\d+/, // any numbers
    /(calcul|résoudre|simplifi|réduire)/i // French math keywords
  ];
  
  return mathIndicators.some(pattern => pattern.test(content)) && content.length > 2;
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

