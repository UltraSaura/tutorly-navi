
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

// Enhanced preprocessing pipeline for French educational worksheets
function preprocessFrenchMathText(text: string): string {
  console.log('Aggressive preprocessing of French educational text...');
  console.log('Input text preview:', text.substring(0, 200));
  
  let cleanedText = text
    // AGGRESSIVE completion mark removal (major fix for single exercise issue)
    .replace(/\.{3,}/g, '___') // Replace 3+ dots with single placeholder
    .replace(/_{3,}/g, '___') // Replace 3+ underscores with single placeholder  
    .replace(/-{3,}/g, '___') // Replace 3+ dashes with single placeholder
    .replace(/\s*\.{2,}\s*/g, ' ___ ') // Isolated dot sequences with spacing
    .replace(/\s*_{2,}\s*/g, ' ___ ') // Isolated underscore sequences with spacing
    .replace(/\s*-{2,}\s*/g, ' ___ ') // Isolated dash sequences with spacing
    
    // Remove LaTeX and formatting artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes and normalize exercise markers
    .replace(/([a-zA-Z0-9])\s*,\s*/g, '$1. ')  // Fix a, -> a.
    .replace(/([0-9]+)\s*\.\s*/g, '$1. ')      // Normalize number spacing: 1. 
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. ')    // Normalize letter spacing: a.
    .replace(/([0-9]+)\s*\)\s*/g, '$1) ')      // Normalize parentheses: 1)
    .replace(/([a-zA-Z])\s*\)\s*/g, '$1) ')    // Normalize letter parentheses: a)
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')   // Normalize fractions
    .replace(/=\s*/g, '= ')                    // Normalize equals signs
    
    // Create clear exercise boundaries by forcing line breaks before exercise markers
    .replace(/\s+((?:\d+|[a-zA-Z])\s*[.\)])/g, '\n$1')
    .replace(/\s+((?:exercice|ex|problème|question)\s*\d*\s*[:\.]?)/gi, '\n$1')
    .replace(/\s+([IVX]+\s*\.)/g, '\n$1')
    
    // Clean up excessive whitespace while preserving line structure
    .replace(/[ \t]+/g, ' ')  // Multiple spaces/tabs to single space
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Multiple line breaks to double
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .trim();
    
  console.log('Cleaned text preview:', cleanedText.substring(0, 200));  
  console.log('Cleaned text line count:', cleanedText.split('\n').length);
  
  return cleanedText;
}

// Smart exercise boundary detection with character-by-character scanning
function extractStructuredExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART BOUNDARY DETECTION ===');
  const exercises = [];
  const lines = text.split('\n');
  
  let currentExercise = '';
  let exerciseCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    console.log(`Processing line ${i}: "${line}"`);
    
    // Check if this line starts with an exercise marker
    const exerciseMarkerMatch = line.match(/^(\d+\s*[.\)]|[a-zA-Z]\s*[.\)]|(?:exercice|ex|problème|question)\s*\d*\s*[:\.]?|[IVX]+\s*\.)/i);
    
    if (exerciseMarkerMatch) {
      // If we had a previous exercise, save it
      if (currentExercise.trim()) {
        const cleanContent = cleanExerciseContent(currentExercise);
        if (isEducationalContent(cleanContent)) {
          exercises.push({
            question: cleanContent,
            answer: ""
          });
          console.log(`Saved exercise ${exerciseCount + 1}: "${cleanContent.substring(0, 50)}..."`);
          exerciseCount++;
        }
      }
      
      // Start new exercise
      currentExercise = line;
      console.log(`New exercise started: "${line}"`);
    } else if (currentExercise) {
      // Continue current exercise
      currentExercise += ' ' + line;
      console.log(`Continuing exercise: "${line}"`);
    } else {
      // First line without marker - might be start of content
      currentExercise = line;
      console.log(`Starting content: "${line}"`);
    }
  }
  
  // Don't forget the last exercise
  if (currentExercise.trim()) {
    const cleanContent = cleanExerciseContent(currentExercise);
    if (isEducationalContent(cleanContent)) {
      exercises.push({
        question: cleanContent,
        answer: ""
      });
      console.log(`Saved final exercise: "${cleanContent.substring(0, 50)}..."`);
      exerciseCount++;
    }
  }
  
  console.log(`Smart boundary detection found ${exercises.length} exercises`);
  
  // If still no exercises, try fallback pattern matching
  if (exercises.length === 0) {
    console.log('Falling back to pattern matching...');
    return fallbackPatternMatching(text);
  }
  
  return exercises;
}

// Clean individual exercise content
function cleanExerciseContent(content: string): string {
  return content
    .replace(/_{3,}/g, '___')  // Normalize completion marks
    .replace(/\.{3,}/g, '___') // Normalize dot completion marks
    .replace(/\s+/g, ' ')      // Normalize spacing
    .trim();
}

// Fallback pattern matching for when smart detection fails
function fallbackPatternMatching(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Universal exercise patterns for French worksheets - more focused now
  const patterns = [
    // Numbers: 1., 2., 10., etc. - capture until next number or end
    /(\d+\s*\.\s*[^0-9]*?)(?=\d+\s*\.|$)/gi,
    // Letters: a., b., c., etc. - capture until next letter or end  
    /([a-zA-Z]\s*\.\s*[^a-zA-Z]*?)(?=[a-zA-Z]\s*\.|$)/gi,
    // Parentheses: 1), 2), a), b), etc.
    /([0-9a-zA-Z]\s*\)\s*[^0-9a-zA-Z)]*?)(?=[0-9a-zA-Z]\s*\)|$)/gi,
    // Exercise keywords
    /((?:exercice|ex|problème|question)\s*\d*\s*[:\.]?\s*[^E]*?)(?=(?:exercice|ex|problème|question)|$)/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const content = match[1].trim();
      if (isEducationalContent(content)) {
        exercises.push({
          question: cleanExerciseContent(content),
          answer: ""
        });
        console.log(`Pattern matching found: "${content.substring(0, 50)}..."`);
      }
    }
    
    if (exercises.length > 0) {
      console.log(`Pattern matching successful with ${exercises.length} exercises`);
      return exercises;
    }
  }
  
  return exercises;
}

// Enhanced content validation with recovery
function isEducationalContent(content: string): boolean {
  console.log(`Validating content: "${content.substring(0, 100)}..."`);
  
  // First check: not just completion marks
  if (/^[.\s_-]+$/.test(content) || content.length < 3) {
    console.log('Content rejected: too short or just completion marks');
    return false;
  }
  
  // Check for educational indicators
  const educationalIndicators = [
    /\d+\/\d+/, // fractions like 1/2, 3/4
    /\d+\s*[+\-×÷*]\s*\d+/, // arithmetic operations
    /\d+\s*=\s*\d+/, // equations
    /[0-9]+/, // any numbers (very common in math)
    /(calcul|résoudre|simplifi|réduire|complet|écris|trouve|égal|somme|différence|produit|quotient)/i, // French math keywords
    /[A-Za-z]{4,}/, // meaningful words (4+ chars to avoid false positives)
    /\([^)]*\)/, // parentheses expressions
    /\d+\s*(cm|m|kg|g|€|%)/, // units
  ];
  
  const hasEducationalContent = educationalIndicators.some(pattern => {
    const matches = pattern.test(content);
    if (matches) {
      console.log(`Content validated by pattern: ${pattern.source}`);
    }
    return matches;
  });
  
  // Additional check: meaningful text length
  const meaningfulTextLength = content.replace(/[.\s_-]/g, '').length;
  const hasMinimumContent = meaningfulTextLength >= 5;
  
  const isValid = hasEducationalContent && hasMinimumContent;
  console.log(`Content validation result: ${isValid} (educational: ${hasEducationalContent}, meaningful length: ${hasMinimumContent})`);
  
  return isValid;
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

// Enhanced fallback with content recovery
function createFallbackExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('=== FALLBACK EXERCISE CREATION ===');
  
  if (text.length < 10) {
    console.log('Text too short for fallback extraction');
    return [];
  }
  
  // Try to find mathematical content clusters
  const mathClusters = findMathematicalClusters(text);
  if (mathClusters.length > 0) {
    console.log(`Found ${mathClusters.length} mathematical content clusters`);
    return mathClusters.map((cluster, index) => ({
      question: `Mathematical Exercise ${index + 1}: ${cluster}`,
      answer: ""
    }));
  }
  
  // Split by meaningful line breaks and filter for content
  const meaningfulChunks = text
    .split(/\n+/)
    .map(chunk => cleanExerciseContent(chunk))
    .filter(chunk => chunk.length > 8 && !/^[.\s_-]+$/.test(chunk))
    .slice(0, 5); // Max 5 exercises
  
  if (meaningfulChunks.length > 0) {
    console.log(`Creating ${meaningfulChunks.length} fallback exercises from chunks`);
    return meaningfulChunks.map((chunk, index) => ({
      question: `Exercise ${index + 1}: ${chunk}`,
      answer: ""
    }));
  }
  
  // Last resort: single exercise from entire content
  console.log('Creating single fallback exercise from entire content');
  return [{
    question: `Document Content: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
    answer: ""
  }];
}

// Find clusters of mathematical content
function findMathematicalClusters(text: string): string[] {
  const clusters = [];
  const lines = text.split('\n');
  let currentCluster = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (currentCluster && isEducationalContent(currentCluster)) {
        clusters.push(currentCluster.trim());
        currentCluster = '';
      }
      continue;
    }
    
    // Check if line contains mathematical content
    if (/\d|[+\-×÷*=\/]|fraction|calcul/i.test(trimmedLine)) {
      currentCluster += (currentCluster ? ' ' : '') + trimmedLine;
    } else if (currentCluster) {
      // End of mathematical cluster
      if (isEducationalContent(currentCluster)) {
        clusters.push(currentCluster.trim());
      }
      currentCluster = '';
    }
  }
  
  // Don't forget the last cluster
  if (currentCluster && isEducationalContent(currentCluster)) {
    clusters.push(currentCluster.trim());
  }
  
  return clusters;
}

