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
    const trimmedHead = head?.trim() || "";
    
    // Extract content - handle cases where content is on the same line as header
    let content = rest.join("\n").trim();
    
    // Check if header contains content on the same line (e.g., "📘 Exercise  2+3=56")
    if (!content && trimmedHead) {
      const headerMatch = trimmedHead.match(/^(📘|💡|🔍|☑️|⚠️|🎯|📈)\s*([^📘💡🔍☑️⚠️🎯📈]*?)\s*(.*)$/);
      if (headerMatch && headerMatch[3]) {
        content = headerMatch[3].trim();
      }
    }
    
    // Normalize header keys by removing extra content after the emoji and label
    let normalizedKey = "";
    if (trimmedHead.startsWith("📘")) normalizedKey = "📘 Exercise";
    else if (trimmedHead.startsWith("💡")) normalizedKey = "💡 Concept";
    else if (trimmedHead.startsWith("🔍")) normalizedKey = "🔍 Example (different numbers)";
    else if (trimmedHead.startsWith("☑️")) normalizedKey = "☑️ Strategy";
    else if (trimmedHead.startsWith("⚠️")) normalizedKey = "⚠️ Pitfall";
    else if (trimmedHead.startsWith("🎯")) normalizedKey = "🎯 Check yourself";
    else if (trimmedHead.startsWith("📈")) normalizedKey = "📈 Practice Tip";
    
    if (normalizedKey) {
      map[normalizedKey] = content;
    }
  }
  
  // Fallback: If no exercise found, try to extract it from the raw text
  let exerciseContent = map["📘 Exercise"] || "";
  if (!exerciseContent && text) {
    const exerciseMatch = text.match(/📘[^📘💡🔍☑️⚠️🎯📈]*?([0-9+\-*\/=\s\(\)\.]+)/);
    if (exerciseMatch && exerciseMatch[1]) {
      exerciseContent = exerciseMatch[1].trim();
    }
  }
  
  return {
    exercise: exerciseContent,
    concept:  map["💡 Concept"] || "",
    example:  map["🔍 Example (different numbers)"] || "",
    strategy: map["☑️ Strategy"] || "",
    pitfall:  map["⚠️ Pitfall"] || "",
    check:    map["🎯 Check yourself"] || "",
    practice: map["📈 Practice Tip"] || "",
  };
}