import type { StepsPayload, Step } from "./types";

const ALLOWED: Step["icon"][] = ["magnifier","checklist","divide","lightbulb","target","warning"];

function extractFirstJsonObject(s: string): string | null {
  // find first balanced {...}
  let start = s.indexOf("{");
  while (start !== -1) {
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
    start = s.indexOf("{", start + 1);
  }
  return null;
}

export function safeParse(aiText: string): StepsPayload {
  try {
    const cleaned = aiText.replace(/```json|```/gi, "").trim();
    const jsonStr = cleaned.startsWith("{") ? cleaned : (extractFirstJsonObject(cleaned) ?? "");
    
    if (!jsonStr) {
      throw new Error("No JSON object found");
    }

    const obj = JSON.parse(jsonStr);

    const steps = Array.isArray(obj?.steps) ? obj.steps : [];
    const normalized: Step[] = steps
      .filter((s: any) => s && typeof s.title === "string" && typeof s.body === "string")
      .slice(0, 5)
      .map((s: any) => ({
        title: (s.title || "").toString().slice(0, 60),
        body: (s.body || "").toString().slice(0, 600),
        icon: ALLOWED.includes(s.icon) ? s.icon : "lightbulb",
      }));

    if (normalized.length) return { steps: normalized };
    throw new Error("No valid steps");
  } catch (e) {
    console.warn("[Explain] parse fallback:", e);
    return {
      steps: [{
        title: "How to approach",
        body: "Break the problem into smaller actions. Identify common factors, try dividing, and verify your result.",
        icon: "lightbulb",
      }]
    };
  }
}