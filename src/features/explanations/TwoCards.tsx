import React from "react";
import type { TeachingSections } from "./useTwoCardTeaching";
import { useResolveText } from "@/hooks/useResolveText";

function Section({ title, text }: { title: string; text: string }) {
  const resolveText = useResolveText();
  if (!text) return null;

  const content = resolveText(text);

  return (
    <div className="mt-4 first:mt-0">
      <div className="font-medium">{title}</div>
      <div
        className={[
          // readable body + robust resets against global styles
          "explain-text prose prose-neutral max-w-none",
          "leading-relaxed break-words",
          "whitespace-pre-line",
          "!tracking-normal [letter-spacing:normal] [word-spacing:normal]",
          "text-sm text-muted-foreground",
        ].join(" ")}
        style={{
          whiteSpace: "pre-line",
          letterSpacing: "normal",
          wordSpacing: "normal",
        }}
      >
        {content}
      </div>
    </div>
  );
}

export function TwoCards({ s }: { s: TeachingSections }) {
  const resolveText = useResolveText();

  return (
    <div className="space-y-3">
      {/* Problem card */}
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 Exercise</div>
        <div
          className={[
            "explain-text prose prose-neutral max-w-none",
            "mt-1 leading-relaxed break-words",
            "whitespace-pre-line",
            "!tracking-normal [letter-spacing:normal] [word-spacing:normal]",
            "text-muted-foreground",
          ].join(" ")}
          style={{
            whiteSpace: "pre-line",
            letterSpacing: "normal",
            wordSpacing: "normal",
          }}
        >
          {s.exercise ? resolveText(s.exercise) : "No exercise provided"}
        </div>
      </div>

      {/* Guidance card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Section title="💡 Concept" text={s.concept} />
        <Section title="🔍 Example" text={s.example} />
        <Section title="☑️ Strategy" text={s.strategy} />
        <Section title="⚠️ Pitfall" text={s.pitfall} />
        <Section title="🎯 Check yourself" text={s.check} />
        <Section title="📈 Practice Tip" text={s.practice} />
      </div>
    </div>
  );
}
