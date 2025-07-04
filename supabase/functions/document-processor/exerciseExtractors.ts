
// Simple and reliable exercise extraction - line by line processing
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting definitive exercise extraction');
  console.log('Input text length:', text.length);
  console.log('First 200 chars:', text.substring(0, 200));
  
  const exercises = [];
  
  // Clean and normalize the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\s+/g, ' ')    // Normalize whitespace but keep structure
    .replace(/([a-zA-Z])\s*,\s*/g, '$1. ') // Fix OCR errors: a, -> a.
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. '); // Normalize spacing around periods
  
  console.log('Cleaned text (first 200 chars):', cleanedText.substring(0, 200));
  
  // Split into lines and process each
  const lines = cleanedText.split('\n');
  console.log('Total lines to process:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Look for letter followed by period pattern (a., b., c., etc.)
    const letterMatch = line.match(/^([a-zA-Z])\s*\.\s*(.+)/);
    if (letterMatch) {
      const letter = letterMatch[1];
      const content = letterMatch[2].trim();
      
      console.log(`Found exercise starting with "${letter}.": ${content}`);
      
      // Check if it's a fraction exercise
      if (content.includes('/') && content.includes('=')) {
        exercises.push({
          question: `${letter}. ${content}`,
          answer: "" // User will fill this
        });
        console.log(`Added fraction exercise: ${letter}. ${content}`);
      } else {
        // Any other content after letter.
        exercises.push({
          question: `${letter}. ${content}`,
          answer: ""
        });
        console.log(`Added general exercise: ${letter}. ${content}`);
      }
    }
    
    // Also look for numbered exercises (1., 2., etc.)
    const numberMatch = line.match(/^(\d+)\s*\.\s*(.+)/);
    if (numberMatch) {
      const number = numberMatch[1];
      const content = numberMatch[2].trim();
      
      console.log(`Found numbered exercise: ${number}. ${content}`);
      exercises.push({
        question: `${number}. ${content}`,
        answer: ""
      });
    }
  }
  
  // If still no exercises, try a more aggressive approach
  if (exercises.length === 0) {
    console.log('No exercises found with line-by-line, trying character scanning');
    
    // Character-by-character scanning for letter + period patterns
    for (let i = 0; i < cleanedText.length - 2; i++) {
      const char = cleanedText[i];
      const next = cleanedText[i + 1];
      const afterNext = cleanedText[i + 2];
      
      // Look for pattern: letter + period + space/content
      if (/[a-zA-Z]/.test(char) && next === '.' && /\s/.test(afterNext)) {
        // Find the end of this exercise (next letter + period or end of text)
        let end = i + 3;
        while (end < cleanedText.length) {
          if (/[a-zA-Z]/.test(cleanedText[end]) && 
              cleanedText[end + 1] === '.' && 
              /\s/.test(cleanedText[end + 2])) {
            break;
          }
          end++;
        }
        
        const exerciseText = cleanedText.substring(i, end).trim();
        if (exerciseText.length > 3) { // Must have some content
          exercises.push({
            question: exerciseText,
            answer: ""
          });
          console.log(`Character scan found: ${exerciseText}`);
        }
        
        i = end - 1; // Skip ahead
      }
    }
  }
  
  console.log(`Definitive extraction completed. Found ${exercises.length} exercises`);
  exercises.forEach((ex, idx) => {
    console.log(`Exercise ${idx + 1}: ${ex.question}`);
  });
  
  return exercises;
}

