import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useLanguage } from "@/context/SimpleLanguageContext";

function maskDigits(s: string) {
  // Optional: hide numbers from the exercise to avoid hints
  return s.replace(/\d+\/\d+/g, "[your fraction]").replace(/\d/g, "█");
}

function resolveText(text: string, t: (key: string) => string) {
  if (!text) return "";
  // If a string looks like a key (a.b.c), try translating it
  if (/^[a-z]+\.[a-z.]+$/i.test(text)) {
    const translated = t(text);
    return translated || text;
  }
  return text;
}

function Section({ title, text, t }: { title: string; text: string; t: (key: string) => string }) {
  if (!text) return null;
  const content = resolveText(text, t);
  return (
    <div className="mt-3 first:mt-0">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function TwoCards({ s }: { s: TeachingSections }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 Exercise</div>
        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
          {s.exercise ? maskDigits(resolveText(s.exercise, t)) : t('explanation.fallback.exercise')}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Section title="💡 Concept" text={s.concept} t={t} />
        <Section title="🔍 Example (different numbers)" text={s.example} t={t} />
        <Section title="☑️ Strategy" text={s.strategy} t={t} />
        <Section title="⚠️ Pitfall" text={s.pitfall} t={t} />
        <Section title="🎯 Check yourself" text={s.check} t={t} />
        <Section title="📈 Practice Tip" text={s.practice} t={t} />
      </div>
    </div>
  );
}
