// Smart mathematical exercise extraction using pattern recognition and structure awareness

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART MATH EXTRACTION ===');
  console.log('Raw text to process:', rawText.substring(0, 500));
  
  // Phase 1: Extract all mathematical content first
  const mathContent = extractAllMathematicalContent(rawText);
  console.log('Extracted mathematical content:', mathContent);
  
  // Phase 2: Find exercise structure (a., b., c., etc.)
  const exerciseStructure = findExerciseStructure(rawText);
  console.log('Found exercise structure:', exerciseStructure);
  
  // Phase 3: Associate instructions with mathematical content
  const exercises = associateInstructionsWithMath(rawText, mathContent, exerciseStructure);
  console.log(`Created ${exercises.length} complete exercises`);
  
  // Phase 4: Fallback if no structured exercises found
  if (exercises.length === 0) {
    console.log('No structured exercises found, using fallback extraction');
    return createFallbackExercises(rawText, mathContent);
  }
  
  return exercises;
}

// Extract all fractions, numbers, and mathematical expressions
function extractAllMathematicalContent(text: string): {
  fractions: string[];
  decimals: string[];
  expressions: string[];
  equations: string[];
} {
  const fractions = [];
  const decimals = [];
  const expressions = [];
  const equations = [];
  
  // Extract fractions (number/number)
  const fractionMatches = text.match(/\d+\/\d+/g);
  if (fractionMatches) {
    fractions.push(...fractionMatches);
  }
  
  // Extract decimal numbers
  const decimalMatches = text.match(/\d+[.,]\d+/g);
  if (decimalMatches) {
    decimals.push(...decimalMatches.map(d => d.replace(',', '.')));
  }
  
  // Extract mathematical expressions (with operators)
  const expressionMatches = text.match(/\d+\s*[\+\-\×\*÷\/]\s*\d+/g);
  if (expressionMatches) {
    expressions.push(...expressionMatches);
  }
  
  // Extract equations (with equals sign)
  const equationMatches = text.match(/[0-9x\+\-\*\/\(\)]+\s*=\s*[0-9x\+\-\*\/\(\)]+/g);
  if (equationMatches) {
    equations.push(...equationMatches);
  }
  
  return { fractions, decimals, expressions, equations };
}

// Find exercise structure patterns (a., b., c., 1., 2., etc.)
function findExerciseStructure(text: string): Array<{
  marker: string;
  instruction: string;
  position: number;
}> {
  const exercises = [];
  
  // Pattern for a., b., c., etc.
  const letterPattern = /([a-z])\.\s*([^a-z]*?)(?=[a-z]\.|$)/gi;
  let match;
  
  while ((match = letterPattern.exec(text)) !== null) {
    exercises.push({
      marker: match[1].toLowerCase(),
      instruction: match[2].trim(),
      position: match.index
    });
  }
  
  // Pattern for 1., 2., 3., etc. if no letter patterns found
  if (exercises.length === 0) {
    const numberPattern = /(\d+)\.\s*([^0-9]*?)(?=\d+\.|$)/g;
    
    while ((match = numberPattern.exec(text)) !== null) {
      exercises.push({
        marker: match[1],
        instruction: match[2].trim(),
        position: match.index
      });
    }
  }
  
  return exercises.sort((a, b) => a.position - b.position);
}

// Associate instructions with nearby mathematical content
function associateInstructionsWithMath(
  rawText: string,
  mathContent: any,
  exerciseStructure: any[]
): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Get all mathematical content as a flat array
  const allMathContent = [
    ...mathContent.fractions,
    ...mathContent.decimals,
    ...mathContent.expressions,
    ...mathContent.equations
  ];
  
  console.log('All mathematical content found:', allMathContent);
  
  for (const exercise of exerciseStructure) {
    let question = `${exercise.marker}. ${exercise.instruction}`;
    
    // Try to find mathematical content associated with this exercise
    const associatedMath = findNearbyMathContent(rawText, exercise, allMathContent);
    
    if (associatedMath.length > 0) {
      // Add the mathematical content to the question
      question += ` ${associatedMath.join(', ')}`;
      
      exercises.push({
        question: question.trim(),
        answer: ""
      });
      
      console.log(`✅ Created complete exercise: ${question}`);
    } else {
      // Check if this is a fraction simplification exercise
      if (exercise.instruction.toLowerCase().includes('simplifi') && 
          exercise.instruction.toLowerCase().includes('fraction')) {
        
        // Use some of the available fractions
        const availableFractions = mathContent.fractions.slice(0, 3);
        if (availableFractions.length > 0) {
          question += ` ${availableFractions.join(', ')}`;
          exercises.push({
            question: question.trim(),
            answer: ""
          });
          console.log(`✅ Created fraction exercise with available fractions: ${question}`);
        } else {
          // Create with common fraction examples
          question += ` 6/8, 9/12, 15/20`;
          exercises.push({
            question: question.trim(),
            answer: ""
          });
          console.log(`⚠️ Created fraction exercise with examples: ${question}`);
        }
      }
    }
  }
  
  return exercises;
}

// Find mathematical content near a specific exercise
function findNearbyMathContent(rawText: string, exercise: any, allMathContent: string[]): string[] {
  const nearbyContent = [];
  const exerciseText = exercise.instruction.toLowerCase();
  
  // For fraction exercises, prioritize fractions
  if (exerciseText.includes('fraction') || exerciseText.includes('simplifi')) {
    const fractionPattern = /\d+\/\d+/g;
    const matches = rawText.match(fractionPattern);
    if (matches) {
      nearbyContent.push(...matches.slice(0, 5)); // Take first 5 fractions
    }
  }
  
  // For calculation exercises, look for expressions
  if (exerciseText.includes('calcul') || exerciseText.includes('résoud')) {
    const expressionPattern = /\d+\s*[\+\-\×\*÷\/]\s*\d+/g;
    const matches = rawText.match(expressionPattern);
    if (matches) {
      nearbyContent.push(...matches.slice(0, 3));
    }
  }
  
  return nearbyContent;
}

// Fallback: Create exercises from all available mathematical content
function createFallbackExercises(rawText: string, mathContent: any): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Create a general exercise with all fractions if found
  if (mathContent.fractions.length > 0) {
    exercises.push({
      question: `Simplifie les fractions suivantes: ${mathContent.fractions.join(', ')}`,
      answer: ""
    });
  }
  
  // Create exercises with expressions if found
  if (mathContent.expressions.length > 0) {
    exercises.push({
      question: `Calcule les expressions suivantes: ${mathContent.expressions.join(', ')}`,
      answer: ""
    });
  }
  
  // Create exercises with equations if found
  if (mathContent.equations.length > 0) {
    exercises.push({
      question: `Résous les équations suivantes: ${mathContent.equations.join(', ')}`,
      answer: ""
    });
  }
  
  // If no mathematical content found at all, create from raw text
  if (exercises.length === 0 && rawText.trim().length > 0) {
    exercises.push({
      question: "Contenu du document",
      answer: rawText.trim().substring(0, 300)
    });
  }
  
  console.log(`Created ${exercises.length} fallback exercises`);
  return exercises;
}