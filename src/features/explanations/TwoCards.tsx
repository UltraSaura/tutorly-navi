import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useResolveText } from "@/hooks/useResolveText";

function maskDigits(s: string) {
  // Optional: hide numbers from the exercise to avoid hints
  return s.replace(/\d+\/\d+/g, "[your fraction]").replace(/\d/g, "█");
}

function Section({ title, text }: { title: string; text: string }) {
  const resolveText = useResolveText();
  if (!text) return null;
  const content = resolveText(text);
  return (
    <div className="mt-3 first:mt-0">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function TwoCards({ s }: { s: TeachingSections }) {
  const { t } = useLanguage();
  const resolveText = useResolveText();
  
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 Exercise</div>
        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
          {s.exercise ? maskDigits(resolveText(s.exercise)) : t('explanation.fallback.exercise')}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Section title="💡 Concept" text={s.concept} />
        <Section title="🔍 Example (different numbers)" text={s.example} />
        <Section title="☑️ Strategy" text={s.strategy} />
        <Section title="⚠️ Pitfall" text={s.pitfall} />
        <Section title="🎯 Check yourself" text={s.check} />
        <Section title="📈 Practice Tip" text={s.practice} />
      </div>
    </div>
  );
}
