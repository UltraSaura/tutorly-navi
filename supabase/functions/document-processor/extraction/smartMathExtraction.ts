// Type definition for extracted exercises
type Exercise = {
  question: string;
  answer: string;
};

export function extractSmartMathExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('\n=== SMART MATH EXTRACTION ===');

  // Strip markdown table pipes: "| 58 |" → "58"
  text = text.split('\n')
    .map(l => l.replace(/^\|+\s*|\s*\|+$/g, '').replace(/\|/g, ' ').trim())
    .join('\n');
  console.log(`Normalized text (pipes stripped):\n${text}`);

  const exercises: Array<{ question: string, answer: string }> = [];

  // First: try inline arithmetic on a reconstructed single line (handles OCR that splits vertically)
  const joinedLine = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !/^[-=_─]{2,}$/.test(l)).join(' ');
  console.log(`Joined line for inline check: "${joinedLine}"`);
  const inlineFirst = extractInlineArithmetic(joinedLine);
  if (inlineFirst.length > 0) {
    exercises.push(...inlineFirst);
    console.log(`Inline-first extraction found ${inlineFirst.length} exercises`);
    return exercises;
  }

  // Try vertical arithmetic (e.g. "23\nx 4\n---\n92")
  const verticalExercises = extractVerticalArithmetic(text);
  if (verticalExercises.length > 0) {
    exercises.push(...verticalExercises);
    console.log(`Vertical arithmetic extraction found ${verticalExercises.length} exercises`);
    return exercises;
  }

  // Try inline arithmetic on original text
  const inlineExercises = extractInlineArithmetic(text);
  if (inlineExercises.length > 0) {
    exercises.push(...inlineExercises);
    console.log(`Inline arithmetic extraction found ${inlineExercises.length} exercises`);
    return exercises;
  }

  // Try line-by-line LaTeX extraction
  const lineExercises = extractFromLines(text);
  if (lineExercises.length > 0) {
    exercises.push(...lineExercises);
    console.log(`Line-based extraction found ${lineExercises.length} exercises`);
    return exercises;
  }
  
  // Try OCR-friendly extraction
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
    
    // Line 2: operator + second number — OR separator then operator
    let opLineIdx = i + 1;
    
    // Skip separator between number and operator (handles: 58, ---, × 32, answer)
    if (opLineIdx < lines.length && /^[-=_─]{2,}$/.test(lines[opLineIdx])) {
      opLineIdx++;
    }
    
    if (opLineIdx >= lines.length) { i++; continue; }
    
    let opLine = lines[opLineIdx].match(/^([xX×\*\+\-−÷\/])\s*(\d+)$/);
    
    // Handle operator-only line: "X" followed by a number on the next line
    if (!opLine) {
      const opOnly = lines[opLineIdx].match(/^([xX×\*\+\-−÷\/])$/);
      if (opOnly && opLineIdx + 1 < lines.length) {
        const nextNum = lines[opLineIdx + 1].match(/^(\d+)$/);
        if (nextNum) {
          console.log(`  ⤷ Operator-only line "${lines[opLineIdx]}" + number "${nextNum[1]}"`);
          opLine = [lines[opLineIdx] + nextNum[1], opOnly[1], nextNum[1]] as unknown as RegExpMatchArray;
          opLineIdx++; // advance past the number line
        }
      }
    }
    
    if (!opLine) { i++; continue; }
    
    const num1 = numLine[1];
    const op = opMap[opLine[1]] || opLine[1];
    const num2 = opLine[2];
    const question = `${num1} ${op} ${num2}`;
    
    // Check for answer: skip separator lines and take next number
    let answer = '';
    let nextIdx = opLineIdx + 1;
    
    // Skip separator line if present
    if (nextIdx < lines.length && /^[-=_─]{2,}$/.test(lines[nextIdx])) {
      nextIdx++;
    }
    
    // Next line should be the answer (a number)
    if (nextIdx < lines.length) {
      const ansLine = lines[nextIdx].match(/^(\d+)$/);
      if (ansLine) {
        // Look ahead: if there's a separator + number after this, the REAL answer is further down
        const peekSep = nextIdx + 1;
        const peekAns = nextIdx + 2;
        if (peekSep < lines.length && /^[-=_─]{2,}$/.test(lines[peekSep]) &&
            peekAns < lines.length && /^(\d+)$/.test(lines[peekAns])) {
          answer = lines[peekAns].match(/^(\d+)$/)![1];
          i = peekAns + 1;
          console.log(`  ⤷ Look-ahead: skipped OCR artifact "${ansLine[1]}", real answer: ${answer}`);
        } else {
          answer = ansLine[1];
          i = nextIdx + 1;
        }
      } else {
        i = nextIdx;
      }
    } else {
      i = opLineIdx + 2;
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
