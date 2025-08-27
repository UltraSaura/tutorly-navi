export type TeachingSections = {
  exercise: string; concept: string; example: string;
  strategy: string; pitfall: string; check: string;
};

const LABELS = [
  "📘 Exercise",
  "💡 Concept",
  "🔍 Example (different numbers)",
  "☑️ Strategy",
  "⚠️ Pitfall",
  "🎯 Check yourself",
] as const;

export function parseTwoCardText(raw: string): TeachingSections {
  const map: Record<string, string> = {};
  const parts = raw.split(/\n(?=📘|💡|🔍|☑️|⚠️|🎯)/).map(s => s.trim());
  for (const part of parts) {
    const [firstLine, ...rest] = part.split("\n");
    map[firstLine] = (rest.join("\n").trim()) || "";
  }
  return {
    exercise: map["📘 Exercise"] || "",
    concept:  map["💡 Concept"] || "",
    example:  map["🔍 Example (different numbers)"] || "",
    strategy: map["☑️ Strategy"] || "",
    pitfall:  map["⚠️ Pitfall"] || "",
    check:    map["🎯 Check yourself"] || "",
  };
}