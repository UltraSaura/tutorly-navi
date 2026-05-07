// Type definitions for exercises
interface Exercise {
  letter: string;
  question: string;
  answer: string;
}

export function detectMultipleExercises(text: string): Array<{ letter: string, question: string, answer: string }> {
  console.log('\n=== MULTI-EXERCISE DETECTION ===');
  const exercises: Array<{ letter: string, question: string, answer: string }> = [];
  
  // PHASE 1: Detect LaTeX markdown format from Mistral OCR
  // Pattern: a.  $\frac{30}{63} = \frac{13}{23}$  or  c.  $\frac{50}{58} =$
  const latexLinePattern = /([a-e])[\.\)]\s*\$?\\frac\{(\d+)\}\{(\d+)\}\s*=\s*(?:\\frac\{(\d+)\}\{(\d+)\})?\s*\$?/gi;
  let match;
  
  while ((match = latexLinePattern.exec(text)) !== null) {
    const letter = match[1].toLowerCase();
    const numerator = match[2];
    const denominator = match[3];
    const ansNum = match[4];
    const ansDen = match[5];
    
    const studentAnswer = (ansNum && ansDen) ? `${ansNum}/${ansDen}` : "";
    
    // Avoid duplicates
    if (!exercises.some(ex => ex.letter === letter)) {
      exercises.push({
        letter,
        question: `Simplifiez la fraction ${numerator}/${denominator}`,
        answer: studentAnswer
      });
      console.log(`Found LaTeX exercise ${letter}: ${numerator}/${denominator} -> Answer: "${studentAnswer || 'NEEDS STUDENT INPUT'}"`);
    }
  }
  
  if (exercises.length > 0) {
    console.log(`Multi-exercise detection found ${exercises.length} unique exercises (LaTeX format)`);
    return exercises.sort((a, b) => a.letter.localeCompare(b.letter));
  }
  
  // PHASE 2: Detect parentheses format: a) (30)/(63)=(13)/(23)
  const patterns = [
    /([a-e])\)\s*\((\d+)\)\/\((\d+)\)(?:\s*=\s*\((\d+)\)\/\((\d+)\))?/gi,
    /([a-e])\.\s*\((\d+)\)\/\((\d+)\)(?:\s*=\s*\((\d+)\)\/\((\d+)\))?/gi,
    /([a-e])\)\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)\s*\/\s*(\d+)/gi,
    /([a-e])\.\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)\s*\/\s*(\d+)/gi,
    /([a-e])\)\s*(\d+)\s*\/\s*(\d+)\s*=/gi,
    /([a-e])\.\s*(\d+)\s*\/\s*(\d+)\s*=/gi,
  ];
  
  for (const pattern of patterns) {
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toLowerCase();
      const numerator = match[2];
      const denominator = match[3];
      const ansNum = match[4];
      const ansDen = match[5];
      const studentAnswer = (ansNum && ansDen) ? `${ansNum}/${ansDen}` : "";
      
      if (!exercises.some(ex => ex.letter === letter)) {
        exercises.push({
          letter,
          question: `Simplifiez la fraction ${numerator}/${denominator}`,
          answer: studentAnswer
        });
        console.log(`Found exercise ${letter}: ${numerator}/${denominator} -> Answer: "${studentAnswer || 'NEEDS STUDENT INPUT'}"`);
      }
    }
  }
  
  const sorted = exercises.sort((a, b) => a.letter.localeCompare(b.letter));
  console.log(`Multi-exercise detection found ${sorted.length} unique exercises`);
  return sorted;
}
