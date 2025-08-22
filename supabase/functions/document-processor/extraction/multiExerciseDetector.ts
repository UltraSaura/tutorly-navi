// Type definitions for exercises
interface Exercise {
  letter: string;
  question: string;
  answer: string;
}

export function detectMultipleExercises(text: string): Array<{ letter: string, question: string, answer: string }> {
  console.log('\n=== MULTI-EXERCISE DETECTION ===');
  const exercises: Array<{ letter: string, question: string, answer: string }> = [];
  
  // Enhanced patterns for detecting multiple exercises
  const patterns = [
    // a) (30)/(63)=(13)/(23) format with parentheses
    /([a-e])\)\s*\((\d+)\)\/\((\d+)\)(?:\s*=\s*\((\d+)\)\/\((\d+)\))?/gi,
    // a. (30)/(63)=(13)/(23) format with parentheses  
    /([a-e])\.\s*\((\d+)\)\/\((\d+)\)(?:\s*=\s*\((\d+)\)\/\((\d+)\))?/gi,
    // a) fraction b) fraction format
    /([a-e])\)\s*\\?frac\{(\d+)\}\{(\d+)\}(?:\s*=\s*([^a-e\n]+?))?(?=\s*[a-e]\)|$)/gi,
    // a. fraction b. fraction format
    /([a-e])\.\s*\\?frac\{(\d+)\}\{(\d+)\}(?:\s*=\s*([^a-e\n]+?))?(?=\s*[a-e]\.|$)/gi,
    // a) 30/63 b) 45/81 format
    /([a-e])\)\s*(\d+)\s*\/\s*(\d+)(?:\s*=\s*([^a-e\n]+?))?(?=\s*[a-e]\)|$)/gi,
    // a. 30/63 b. 45/81 format  
    /([a-e])\.\s*(\d+)\s*\/\s*(\d+)(?:\s*=\s*([^a-e\n]+?))?(?=\s*[a-e]\.|$)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toLowerCase();
      let numerator, denominator, studentAnswer = "";
      
      // Handle parentheses format: (30)/(63)=(13)/(23)
      if (match[4] && match[5]) {
        numerator = match[2];
        denominator = match[3];
        studentAnswer = `${match[4]}/${match[5]}`;
      } else {
        numerator = match[2];
        denominator = match[3];
        const rawAnswer = match[4];
        
        // Clean up the answer if provided by student
        if (rawAnswer) {
          studentAnswer = rawAnswer.trim()
            .replace(/[^\d\/]/g, '') // Keep only digits and slash
            .replace(/\s+/g, ''); // Remove spaces
          
          // Validate it's a proper fraction
          if (!/^\d+\/\d+$/.test(studentAnswer)) {
            studentAnswer = "";
          }
        }
      }
      
      const exercise = {
        letter: letter,
        question: `Simplifiez la fraction ${numerator}/${denominator}`,
        answer: studentAnswer // Only student-provided answer, empty if none
      };
      
      exercises.push(exercise);
      console.log(`Found exercise ${letter}: ${numerator}/${denominator} -> Answer: "${studentAnswer || 'NEEDS STUDENT INPUT'}"`);
    }
  }
  
  // Remove duplicates and sort by letter
  const uniqueExercises = exercises.filter((ex, index, arr) => 
    arr.findIndex(other => other.letter === ex.letter && other.question === ex.question) === index
  ).sort((a, b) => a.letter.localeCompare(b.letter));
  
  console.log(`Multi-exercise detection found ${uniqueExercises.length} unique exercises`);
  return uniqueExercises;
}
