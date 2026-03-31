// Type definition for extracted exercises
type Exercise = {
  question: string;
  answer: string;
};

export function extractSmartMathExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== SMART MATH EXTRACTION ===');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Try vertical arithmetic first (e.g. "23\nx 4\n---\n92" or "23\nx 4\n6")
  const verticalExercises = extractVerticalArithmetic(text);
  if (verticalExercises.length > 0) {
    exercises.push(...verticalExercises);
    console.log(`Vertical arithmetic extraction found ${verticalExercises.length} exercises`);
    return exercises;
  }

  // Try inline arithmetic (e.g. "23 x 4 = 92", "5 + 3 = 8")
  const inlineExercises = extractInlineArithmetic(text);
  if (inlineExercises.length > 0) {
    exercises.push(...inlineExercises);
    console.log(`Inline arithmetic extraction found ${inlineExercises.length} exercises`);
    return exercises;
  }

  // Try line-by-line LaTeX extraction (best for Mistral OCR output)
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

/**
 * Detect vertical arithmetic format from OCR output.
 * Handles patterns like:
 *   23        15        48
 *   x 4       + 7       - 12
 *   ---       ---       ----
 *   92        22        36
 * 
 * OCR typically outputs this as multi-line text:
 *   "23\nx 4\n92"  or  "23\nx 4\n---\n92"
 */
function extractVerticalArithmetic(text: string): Array<{ question: string, answer: string }> {
  console.log('--- Vertical Arithmetic Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Lines for vertical detection: ${JSON.stringify(lines)}`);
  
  if (lines.length < 2) return exercises;
  
  // Map operator symbols to display symbols
  const opMap: Record<string, string> = {
    'x': '×', 'X': '×', '×': '×', '*': '×',
    '+': '+',
    '-': '-', '−': '-',
    '÷': '÷', '/': '÷',
  };
  
  let i = 0;
  while (i < lines.length - 1) {
    // Line 1: first number (e.g. "23")
    const numLine = lines[i].match(/^(\d+)$/);
    if (!numLine) { i++; continue; }
    
    // Line 2: operator + second number (e.g. "x 4", "+ 7", "- 12")
    const opLine = lines[i + 1].match(/^([xX×\*\+\-−÷\/])\s*(\d+)$/);
    if (!opLine) { i++; continue; }
    
    const num1 = numLine[1];
    const op = opMap[opLine[1]] || opLine[1];
    const num2 = opLine[2];
    const question = `${num1} ${op} ${num2}`;
    
    // Check for answer: skip separator lines (---, ===, ___) and take next number
    let answer = '';
    let nextIdx = i + 2;
    
    // Skip separator line if present
    if (nextIdx < lines.length && /^[-=_─]{2,}$/.test(lines[nextIdx])) {
      nextIdx++;
    }
    
    // Next line should be the answer (a number)
    if (nextIdx < lines.length) {
      const ansLine = lines[nextIdx].match(/^(\d+)$/);
      if (ansLine) {
        answer = ansLine[1];
        i = nextIdx + 1; // Skip past the answer
      } else {
        i = nextIdx;
      }
    } else {
      i = i + 2;
    }
    
    exercises.push({ question, answer });
    console.log(`✅ Vertical arithmetic: ${question} = ${answer || 'NEEDS INPUT'}`);
  }
  
  return exercises;
}

/**
 * Detect inline arithmetic expressions like:
 *   "23 x 4 = 92", "5 + 3 = 8", "15 - 7 = 8", "20 ÷ 4 = 5"
 *   Also handles: "23 × 4 =", "5 + 3 ="
 */
function extractInlineArithmetic(text: string): Array<{ question: string, answer: string }> {
  console.log('--- Inline Arithmetic Extraction ---');
  const exercises: Array<{ question: string, answer: string }> = [];
  
  // Pattern: number op number = answer (or just =)
  const pattern = /(\d+)\s*([xX×\*\+\-−÷\/])\s*(\d+)\s*=\s*(\d+)?/g;
  let m: RegExpExecArray | null;
  
  const opMap: Record<string, string> = {
    'x': '×', 'X': '×', '×': '×', '*': '×',
    '+': '+',
    '-': '-', '−': '-',
    '÷': '÷', '/': '÷',
  };
  
  while ((m = pattern.exec(text)) !== null) {
    const op = opMap[m[2]] || m[2];
    const question = `${m[1]} ${op} ${m[3]}`;
    const answer = m[4] || '';
    
    exercises.push({ question, answer });
    console.log(`✅ Inline arithmetic: ${question} = ${answer || 'NEEDS INPUT'}`);
  }
  
  return exercises;
}
