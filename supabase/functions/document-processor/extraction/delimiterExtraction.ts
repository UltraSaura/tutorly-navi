// ============= ENHANCED DELIMITER EXTRACTION WITH VALIDATION =============

// Enhanced delimiter-based extraction with content validation and recovery
export function extractWithDelimiters(text: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED DELIMITER EXTRACTION ===');
  console.log('Input text:', text.substring(0, 500));
  
  const exercises = [];
  const delimiters = [
    /EXERCISE_START\s*([^E]+?)EXERCISE_END/gi,
    /\|\|\|([^|]+?)\|\|\|/gi,
    /###\s*([^#]+?)###/gi,
    /---\s*([^-]+?)---/gi
  ];
  
  for (const delimiter of delimiters) {
    const matches = [...text.matchAll(delimiter)];
    console.log(`Found ${matches.length} delimiter matches with pattern: ${delimiter.source}`);
    
    for (const match of matches) {
      const content = match[1].trim();
      console.log(`Processing delimiter content: "${content}"`);
      
      // Enhanced validation: check for mathematical content
      const validation = validateMathematicalContent(content);
      console.log(`Content validation result:`, validation);
      
      if (validation.isValid) {
        exercises.push({
          question: validation.enhancedContent,
          answer: ""
        });
        console.log(`✅ Added enhanced exercise: "${validation.enhancedContent}"`);
      } else if (validation.needsRecovery) {
        // Attempt content recovery
        const recoveredContent = attemptContentRecovery(content, text);
        if (recoveredContent) {
          exercises.push({
            question: recoveredContent,
            answer: ""
          });
          console.log(`✅ Added recovered exercise: "${recoveredContent}"`);
        } else {
          console.log(`❌ Could not recover content for: "${content}" - Issues: ${validation.issues.join(', ')}`);
        }
      }
    }
    
    if (exercises.length > 0) {
      console.log(`Delimiter extraction successful: found ${exercises.length} exercises`);
      return exercises;
    }
  }
  
  console.log('No delimiter matches found');
  return exercises;
}

// Enhanced content validation for mathematical exercises
function validateMathematicalContent(content: string): {
  isValid: boolean;
  needsRecovery: boolean;
  enhancedContent: string;
  issues: string[];
} {
  const issues = [];
  let enhancedContent = content;
  
  // Check for mathematical elements
  const hasMathSymbols = /[+\-×÷=<>%]/.test(content);
  const hasFractions = /\d+\/\d+/.test(content);
  const hasNumbers = /\d+/.test(content);
  const hasEquations = /=/.test(content);
  const hasDecimalNumbers = /\d+\.\d+/.test(content);
  
  // Check for French math instruction words
  const mathInstructions = /(simplifi|calcul|résoud|trouv|écri|complet|réduire)/i.test(content);
  
  // Check if content is too short or only contains instruction words
  const wordCount = content.split(/\s+/).length;
  const isOnlyInstruction = mathInstructions && wordCount < 3 && !hasNumbers && !hasFractions;
  
  console.log(`Content analysis for "${content}":`, {
    hasMathSymbols, hasFractions, hasNumbers, hasEquations, 
    hasDecimalNumbers, mathInstructions, wordCount, isOnlyInstruction
  });
  
  // Validation logic
  if (isOnlyInstruction) {
    issues.push('Only instruction word found, missing mathematical content');
    return {
      isValid: false,
      needsRecovery: true,
      enhancedContent: content,
      issues
    };
  }
  
  if (mathInstructions && (hasNumbers || hasFractions || hasMathSymbols)) {
    // Good mathematical exercise
    return {
      isValid: true,
      needsRecovery: false,
      enhancedContent: content,
      issues
    };
  }
  
  if (wordCount < 2) {
    issues.push('Content too short');
    return {
      isValid: false,
      needsRecovery: true,
      enhancedContent: content,
      issues
    };
  }
  
  // Accept if it has some mathematical content even without instruction words
  if (hasNumbers || hasFractions || hasMathSymbols) {
    return {
      isValid: true,
      needsRecovery: false,
      enhancedContent: content,
      issues
    };
  }
  
  issues.push('No mathematical content detected');
  return {
    isValid: false,
    needsRecovery: false,
    enhancedContent: content,
    issues
  };
}

// Attempt to recover incomplete content from the original text
function attemptContentRecovery(incompleteContent: string, originalText: string): string | null {
  console.log(`Attempting content recovery for: "${incompleteContent}"`);
  
  // Extract the exercise identifier (a., b., etc.)
  const identifierMatch = incompleteContent.match(/^([a-z]\.|[0-9]+\.)/i);
  if (!identifierMatch) {
    console.log('No identifier found for recovery');
    return null;
  }
  
  const identifier = identifierMatch[1];
  console.log(`Looking for more content around identifier: "${identifier}"`);
  
  // Look for the identifier in the original text and extract surrounding content
  const identifierIndex = originalText.toLowerCase().indexOf(identifier.toLowerCase());
  if (identifierIndex === -1) {
    console.log('Identifier not found in original text');
    return null;
  }
  
  // Extract a larger context around the identifier
  const start = Math.max(0, identifierIndex);
  const end = Math.min(originalText.length, identifierIndex + 200);
  const context = originalText.substring(start, end);
  
  // Look for mathematical patterns in the context
  const mathPatterns = [
    new RegExp(`${identifier}\\s*[^a-z]*\\d+[^a-z]*`, 'gi'),
    /\d+\/\d+/g,
    /\d+\s*[+\-×÷]\s*\d+/g,
    /=\s*\d+/g
  ];
  
  for (const pattern of mathPatterns) {
    const matches = context.match(pattern);
    if (matches && matches.length > 0) {
      const recovered = matches[0].trim();
      if (recovered.length > incompleteContent.length) {
        console.log(`✅ Recovered content: "${recovered}"`);
        return recovered;
      }
    }
  }
  
  console.log('Could not recover additional content');
  return null;
}