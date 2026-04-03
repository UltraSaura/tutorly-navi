/**
 * Utility to detect math content in text and split it into
 * a plain-text prefix + a LaTeX string for rendering.
 */

/** Check whether a string contains renderable math content */
export const containsMathContent = (text: string): boolean => {
  if (!text) return false;
  return (
    /\d+\s*\/\s*\d+/.test(text) ||           // fractions like 30/63
    /\\frac\{/.test(text) ||                   // LaTeX fractions
    /√/.test(text) ||                          // square root symbol
    /\\sqrt/.test(text) ||                     // LaTeX sqrt
    /\d+\s*\^\s*\d+/.test(text) ||            // exponents
    /\\cdot/.test(text)                        // LaTeX multiplication
  );
};

interface MathDisplay {
  prefix: string;
  latex: string;
}

/**
 * Split a text string into a human-readable prefix and a LaTeX expression.
 *
 * Examples:
 *   "a. Simplifiez la fraction 30/63"
 *     → { prefix: "a. Simplifiez la fraction", latex: "\\frac{30}{63}" }
 *
 *   "13/23"
 *     → { prefix: "", latex: "\\frac{13}{23}" }
 *
 *   "Hello world" (no math)
 *     → { prefix: "Hello world", latex: "" }
 */
export const textToMathDisplay = (text: string): MathDisplay => {
  if (!text) return { prefix: '', latex: '' };

  // If text already contains \frac, split around the first LaTeX command
  const fracIdx = text.indexOf('\\frac');
  if (fracIdx !== -1) {
    return {
      prefix: text.slice(0, fracIdx).trim(),
      latex: text.slice(fracIdx).trim(),
    };
  }

  // Match all fractions in the text and convert the last occurrence
  // (the math part is usually at the end of the sentence)
  const fractionPattern = /(\d+)\s*\/\s*(\d+)/g;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = fractionPattern.exec(text)) !== null) {
    lastMatch = m;
  }

  if (lastMatch) {
    const beforeFraction = text.slice(0, lastMatch.index).trim();
    const afterFraction = text.slice(lastMatch.index + lastMatch[0].length).trim();

    // Check if there's an "= N/D" after the first fraction (e.g. "30/63 = 13/23")
    const equalsMatch = afterFraction.match(/^=\s*(\d+)\s*\/\s*(\d+)/);
    if (equalsMatch) {
      const latex = `\\frac{${lastMatch[1]}}{${lastMatch[2]}} = \\frac{${equalsMatch[1]}}{${equalsMatch[2]}}`;
      const rest = afterFraction.slice(equalsMatch[0].length).trim();
      return {
        prefix: beforeFraction,
        latex: rest ? `${latex} ${rest}` : latex,
      };
    }

    return {
      prefix: beforeFraction,
      latex: `\\frac{${lastMatch[1]}}{${lastMatch[2]}}${afterFraction ? ' ' + afterFraction : ''}`,
    };
  }

  // √ symbol
  const sqrtMatch = text.match(/√\s*\(?(\d+)\)?/);
  if (sqrtMatch) {
    return {
      prefix: text.slice(0, sqrtMatch.index).trim(),
      latex: `\\sqrt{${sqrtMatch[1]}}`,
    };
  }

  // No math found
  return { prefix: text, latex: '' };
};

/**
 * Convert a plain answer string (e.g. "13/23") to LaTeX if it's a fraction.
 */
export const answerToLatex = (answer: string): string | null => {
  if (!answer) return null;
  const m = answer.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return `\\frac{${m[1]}}{${m[2]}}`;
  return null;
};
