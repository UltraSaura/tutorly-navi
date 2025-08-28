export type TeachingSections = {
  exercise: string; concept: string; example: string;
  strategy: string; pitfall: string; check: string; practice: string;
};

const LABELS = [
  "📘 Exercise",
  "💡 Concept",
  "🔍 Example (different numbers)",
  "☑️ Strategy",
  "⚠️ Pitfall",
  "🎯 Check yourself",
  "📈 Practice Tip",
] as const;

export function parseTwoCardText(raw: string): TeachingSections {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  const parts = text.split(/\n(?=📘|💡|🔍|☑️|⚠️|🎯|📈)/).map(s => s.trim());
  const map: Record<string,string> = {};
  for (const block of parts) {
    const [head, ...rest] = block.split("\n");
    map[head?.trim() || ""] = (rest.join("\n").trim()) || "";
  }
  return {
    exercise: map["📘 Exercise"] || "",
    concept:  map["💡 Concept"] || "",
    example:  map["🔍 Example (different numbers)"] || "",
    strategy: map["☑️ Strategy"] || "",
    pitfall:  map["⚠️ Pitfall"] || "",
    check:    map["🎯 Check yourself"] || "",
    practice: map["📈 Practice Tip"] || "",
  };
}