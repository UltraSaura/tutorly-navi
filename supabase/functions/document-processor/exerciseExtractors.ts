
// Progressive extraction with delimiter detection and robust fallbacks
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== PROGRESSIVE EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Check for Vision API delimiters first
  console.log('=== PHASE 1: Delimiter-Based Extraction ===');
  let exercises = extractWithDelimiters(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 2: Advanced boundary detection with preprocessing
  console.log('=== PHASE 2: Boundary Detection ===');
  const processedText = preprocessFrenchMathText(text);
  console.log('Processed text:', processedText);
  
  exercises = extractWithBoundaryDetection(processedText);
  
  if (exercises.length > 1) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} exercises using boundary detection`);
    return exercises;
  }
  
  // PHASE 3: Content clustering fallback
  console.log('=== PHASE 3: Content Clustering ===');
  exercises = extractWithContentClustering(text);
  
  if (exercises.length > 1) {
    console.log(`PHASE 3 SUCCESS: Found ${exercises.length} exercises using content clustering`);
    return exercises;
  }
  
  // PHASE 4: Force split if content is substantial
  console.log('=== PHASE 4: Force Split Strategy ===');
  exercises = createForcedSplitExercises(text);
  console.log(`PHASE 4: Created ${exercises.length} exercises using forced split`);
  
  return exercises;
}

// PHASE 1: Extract exercises using Vision API delimiters
function extractWithDelimiters(text: string): Array<{ question: string, answer: string }> {
  console.log('Checking for EXERCISE_START/EXERCISE_END delimiters...');
  
  const delimiterPattern = /EXERCISE_START\s*(.*?)\s*EXERCISE_END/g;
  const exercises = [];
  let match;
  
  while ((match = delimiterPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content && content.length > 2) {
      exercises.push({
        question: content,
        answer: ""
      });
      console.log(`Delimiter extraction found: ${content.substring(0, 50)}...`);
    }
  }
  
  return exercises;
}

// PHASE 2: Boundary detection with aggressive preprocessing
function extractWithBoundaryDetection(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting boundary detection...');
  
  // Apply aggressive preprocessing for French math worksheets
  const processedText = preprocessFrenchMathText(text);
  
  // Use the existing smart scanning approach
  return scanForExerciseMarkers(processedText);
}

// Preprocessing pipeline specifically for French educational worksheets
function preprocessFrenchMathText(text: string): string {
  console.log('Preprocessing French educational text...');
  
  return text
    // Clean up excessive dots from completion lines
    .replace(/\.{4,}/g, ' ') // Replace 4+ dots with space
    .replace(/_{4,}/g, ' ') // Replace 4+ underscores with space
    .replace(/\s+\.{3,}\s+/g, ' ') // Remove isolated dot sequences
    
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

// PHASE 3: Content clustering approach
function extractWithContentClustering(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting content clustering...');
  
  // Look for mathematical content clusters
  const mathClusters = findMathematicalClusters(text);
  
  if (mathClusters.length > 1) {
    console.log(`Found ${mathClusters.length} mathematical content clusters`);
    return mathClusters.map((cluster, index) => ({
      question: `Exercise ${index + 1}: ${cluster}`,
      answer: ""
    }));
  }
  
  // Try splitting on strong separators
  return splitOnSeparators(text);
}

// Find clusters of mathematical content
function findMathematicalClusters(text: string): string[] {
  const clusters = [];
  const mathPattern = /([^.!?]*(?:\d+\/\d+|\d+\s*[+\-×÷]\s*\d+|=)[^.!?]*[.!?]?)/g;
  let match;
  
  while ((match = mathPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 10 && isEducationalContent(content)) {
      clusters.push(content);
    }
  }
  
  return clusters;
}

// Split text on strong separators
function splitOnSeparators(text: string): Array<{ question: string, answer: string }> {
  const separators = ['\n\n', '. ', '? ', '! '];
  
  for (const separator of separators) {
    const parts = text.split(separator).filter(part => part.trim().length > 10);
    
    if (parts.length > 1) {
      console.log(`Split on '${separator}' found ${parts.length} parts`);
      return parts.map((part, index) => ({
        question: `${index + 1}. ${part.trim()}`,
        answer: ""
      }));
    }
  }
  
  return [];
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

// PHASE 4: Force split strategy for single long content
function createForcedSplitExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('Applying forced split strategy...');
  
  if (text.length < 50) {
    return [{
      question: text.trim() || "No content extracted",
      answer: ""
    }];
  }
  
  // If content is substantial but we only found one exercise, force split it
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length > 1) {
    console.log(`Force splitting into ${sentences.length} parts`);
    return sentences.slice(0, 5).map((sentence, index) => ({
      question: `${String.fromCharCode(97 + index)}. ${sentence.trim()}`,
      answer: ""
    }));
  }
  
  // Last resort: split by length
  const words = text.split(/\s+/);
  const chunkSize = Math.ceil(words.length / 3); // Split into 3 parts
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 10) {
      chunks.push(chunk.trim());
    }
  }
  
  if (chunks.length > 1) {
    console.log(`Force splitting by length into ${chunks.length} parts`);
    return chunks.map((chunk, index) => ({
      question: `${String.fromCharCode(97 + index)}. ${chunk}`,
      answer: ""
    }));
  }
  
  // Absolute fallback
  return [{
    question: text.trim() || "No content extracted",
    answer: ""
  }];
}

