
// Enhanced exercise extraction for French math worksheets
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting enhanced exercise extraction for French worksheets');
  console.log('Input text length:', text.length);
  console.log('Full text content:', text);
  
  const exercises = [];
  
  // Clean and normalize the text with French-specific handling
  const cleanedText = text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\s+/g, ' ')    // Normalize whitespace but keep structure
    .replace(/([a-zA-Z])\s*,\s*/g, '$1. ') // Fix OCR errors: a, -> a.
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. ') // Normalize spacing around periods
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fraction formatting
    .replace(/=\s*/g, '= '); // Normalize equals sign spacing
  
  console.log('Text after French normalization (first 300 chars):', cleanedText.substring(0, 300));
  
  // Split into lines and process each
  const lines = cleanedText.split('\n');
  console.log('Total lines to process:', lines.length);
  
  // Enhanced pattern matching for French math worksheets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    console.log(`Processing line ${i + 1}: "${line}"`);
    
    // Primary pattern: letter followed by period and math content
    const frenchExerciseMatch = line.match(/^([a-zA-Z])\s*\.\s*(.+)/);
    if (frenchExerciseMatch) {
      const letter = frenchExerciseMatch[1];
      const content = frenchExerciseMatch[2].trim();
      
      console.log(`Found French exercise: ${letter}. ${content}`);
      
      // Specifically check for fraction patterns
      if (content.includes('/') || content.includes('=')) {
        exercises.push({
          question: `${letter}. ${content}`,
          answer: "" // User will fill this
        });
        console.log(`Added fraction exercise: ${letter}. ${content}`);
      } else if (content.length > 3) {
        // Any other substantial content after letter.
        exercises.push({
          question: `${letter}. ${content}`,
          answer: ""
        });
        console.log(`Added general exercise: ${letter}. ${content}`);
      }
    }
  }
  
  // If no exercises found with line processing, try character-by-character scanning
  if (exercises.length === 0) {
    console.log('No exercises found with line processing, trying character scanning');
    
    // More aggressive character-by-character scanning
    for (let i = 0; i < cleanedText.length - 3; i++) {
      const char = cleanedText[i];
      const next = cleanedText[i + 1];
      const afterNext = cleanedText[i + 2];
      
      // Look for pattern: letter + period + space/content
      if (/[a-zA-Z]/.test(char) && next === '.' && (/\s/.test(afterNext) || /\d/.test(afterNext))) {
        // Find the end of this exercise (next letter + period or significant break)
        let end = i + 3;
        let foundNextExercise = false;
        
        while (end < cleanedText.length - 2) {
          if (/[a-zA-Z]/.test(cleanedText[end]) && 
              cleanedText[end + 1] === '.' && 
              (/\s/.test(cleanedText[end + 2]) || /\d/.test(cleanedText[end + 2]))) {
            foundNextExercise = true;
            break;
          }
          end++;
        }
        
        // If we didn't find another exercise, look for natural breaks
        if (!foundNextExercise) {
          const remainingText = cleanedText.substring(i + 3);
          const naturalBreak = remainingText.search(/\n\n|\s{4,}|[.!?]\s+[A-Z]/);
          if (naturalBreak > 0 && naturalBreak < 100) {
            end = i + 3 + naturalBreak;
          } else {
            end = Math.min(i + 50, cleanedText.length); // Limit exercise length
          }
        }
        
        const exerciseText = cleanedText.substring(i, end).trim();
        console.log(`Character scan found potential exercise: "${exerciseText}"`);
        
        if (exerciseText.length > 3 && (exerciseText.includes('/') || exerciseText.includes('='))) {
          exercises.push({
            question: exerciseText,
            answer: ""
          });
          console.log(`Character scan added: ${exerciseText}`);
        }
        
        i = end - 1; // Skip ahead
      }
    }
  }
  
  // Final attempt: Look for any mathematical content in the text
  if (exercises.length === 0) {
    console.log('No exercises found with standard methods, trying mathematical content detection');
    
    // Look for fraction patterns anywhere in the text
    const fractionMatches = cleanedText.match(/\d+\/\d+[^a-zA-Z]*=?/g);
    if (fractionMatches) {
      fractionMatches.forEach((match, index) => {
        // Try to get more context around the fraction
        const matchIndex = cleanedText.indexOf(match);
        const start = Math.max(0, matchIndex - 20);
        const end = Math.min(cleanedText.length, matchIndex + match.length + 20);
        const context = cleanedText.substring(start, end).trim();
        
        exercises.push({
          question: `Exercise ${index + 1}: ${context}`,
          answer: ""
        });
        console.log(`Added fraction context: ${context}`);
      });
    }
  }
  
  console.log(`Enhanced extraction completed. Found ${exercises.length} exercises`);
  exercises.forEach((ex, idx) => {
    console.log(`Exercise ${idx + 1}: ${ex.question}`);
  });
  
  return exercises;
}

