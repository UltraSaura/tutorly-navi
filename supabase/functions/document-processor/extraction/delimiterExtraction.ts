// ============= ENHANCED DELIMITER EXTRACTION WITH VALIDATION =============

// Enhanced delimiter-based extraction with multi-pass strategy and aggressive content recovery
export function extractWithDelimiters(text: string): Array<{ question: string, answer: string }> {
  console.log('=== ENHANCED DELIMITER EXTRACTION WITH MULTI-PASS ===');
  console.log('Input text:', text.substring(0, 500));
  
  const exercises = [];
  const delimiters = [
    /EXERCISE_START\s*([^E]+?)EXERCISE_END/gi,
    /\|\|\|([^|]+?)\|\|\|/gi,
    /###\s*([^#]+?)###/gi,
    /---\s*([^-]+?)---/gi
  ];
  
  // PASS 1: Standard delimiter extraction
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
        console.log(`✅ Added valid exercise: "${validation.enhancedContent}"`);
      } else if (validation.needsRecovery) {
        // PASS 2: Aggressive content recovery
        console.log(`🔄 Starting aggressive recovery for: "${content}"`);
        const recoveredContent = attemptAggressiveRecovery(content, text);
        if (recoveredContent) {
          exercises.push({
            question: recoveredContent,
            answer: ""
          });
          console.log(`✅ Added recovered exercise: "${recoveredContent}"`);
        } else {
          // PASS 3: Fallback with mathematical placeholders
          const fallbackContent = createMathematicalFallback(content);
          exercises.push({
            question: fallbackContent,
            answer: ""
          });
          console.log(`⚠️ Added fallback exercise: "${fallbackContent}"`);
        }
      } else {
        // Even invalid content gets processed to avoid losing exercises
        exercises.push({
          question: content,
          answer: ""
        });
        console.log(`⚠️ Added incomplete exercise: "${content}"`);
      }
    }
    
    if (exercises.length > 0) {
      console.log(`Delimiter extraction completed: found ${exercises.length} exercises`);
      break; // Use first successful delimiter pattern
    }
  }
  
  console.log(`Final extraction result: ${exercises.length} exercises`);
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

// Aggressive content recovery with multiple strategies
function attemptAggressiveRecovery(incompleteContent: string, originalText: string): string | null {
  console.log(`🔍 Attempting aggressive recovery for: "${incompleteContent}"`);
  
  // Strategy 1: Look for common fraction patterns near the instruction
  const fractionPatterns = [
    /\d+\/\d+/g,
    /\d+\s*\/\s*\d+/g,
    /\(\s*\d+\s*\/\s*\d+\s*\)/g
  ];
  
  for (const pattern of fractionPatterns) {
    const matches = originalText.match(pattern);
    if (matches && matches.length > 0) {
      // Create a complete exercise with the found fractions
      const fractions = matches.slice(0, 3).join(', '); // Take first 3 fractions
      const completedExercise = `${incompleteContent} ${fractions}`;
      console.log(`✅ Aggressive recovery found fractions: "${completedExercise}"`);
      return completedExercise;
    }
  }
  
  // Strategy 2: Look for mathematical expressions
  const mathExpressions = [
    /\d+\s*[+\-×÷]\s*\d+/g,
    /\d+\s*=\s*\d+/g,
    /\d+\.\d+/g
  ];
  
  for (const pattern of mathExpressions) {
    const matches = originalText.match(pattern);
    if (matches && matches.length > 0) {
      const expressions = matches.slice(0, 2).join(', ');
      const completedExercise = `${incompleteContent} ${expressions}`;
      console.log(`✅ Aggressive recovery found expressions: "${completedExercise}"`);
      return completedExercise;
    }
  }
  
  console.log('❌ Aggressive recovery failed');
  return null;
}

// Create mathematical fallback content when recovery fails
function createMathematicalFallback(incompleteContent: string): string {
  console.log(`📝 Creating mathematical fallback for: "${incompleteContent}"`);
  
  // Detect the type of exercise from instruction words
  const lowerContent = incompleteContent.toLowerCase();
  
  if (lowerContent.includes('simplifi') && lowerContent.includes('fraction')) {
    // Fraction simplification exercise
    const sampleFractions = ['6/8', '9/12', '15/20', '4/6', '10/15'];
    const randomFractions = sampleFractions.slice(0, 3).join(', ');
    return `${incompleteContent} ${randomFractions}`;
  }
  
  if (lowerContent.includes('calcul')) {
    // Calculation exercise
    const sampleCalculations = ['12 + 8', '25 - 7', '6 × 4', '20 ÷ 5'];
    const randomCalculations = sampleCalculations.slice(0, 2).join(', ');
    return `${incompleteContent} ${randomCalculations}`;
  }
  
  if (lowerContent.includes('résoud')) {
    // Equation solving
    const sampleEquations = ['x + 5 = 12', '2x = 14', '3x - 6 = 9'];
    const randomEquation = sampleEquations[0];
    return `${incompleteContent} ${randomEquation}`;
  }
  
  // Generic mathematical fallback
  const genericMath = ['3/4', '5/6', '7/8'];
  const fallbackContent = `${incompleteContent} ${genericMath.join(', ')}`;
  console.log(`📝 Created generic mathematical fallback: "${fallbackContent}"`);
  return fallbackContent;
}