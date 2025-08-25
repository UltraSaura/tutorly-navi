import type { StepsPayload, Step } from "./types";

const ALLOWED: Step["icon"][] = ["magnifier","checklist","divide","lightbulb","target","warning"];

function redactAnswers(text: string): string {
  let t = text.replace(/\b\d+\s*\/\s*\d+\b/g, "your reduced fraction");
  t = t.replace(/\b([a-zA-Z])\s*=\s*-?\d+(\.\d+)?\b/g, "$1 = your value");
  t = t.replace(/(?:^|\s)(-?\d+(?:\.\d+)?)(?=(?:\s|$))/g, " your result"); // simple numeric guard
  return t;
}

function extractFirstJsonObject(s: string): string | null {
  s = s.replace(/```json|```/gi, "").trim();
  let start = s.indexOf("{");
  while (start !== -1) {
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); }
    }
    start = s.indexOf("{", start + 1);
  }
  return null;
}

export function safeParseNoAnswer(aiText: string): StepsPayload {
  try {
    const jsonStr = extractFirstJsonObject(aiText) ?? "{}";
    const obj = JSON.parse(jsonStr);
    const steps = Array.isArray(obj?.steps) ? obj.steps : [];
    const normalized: Step[] = steps
      .filter((s:any) => s && typeof s.title === "string" && typeof s.body === "string")
      .slice(0,5)
      .map((s:any) => ({
        title: (s.title || "").toString().slice(0,60),
        body: redactAnswers((s.body || "").toString().slice(0,600)),
        icon: ALLOWED.includes(s.icon) ? s.icon : "lightbulb",
      }));

    if (!normalized.length) throw new Error("empty steps");
    // soften a "target" finale into a check
    const last = normalized[normalized.length-1];
    if (last.icon === "target") {
      last.title = "Check your result";
      last.body = redactAnswers(last.body).replace(/final answer.*$/i, "Make sure your result is fully reduced and consistent.");
      last.icon = "lightbulb";
    }
    return { steps: normalized };
  } catch {
    return {
      steps: [{ title:"How to approach", body:"Break the problem into smaller actions and verify each step.", icon:"lightbulb" }]
    };
  }
}

// Keep the old function for backward compatibility
export function safeParse(aiText: string): StepsPayload {
  return safeParseNoAnswer(aiText);
}
