import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useLanguage } from "@/context/LanguageContext";

function maskDigits(s: string) {
  // Optional: hide numbers from the exercise to avoid hints
  return s.replace(/\d+\/\d+/g, "[your fraction]").replace(/\d/g, "█");
}

function resolveText(text: string, t: (key: string) => string) {
  if (!text) return "";
  // If the text looks like a translation key (our fallback keys), translate it at render time
  if (text.startsWith("explanation.")) {
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
      </div>
    </div>
  );
}
