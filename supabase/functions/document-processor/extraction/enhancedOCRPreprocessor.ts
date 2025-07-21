
// NEW: Enhanced OCR preprocessing to handle worksheet-specific issues

export function enhancedWorksheetPreprocessing(text: string): string {
  console.log('=== ENHANCED WORKSHEET OCR PREPROCESSING ===');
  console.log('Original text length:', text.length);
  console.log('Original preview:', text.substring(0, 200));
  
  let processed = text
    // STEP 1: Remove obvious OCR garbage patterns
    .replace(/c{10,}/g, ' ') // Remove long strings of 'c' characters
    .replace(/[^a-zA-Z0-9\s\(\)\/\\\.\=\-\+\&\^\~\{\}]/g, ' ') // Keep only relevant characters
    
    // STEP 2: Fix common OCR errors in French educational content
    .replace(/ERERCIE/gi, 'EXERCICE')
    .replace(/Simpliffer/gi, 'Simplifier')
    .replace(/fiactions/gi, 'fractions')
    .replace(/Simpliffes/gi, 'Simplifiez')
    .replace(/criteres/gi, 'critères')
    
    // STEP 3: Normalize LaTeX and mathematical notation
    .replace(/\^\([^)]*\)/g, '') // Remove ^(aligned), ^(array), etc.
    .replace(/\\\\\&/g, ' ')
    .replace(/\&\^/g, ' ')
    .replace(/\\begin\{[^}]*\}/g, '')
    .replace(/\\end\{[^}]*\}/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\boxed\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    
    // STEP 4: Fix fraction formatting
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '($1)/($2)')
    .replace(/\((\d+)\)\s*\/\s*\((\d+)\)/g, '$1/$2')
    
    // STEP 5: Fix exercise markers
    .replace(/([a-h])\s*[~\^\&]*\s*/gi, '$1. ')
    
    // STEP 6: Clean up whitespace and structure
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Processed text length:', processed.length);
  console.log('Processed preview:', processed.substring(0, 200));
  console.log('=== ENHANCED PREPROCESSING COMPLETE ===');
  
  return processed;
}

// Detect if OCR has completely failed
export function isOCRFailure(text: string): boolean {
  console.log('=== CHECKING FOR OCR FAILURE ===');
  
  const failureIndicators = [
    text.length < 50, // Too short
    (text.match(/c/g) || []).length > text.length * 0.3, // Too many 'c' characters
    !/\d/.test(text), // No numbers at all
    !/[a-z]/i.test(text), // No letters at all
    text.replace(/[c\s]/g, '').length < 10 // Almost all 'c' and spaces
  ];
  
  const failureCount = failureIndicators.filter(Boolean).length;
  const isFailed = failureCount >= 2;
  
  console.log(`OCR failure indicators: ${failureCount}/5, Failed: ${isFailed}`);
  
  return isFailed;
}

// Extract meaningful content even from poor OCR
export function extractMeaningfulContent(text: string): {
  fractions: string[];
  exerciseMarkers: string[];
  hasEducationalContent: boolean;
} {
  console.log('=== EXTRACTING MEANINGFUL CONTENT FROM POOR OCR ===');
  
  const fractions = [];
  const exerciseMarkers = [];
  
  // Extract fractions even from garbled text
  const fractionPattern = /(\d+)\s*\/\s*(\d+)/g;
  let match;
  while ((match = fractionPattern.exec(text)) !== null) {
    fractions.push(`${match[1]}/${match[2]}`);
  }
  
  // Extract exercise markers
  const markerPattern = /([a-h])[\.\)\s]/gi;
  while ((match = markerPattern.exec(text)) !== null) {
    exerciseMarkers.push(match[1].toLowerCase());
  }
  
  // Check for educational content indicators
  const educationalKeywords = [
    'exercice', 'simplif', 'fraction', 'math', 'calcul',
    'multiplication', 'division', 'nombre'
  ];
  
  const hasEducationalContent = educationalKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  console.log(`Extracted: ${fractions.length} fractions, ${exerciseMarkers.length} markers, educational: ${hasEducationalContent}`);
  
  return { fractions, exerciseMarkers, hasEducationalContent };
}
