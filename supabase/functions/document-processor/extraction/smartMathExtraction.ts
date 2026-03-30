// Type definition for extracted exercises
type Exercise = {
  question: string;
  answer: string;
};

export function extractSmartMathExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== SMART MATH EXTRACTION ===');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Try line-by-line LaTeX extraction first (best for Mistral OCR output)
  const lineExercises = extractFromLines(text);
  if (lineExercises.length > 0) {
    exercises.push(...lineExercises);
    console.log(`Line-based extraction found ${lineExercises.length} exercises`);
    return exercises;
  }
  
  // Try OCR-friendly extraction (fractions and simple equations)
  const ocrExercises = extractFromOCRFormat(text);
  if (ocrExercises.length > 0) {
    exercises.push(...ocrExercises);
    console.log(`OCR extraction found ${ocrExercises.length} exercises`);
  }

  // Try Square Root extraction
  const sqrtExercises = extractSquareRootExercises(text);
  if (sqrtExercises.length > 0) {
    exercises.push(...sqrtExercises);
    console.log(`Square root extraction found ${sqrtExercises.length} exercises`);
  }
  
  console.log(`Smart extraction total: ${exercises.length} exercises`);
  return exercises;
}

/**
 * Line-by-line extraction for structured OCR output like Mistral's markdown.
 * Each line like "a.  $\frac{30}{63} = \frac{13}{23}$" becomes one exercise.
 */
function extractFromLines(text: string): Array<{ question: string, answer: string }> {
  console.log('--- Line-based Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Match: a. $\frac{N}{D} = \frac{AN}{AD}$  or  a. $\frac{N}{D} =$
    const m = line.match(/([a-e])[\.\)]\s*\$?\\frac\{(\d+)\}\{(\d+)\}\s*=\s*(?:\\frac\{(\d+)\}\{(\d+)\})?\s*\$?/i);
    if (m) {
      const letter = m[1].toLowerCase();
      const num = m[2];
      const den = m[3];
      const ansNum = m[4];
      const ansDen = m[5];
      const answer = (ansNum && ansDen) ? `${ansNum}/${ansDen}` : '';
      
      exercises.push({
        question: `${letter}. Simplifiez la fraction ${num}/${den}`,
        answer
      });
      console.log(`✅ Line exercise ${letter}: ${num}/${den} -> "${answer || 'NEEDS INPUT'}"`);
    }
  }
  
  return exercises;
}

function extractFromOCRFormat(text: string): Array<{ question: string, answer: string }> {
  console.log('--- OCR Format Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Build pairs of LHS (question) and optional RHS (student answer)
  // Process line-by-line to correctly pair each fraction with its answer
  const lines = text.split('\n');
  const pairs: Array<{ letter?: string; lhs: string; rhs: string }> = [];
  
  for (const line of lines) {
    // Try labeled equation: a. 30/63 = 13/23
    const labeled = line.match(/([a-e])[\.\)]\s*(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)\s*\/\s*(\d+)/i);
    if (labeled) {
      pairs.push({ letter: labeled[1].toLowerCase(), lhs: `${labeled[2]}/${labeled[3]}`, rhs: `${labeled[4]}/${labeled[5]}` });
      continue;
    }
    // Try labeled with parens: a. (30)/(63) = (13)/(23)
    const parenLabeled = line.match(/([a-e])[\.\)]\s*\((\d+)\)\s*\/\s*\((\d+)\)\s*=\s*\((\d+)\)\s*\/\s*\((\d+)\)/i);
    if (parenLabeled) {
      pairs.push({ letter: parenLabeled[1].toLowerCase(), lhs: `${parenLabeled[2]}/${parenLabeled[3]}`, rhs: `${parenLabeled[4]}/${parenLabeled[5]}` });
      continue;
    }
    // Try labeled LHS only: a. 30/63 =
    const lhsOnly = line.match(/([a-e])[\.\)]\s*(\d+)\s*\/\s*(\d+)\s*=/i);
    if (lhsOnly) {
      pairs.push({ letter: lhsOnly[1].toLowerCase(), lhs: `${lhsOnly[2]}/${lhsOnly[3]}`, rhs: '' });
      continue;
    }
  }
  
  // If no labeled pairs found, fall back to unlabeled fraction detection
  if (pairs.length === 0) {
    const seenLHS = new Set<string>();
    let m: RegExpExecArray | null;
    
    // Equations: 30/63 = 13/23
    const eqPattern = /(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)\s*\/\s*(\d+)/g;
    while ((m = eqPattern.exec(text)) !== null) {
      const lhs = `${m[1]}/${m[2]}`;
      if (!seenLHS.has(lhs)) { seenLHS.add(lhs); pairs.push({ lhs, rhs: `${m[3]}/${m[4]}` }); }
    }
    
    // LHS only: 30/63 =
    const lhsPattern = /(\d+)\s*\/\s*(\d+)\s*=/g;
    while ((m = lhsPattern.exec(text)) !== null) {
      const lhs = `${m[1]}/${m[2]}`;
      if (!seenLHS.has(lhs)) { seenLHS.add(lhs); pairs.push({ lhs, rhs: '' }); }
    }
  }
  
  // Build exercises from pairs
  pairs.forEach((pair, index) => {
    const letter = pair.letter || String.fromCharCode(97 + index);
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${pair.lhs}`,
      answer: pair.rhs
    });
    console.log(`✅ OCR exercise ${letter}: ${pair.lhs} -> "${pair.rhs || 'NEEDS INPUT'}"`);
  });
  
  return exercises;
}

// Extract equations with square roots from OCR or LaTeX-like text
function extractSquareRootExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('--- Square Root Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  const seen = new Set<string>();

  // Patterns with an equals sign (student provided an answer)
  const eqPatterns: RegExp[] = [
    /√\s*(\d+(?:\.\d+)?)\s*=\s*([-]?\d+(?:\.\d+)?)/g,
    /\\sqrt\{(\d+)\}\s*=\s*([-]?\d+(?:\.\d+)?)/g,
    /\bsqrt\s*(\d+(?:\.\d+)?)\s*=\s*([-]?\d+(?:\.\d+)?)/g
  ];

  for (const r of eqPatterns) {
    let m: RegExpExecArray | null;
    while ((m = r.exec(text)) !== null) {
      const rad = m[1];
      const ans = m[2];
      const key = `sqrt(${rad})`;
      if (seen.has(key)) continue;
      seen.add(key);
      exercises.push({ question: `Calcule √${rad}` , answer: ans });
    }
  }

  // If none with '=', also capture expressions without an explicit answer
  if (exercises.length === 0) {
    const barePatterns: RegExp[] = [
      /√\s*(\d+(?:\.\d+)?)/g,
      /\\sqrt\{(\d+)\}/g,
      /\bsqrt\s*(\d+(?:\.\d+)?)/g,
    ];
    for (const r of barePatterns) {
      let m: RegExpExecArray | null;
      while ((m = r.exec(text)) !== null) {
        const rad = m[1];
        const key = `sqrt(${rad})`;
        if (seen.has(key)) continue;
        seen.add(key);
        exercises.push({ question: `Calcule √${rad}`, answer: '' });
      }
    }
  }

  console.log(`Square root extraction found ${exercises.length} exercises`);
  return exercises;
}
