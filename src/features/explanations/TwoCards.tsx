import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useTranslation } from "react-i18next"; // <-- Updated import
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
  const { t } = useTranslation(); // <-- Updated hook usage
  const resolveText = useResolveText();
  
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 {t('explanation.fallback.exercise')}</div> {/* <-- Updated */}
        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
          {s.exercise ? maskDigits(resolveText(s.exercise)) : t('explanation.fallback.exercise')}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Section title={`💡 ${t('explanation.fallback.concept')}`} text={s.concept} /> {/* <-- Updated */}
        <Section title={`🔍 ${t('explanation.fallback.example')}`} text={s.example} /> {/* <-- Updated */}
        <Section title={`☑️ ${t('explanation.fallback.strategy')}`} text={s.strategy} /> {/* <-- Updated */}
        <Section title={`⚠️ ${t('explanation.fallback.pitfall')}`} text={s.pitfall} /> {/* <-- Updated */}
        <Section title={`🎯 ${t('explanation.fallback.check')}`} text={s.check} /> {/* <-- Updated */}
        <Section title={`📈 ${t('explanation.fallback.practice')}`} text={s.practice} /> {/* <-- Updated */}
      </div>
    </div>
  );
}
