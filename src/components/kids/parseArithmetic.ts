/**
 * parseArithmetic — extracts a simple arithmetic expression from a text body.
 *
 * Returns { a, b, op } if found, or null.
 * Examples matched:
 *   "10 + 3"  → { a: 10, b: 3, op: "+" }
 *   "7 × 5"   → { a: 7,  b: 5, op: "×" }
 *   "12 - 4"  → { a: 12, b: 4, op: "-" }
 */

type Op = "+" | "-" | "×";

interface ParsedArithmetic {
  a: number;
  b: number;
  op: Op;
}

const OP_ALIASES: Record<string, Op> = {
  "+": "+",
  "-": "-",
  "×": "×",
  "*": "×",
  "x": "×",
  "X": "×",
};

export function parseArithmetic(text: string): ParsedArithmetic | null {
  if (!text) return null;
  // Match patterns like "10 + 3", "7×5", "12 - 4"
  const match = text.match(/(\d+)\s*([+\-×*xX])\s*(\d+)/);
  if (!match) return null;

  const a = parseInt(match[1], 10);
  const rawOp = match[2];
  const b = parseInt(match[3], 10);
  const op = OP_ALIASES[rawOp];
  if (!op) return null;

  // Only render visual if numbers are small enough to be clear (≤ 20)
  if (a > 20 || b > 20) return null;

  return { a, b, op };
}

/** Pick an emoji that fits the topic if we can detect it, else default */
export function pickEmoji(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("pomme") || lower.includes("apple")) return "🍎";
  if (lower.includes("ballon") || lower.includes("ball"))  return "⚽";
  if (lower.includes("étoile") || lower.includes("star"))  return "⭐";
  if (lower.includes("livre") || lower.includes("book"))   return "📚";
  if (lower.includes("carré") || lower.includes("square")) return "🟦";
  return "🔵";
}
