import type { StepsPayload, Step } from "./types";

const ALLOWED_ICONS: Step["icon"][] = ["lightbulb","magnifier","divide","checklist","warning","target"];
const ALLOWED_KIND: Step["kind"][] = ["concept","example","strategy","pitfall","check"];

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

function redactAnswers(text: string): string {
  let t = text.replace(/\b\d+\s*\/\s*\d+\b/g, "your reduced fraction");
  t = t.replace(/\b([a-zA-Z])\s*=\s*-?\d+(\.\d+)?\b/g, "$1 = your value");
  t = t.replace(/(?:^|\s)(-?\d+(?:\.\d+)?)(?=(?:\s|$))/g, " your result"); // very simple numeric guard
  return t;
}

export function parseConceptResponse(aiText: string): StepsPayload {
  try {
    const jsonStr = extractFirstJsonObject(aiText) ?? "{}";
    const obj = JSON.parse(jsonStr);
    const stepsRaw = Array.isArray(obj?.steps) ? obj.steps : [];
    const meta = obj?.meta ?? { mode: "concept", revealAnswer: false };

    const steps: Step[] = stepsRaw.slice(0,5).map((s: any) => ({
      title: (s?.title ?? "").toString().slice(0, 60),
      body: redactAnswers((s?.body ?? "").toString().slice(0, 700)),
      icon: ALLOWED_ICONS.includes(s?.icon) ? s.icon : "lightbulb",
      kind: ALLOWED_KIND.includes(s?.kind) ? s.kind : "concept",
    })).filter(s => s.title && s.body);

    if (!steps.length) throw new Error("empty steps");

    // If last step says "final answer" ideas, soften it
    const last = steps[steps.length - 1];
    if (last.icon === "target" && last.kind !== "check") {
      last.kind = "check";
      last.title = "Check yourself";
      last.body = "Confirm your result is fully reduced and consistent. Explain why each step is valid.";
      last.icon = "checklist";
    }

    return { steps, meta };
  } catch {
    return {
      steps: [{
        title: "Understand the concept",
        body: "Recall the definition and a simple example with different numbers. Then try the same strategy on your problem.",
        icon: "lightbulb",
        kind: "concept"
      }],
      meta: { mode: "concept", revealAnswer: false }
    };
  }
}
