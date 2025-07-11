// Pure OCR-based mathematical exercise extraction with precise pattern matching

export function extractMathExercisesFromRawText(rawText: string): Array<{ question: string, answer: string }> {
  console.log('=== OCR-BASED PATTERN EXTRACTION ===');
  console.log('Raw OCR text length:', rawText.length);
  console.log('Raw OCR text preview:', rawText.substring(0, 300));
  
  // Use pure OCR-based extraction with direct pattern matching
  return extractMathExercisesDirectly(rawText);
}

// Direct OCR-based exercise extraction using precise pattern matching
function extractMathExercisesDirectly(rawText: string): Array<{ question: string, answer: string }> {
  console.log('Starting direct OCR pattern extraction...');
  
  const exercises = [];
  
  // Step 1: Find all fractions with precise pattern
  const fractionPattern = /\b(\d{1,3})\/(\d{1,3})\b/g;
  const fractions = [];
  let fractionMatch;
  
  while ((fractionMatch = fractionPattern.exec(rawText)) !== null) {
    fractions.push({
      fraction: fractionMatch[0],
      numerator: parseInt(fractionMatch[1]),
      denominator: parseInt(fractionMatch[2]),
      position: fractionMatch.index
    });
  }
  
  console.log('Found fractions in text:', fractions);
  
  // Step 2: Find exercise markers (a., b., c., etc.)
  const exerciseMarkerPattern = /\b([a-h])\.\s*/gi;
  const exerciseMarkers = [];
  let markerMatch;
  
  while ((markerMatch = exerciseMarkerPattern.exec(rawText)) !== null) {
    exerciseMarkers.push({
      marker: markerMatch[1].toLowerCase(),
      position: markerMatch.index
    });
  }
  
  console.log('Found exercise markers:', exerciseMarkers);
  
  // Step 3: Create exercises by associating markers with fractions
  if (exerciseMarkers.length > 0 && fractions.length > 0) {
    // Sort markers and fractions by position
    exerciseMarkers.sort((a, b) => a.position - b.position);
    fractions.sort((a, b) => a.position - b.position);
    
    // Try to match each marker with the closest fraction after it
    for (let i = 0; i < exerciseMarkers.length && i < fractions.length; i++) {
      const marker = exerciseMarkers[i];
      const fraction = fractions[i];
      
      exercises.push({
        question: `${marker.marker}. Simplifie la fraction ${fraction.fraction}`,
        answer: fraction.fraction
      });
      
      console.log(`✅ Created exercise: ${marker.marker}. Simplifie la fraction ${fraction.fraction}`);
    }
  } else if (fractions.length > 0) {
    // No markers found, but we have fractions - create exercises directly
    console.log('No exercise markers found, creating exercises from fractions directly');
    
    fractions.forEach((frac, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, etc.
      exercises.push({
        question: `${letter}. Simplifie la fraction ${frac.fraction}`,
        answer: frac.fraction
      });
      
      console.log(`✅ Created exercise: ${letter}. Simplifie la fraction ${frac.fraction}`);
    });
  }
  
  // Step 4: Validation - ensure we have real fractions and not endless dots
  const validExercises = exercises.filter(ex => {
    const hasValidFraction = ex.answer.match(/^\d+\/\d+$/);
    const isNotDots = !ex.answer.includes('...');
    return hasValidFraction && isNotDots;
  });
  
  console.log(`Validation: ${exercises.length} raw exercises -> ${validExercises.length} valid exercises`);
  
  // Step 5: Final fallback if no valid exercises found
  if (validExercises.length === 0) {
    console.log('No valid exercises found, creating fallback from detected patterns');
    
    // Look for any number patterns that might be fractions
    const numberPairs = rawText.match(/\d+\s*\/\s*\d+/g);
    if (numberPairs && numberPairs.length > 0) {
      numberPairs.slice(0, 5).forEach((pair, index) => {
        const cleanPair = pair.replace(/\s/g, '');
        const letter = String.fromCharCode(97 + index);
        validExercises.push({
          question: `${letter}. Simplifie la fraction ${cleanPair}`,
          answer: cleanPair
        });
      });
    }
  }
  
  console.log(`Final result: ${validExercises.length} valid exercises extracted`);
  return validExercises;
}