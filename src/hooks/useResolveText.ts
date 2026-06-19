import * as React from "react";

/**
 * Safely resolve text that might be:
 * - a plain string
 * - an array of string/ReactNodes (join with a single space)
 * - already a ReactNode (return as-is)
 * It NEVER trims or collapses spaces inside strings.
 */
export function useResolveText() {
  return (input: unknown): string => {
    if (input == null) return "";

    // Already a React node? Best-effort to string.
    if (React.isValidElement(input)) return String((input as any)?.props?.children ?? "");

    // Array? Join items with a single space between them.
    if (Array.isArray(input)) {
      return input
        .map((p) => (typeof p === "string" ? p : String(p ?? "")))
        .join(" ");
    }

    // String? Return exactly as-is (no trim/replace)
    if (typeof input === "string") return input;

    // Fallback
    return String(input);
  };
}
