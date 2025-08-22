// Type definition for extracted exercises
type Exercise = {
  question: string;
  answer: string;
};

export function extractSmartMathExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== SMART MATH EXTRACTION ===');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Try LaTeX extraction first
  const latexExercises = extractFromLatexFormat(text);
  if (latexExercises.length > 0) {
    exercises.push(...latexExercises);
    console.log(`LaTeX extraction found ${latexExercises.length} exercises`);
  }
  
  // Try OCR-friendly extraction
  const ocrExercises = extractFromOCRFormat(text);
  if (ocrExercises.length > 0) {
    exercises.push(...ocrExercises);
    console.log(`OCR extraction found ${ocrExercises.length} exercises`);
  }
  
  console.log(`Smart extraction total: ${exercises.length} exercises`);
  return exercises;
}

function extractFromLatexFormat(text: string): Array<{ question: string, answer: string }> {
  console.log('--- LaTeX Format Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Look for LaTeX fractions like \frac{30}{63}
  const latexFractionRegex = /\\frac\{(\d+)\}\{(\d+)\}/g;
  const fractions: string[] = [];
  let match;
  
  while ((match = latexFractionRegex.exec(text)) !== null) {
    fractions.push(`${match[1]}/${match[2]}`);
  }
  
  if (fractions.length === 0) {
    console.log('No LaTeX fractions found');
    return exercises;
  }
  
  // Look for handwritten answers near each fraction
  fractions.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, d, e...
    
    // Try to find handwritten answer near this fraction
    const handwrittenAnswer = findHandwrittenAnswerNear(text, fraction);
    
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: handwrittenAnswer || "" // Only use student-provided answer, empty if none
    };
    exercises.push(exercise);
    console.log(`✅ Created LaTeX exercise ${index + 1}: ${exercise.question} -> Answer: "${exercise.answer || 'NEEDS STUDENT INPUT'}"`);
  });
  
  return exercises;
}

function extractFromOCRFormat(text: string): Array<{ question: string, answer: string }> {
  console.log('--- OCR Format Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Look for regular fractions like 30/63, (30)/(63), etc.
  const ocrFractionRegex = /\(?(\d+)\)?\s*\/\s*\(?(\d+)\)?/g;
  const fractions: string[] = [];
  let match;
  
  while ((match = ocrFractionRegex.exec(text)) !== null) {
    fractions.push(`${match[1]}/${match[2]}`);
  }
  
  if (fractions.length === 0) {
    console.log('No OCR fractions found');
    return exercises;
  }
  
  // Process each fraction
  fractions.forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, d, e...
    
    // Try to find student's answer
    const studentAnswer = findStudentAnswerNear(text, fraction);
    
    const exercise = {
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: studentAnswer || "" // Only use student-provided answer, empty if none
    };
    exercises.push(exercise);
    console.log(`✅ Created OCR exercise ${index + 1}: ${exercise.question} -> Answer: "${exercise.answer || 'NEEDS STUDENT INPUT'}"`);
  });
  
  return exercises;
}

function findHandwrittenAnswerNear(text: string, fraction: string): string {
  console.log(`Looking for handwritten answer near fraction: ${fraction}`);
  
  // Look for patterns that might indicate a handwritten answer
  const patterns = [
    // Look for simplified fractions after equals sign
    new RegExp(`\\\\frac\\{\\d+\\}\\{\\d+\\}\\s*=\\s*\\\\frac\\{(\\d+)\\}\\{(\\d+)\\}`, 'g'),
    new RegExp(`${fraction.replace('/', '\\/')}\\s*=\\s*(\\d+\\s*\\/\\s*\\d+)`, 'g'),
    // Look for answers in parentheses or brackets
    new RegExp(`${fraction.replace('/', '\\/')}.*?[\\(\\[]\\s*(\\d+\\s*\\/\\s*\\d+)\\s*[\\)\\]]`, 'g'),
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const answer = match[1] && match[2] ? `${match[1]}/${match[2]}` : match[1];
      console.log(`Found handwritten answer: ${answer}`);
      return answer;
    }
  }
  
  console.log('No handwritten answer found');
  return "";
}

function findStudentAnswerNear(text: string, fraction: string): string {
  console.log(`Looking for student answer near fraction: ${fraction}`);
  
  // Look for equals sign followed by another fraction
  const afterEqualsPattern = new RegExp(`${fraction.replace('/', '\\/')}\\s*=\\s*(\\d+\\s*\\/\\s*\\d+)`, 'g');
  const equalsMatch = afterEqualsPattern.exec(text);
  if (equalsMatch) {
    console.log(`Found student answer after equals: ${equalsMatch[1]}`);
    return equalsMatch[1].replace(/\s/g, ''); // Remove spaces
  }
  
  // Look for answer in common formats near the fraction
  const nearbyPatterns = [
    // Answer in parentheses
    new RegExp(`${fraction.replace('/', '\\/')}.*?\\(\\s*(\\d+\\s*\\/\\s*\\d+)\\s*\\)`, 'g'),
    // Answer with arrow or colon
    new RegExp(`${fraction.replace('/', '\\/')}\\s*[→:]\\s*(\\d+\\s*\\/\\s*\\d+)`, 'g'),
  ];
  
  for (const pattern of nearbyPatterns) {
    const match = pattern.exec(text);
    if (match) {
      console.log(`Found student answer with pattern: ${match[1]}`);
      return match[1].replace(/\s/g, '');
    }
  }
  
  console.log('No student answer found');
  return "";
}
