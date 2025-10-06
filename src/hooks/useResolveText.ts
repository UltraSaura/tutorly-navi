import * as React from "react";

/**
 * Safely resolve text that might be:
 * - a plain string
 * - an array of string/ReactNodes (join with a single space)
 * - already a ReactNode (return as-is)
 * It NEVER trims or collapses spaces inside strings.
 */
export function useResolveText() {
  return (input: unknown): React.ReactNode => {
    if (input == null) return "";

    // Already a React node? Return as-is.
    if (React.isValidElement(input)) return input as React.ReactNode;

    // Array? Join items with a SPACE between them (not '')
    if (Array.isArray(input)) {
      // Convert each to string (or text) but keep spaces
      const parts = input.map((p) =>
        typeof p === "string" ? p : (React.isValidElement(p) ? p : String(p ?? ""))
      );
      // Interleave a single space between non-empty string parts
      const out: React.ReactNode[] = [];
      parts.forEach((p, i) => {
        out.push(p);
        if (i < parts.length - 1) out.push(" ");
      });
      return out;
    }

    // String? Return exactly as-is (no trim/replace)
    if (typeof input === "string") return input;

    // Fallback
    return String(input);
  };
}
