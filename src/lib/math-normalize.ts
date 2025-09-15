import { wordsToNumbers } from "words-to-numbers";

const REPLACERS: Array<[RegExp, string]> = [
  [/\bto the power of\b/gi, "^"],
  [/\bsquared\b/gi, "^2"],
  [/\bcubed\b/gi, "^3"],
  [/\bsquare root of\b/gi, "\\\\sqrt{"],
  [/\bcube root of\b/gi, "\\\\sqrt[3]{"],
  [/\bplus\b/gi, "+"],
  [/\bminus\b/gi, "-"],
  [/\btimes\b/gi, "*"],
  [/\bmultiply(?:\s+by)?\b/gi, "*"],
  [/\bdivided by\b/gi, "/"],
  [/\bover\b/gi, "/"],
  [/\bequals\b/gi, "="],
  [/\bis equal to\b/gi, "="],
  [/\bderivative of\b/gi, "d/dx "],
  [/\bintegral of\b/gi, "\\\\int "],
  [/\blimit as\b/gi, "\\\\lim_{x\\\\to } "],
  [/\bnatural log\b/gi, "ln"],
  [/\blogarithm\b/gi, "log"],
];

export function normalizeToLatex(raw: string): { latex: string; notes: string[] } {
  let s = raw.trim();
  const notes: string[] = [];

  try {
    const converted = wordsToNumbers(s, { fuzzy: true });
    if (typeof converted === "string") s = converted;
  } catch {}

  for (const [rx, rep] of REPLACERS) s = s.replace(rx, rep);

  s = s.replace(
    /(?<![A-Za-z0-9])([A-Za-z0-9.]+)\s*\/\s*([A-Za-z0-9.]+)(?![A-Za-z0-9])/g,
    (_m, a, b) => `\\\\frac{${a}}{${b}}`
  );

  const opens = (s.match(/\\sqrt\{/g) || []).length;
  const closes = (s.match(/\}/g) || []).length;
  if (opens > closes) s += "}".repeat(opens - closes);

  return { latex: s, notes };
}