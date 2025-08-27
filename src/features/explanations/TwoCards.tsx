import React from "react";
import type { TeachingSections } from "./twoCardParser";

function maskDigits(s: string) {
  // Optional: hide numbers from the exercise to avoid hints
  return s.replace(/\d+\/\d+/g, "[your fraction]").replace(/\d/g, "█");
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div className="mt-3 first:mt-0">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function TwoCards({ s }: { s: TeachingSections }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 Exercise</div>
        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
          {s.exercise ? maskDigits(s.exercise) : "This is your exercise. Try to restate it in your own words."}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Section title="💡 Concept" text={s.concept} />
        <Section title="🔍 Example (different numbers)" text={s.example} />
        <Section title="☑️ Strategy" text={s.strategy} />
        <Section title="⚠️ Pitfall" text={s.pitfall} />
        <Section title="🎯 Check yourself" text={s.check} />
      </div>
    </div>
  );
}