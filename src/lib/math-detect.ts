import Fuse from "fuse.js";
import { PHRASES, MATH_SYMBOLS } from "@/config/math-phrases";

const KEYWORDS: string[] = Object.values(PHRASES).flat();

const fuse = new Fuse(KEYWORDS.map(k => ({ k })), {
  includeScore: true,
  keys: ["k"],
  threshold: 0.35, // typo tolerance
});

const WORDY_MATH_PATTERNS: RegExp[] = [
  /\bsolve\s+for\b/i,
  /\bwhat\s+is\b/i,
  /\bevaluate\b/i,
  /\bderivative\s+of\b/i,
  /\bintegral\s+of\b/i,
  /\blimit\s+as\b/i,
  /\b(area|volume|perimeter|circumference|slope|distance)\b/i,
  /\b(mean|median|mode|variance|probability|distribution|expected value)\b/i
];

export function isLikelyMath(input: string): boolean {
  if (!input) return false;
  if (MATH_SYMBOLS.test(input)) return true;
  if (WORDY_MATH_PATTERNS.some(rx => rx.test(input))) return true;

  const hasNumbers = /\d/.test(input) || /\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)\b/i.test(input);
  const hasOpWords = /\b(plus|minus|times|over|divided|product|sum|difference|power|squared|cubed|equals|equal)\b/i.test(input);
  if (hasNumbers && hasOpWords) return true;

  const results = fuse.search(input);
  const strongHit = results.some(r => (r.score ?? 1) < 0.2);
  if (strongHit) return true;

  if (/^\s*(=|calc:)/i.test(input)) return true;
  if (/^\s*\$.+\$\s*$/.test(input)) return true;

  return false;
}