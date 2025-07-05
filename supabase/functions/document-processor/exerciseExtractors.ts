
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
    
    // AGGRESSIVE exercise separation - force line breaks between exercise markers
    .replace(/([a-h]\s*[\.\)])(\s*)([a-h]\s*[\.\)])/gi, '$1\n$3') // a. b. -> a.\nb.
    .replace(/(\d+\s*[\.\)])(\s*)(\d+\s*[\.\)])/g, '$1\n$3') // 1. 2. -> 1.\n2.
    .replace(/([IVX]+\s*\.)(\s*)([IVX]+\s*\.)/gi, '$1\n$3') // I. II. -> I.\nII.
    .replace(/(exercice\s*\d*)(\s*[:\.]?\s*)(exercice\s*\d*)/gi, '$1\n$3') // Exercice separation
    
    // Clean up whitespace while preserving structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Structured extraction for French worksheet format - SMART SPLITTING
function extractStructuredExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting smart exercise extraction...');
  
  // Try character-by-character scanning for exercise markers
  const exercises = scanForExerciseMarkers(text);
  
  if (exercises.length > 0) {
    console.log(`Smart scanning found ${exercises.length} exercises`);
    return exercises;
  }
  
  // Fallback to pattern-based extraction with better splitting
  return extractWithImprovedPatterns(text);
}

// Character-by-character scanning for exercise markers
function scanForExerciseMarkers(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  const exerciseMarkers = [
    /^([a-h])\s*[\.\)]/, // a. or a)
    /^(\d+)\s*[\.\)]/, // 1. or 1)
    /^([IVX]+)\s*\./, // I. II. III.
    /^(exercice|ex|problème|question)\s*\d*/i // Exercise keywords
  ];
  
  // Split text into lines and scan each line
  const lines = text.split(/\n+/);
  let currentExercise = '';
  let currentMarker = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this line starts with an exercise marker
    let isNewExercise = false;
    let marker = '';
    
    for (const pattern of exerciseMarkers) {
      const match = line.match(pattern);
      if (match) {
        marker = match[1];
        isNewExercise = true;
        break;
      }
    }
    
    if (isNewExercise) {
      // Save previous exercise if it exists
      if (currentExercise && currentMarker) {
        const cleanContent = currentExercise.replace(/^[a-zA-Z0-9IVX]+[\.\)]\s*/, '').trim();
        if (isEducationalContent(cleanContent)) {
          exercises.push({
            question: `${currentMarker}. ${cleanContent}`,
            answer: ""
          });
          console.log(`Scanned exercise: ${currentMarker}. ${cleanContent.substring(0, 50)}...`);
        }
      }
      
      // Start new exercise
      currentExercise = line;
      currentMarker = marker;
    } else if (currentExercise) {
      // Continue building current exercise
      currentExercise += ' ' + line;
    }
  }
  
  // Don't forget the last exercise
  if (currentExercise && currentMarker) {
    const cleanContent = currentExercise.replace(/^[a-zA-Z0-9IVX]+[\.\)]\s*/, '').trim();
    if (isEducationalContent(cleanContent)) {
      exercises.push({
        question: `${currentMarker}. ${cleanContent}`,
        answer: ""
      });
      console.log(`Final scanned exercise: ${currentMarker}. ${cleanContent.substring(0, 50)}...`);
    }
  }
  
  return exercises;
}

// Improved pattern-based extraction with better content limits
function extractWithImprovedPatterns(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  console.log('Using improved pattern extraction...');
  
  // More precise patterns with content length limits
  const patterns = [
    // Letters with dots - limit content to reasonable length
    /([a-h])\s*\.\s*([^a-h\n]{3,150})(?=\s*[a-h]\s*\.|$)/gi,
    // Numbers with dots
    /(\d+)\s*\.\s*([^\d\n]{3,150})(?=\s*\d+\s*\.|$)/gi,
    // Letters with parentheses  
    /([a-h])\s*\)\s*([^a-h\n]{3,150})(?=\s*[a-h]\s*\)|$)/gi,
    // Numbers with parentheses
    /(\d+)\s*\)\s*([^\d\n]{3,150})(?=\s*\d+\s*\)|$)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      const identifier = match[1];
      const content = match[2].trim();
      
      if (isEducationalContent(content) && content.length < 200) {
        exercises.push({
          question: `${identifier}. ${content}`,
          answer: ""
        });
        console.log(`Pattern found: ${identifier}. ${content.substring(0, 50)}...`);
      }
    }
    
    if (exercises.length > 0) {
      console.log(`Pattern ${pattern.source} found ${exercises.length} exercises`);
      break; // Use first successful pattern
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

