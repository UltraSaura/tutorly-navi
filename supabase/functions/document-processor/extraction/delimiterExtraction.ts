// PHASE 1: Vision API delimiter-based extraction

// Extract exercises using Vision API delimiters
export function extractWithDelimiters(text: string): Array<{ question: string, answer: string }> {
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