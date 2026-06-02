/**
 * Safely resolve text that might be:
 * - a plain string
 * - null/undefined
 * - an array of strings (joined with a single space)
 * Always returns a string. Never trims or collapses spaces inside strings.
 */
export function useResolveText() {
  return (input: unknown): string => {
    if (input == null) return "";
    if (typeof input === "string") return input;
    if (Array.isArray(input)) {
      return input.map((p) => (typeof p === "string" ? p : String(p ?? ""))).join(" ");
    }
    return String(input);
  };
}
