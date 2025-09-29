import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useResolveText } from "@/hooks/useResolveText";

function maskDigits(s: string) {
  // Smart masking: show problem values, hide only solutions/answers
  if (!s) return s;
  
  // Patterns that indicate solution contexts (mask these numbers)
  const solutionPatterns = [
    /(\b(?:answer|solution|result|equals?)\s*:?\s*)(\d+(?:\.\d+)?)/gi,
    /(\b(?:so|therefore|thus)\s+.*?)(\d+(?:\.\d+)?)/gi,
    /(\s*=\s*)(\d+(?:\.\d+)?)/g,
    /(\b(?:the answer is|we get|this gives us)\s+)(\d+(?:\.\d+)?)/gi,
    // Catch mathematical expressions with results (e.g., "2*3*4 = 24", "3 × 2 + 5 = 11")
    /(\d+(?:\s*[\*×\/÷\+\-]\s*\d+)+\s*=\s*)(\d+(?:\.\d+)?)/g,
    // Catch simple operations with results (e.g., "5 + 3 = 8")
    /(\d+\s*[\*×\/÷\+\-]\s*\d+\s*=\s*)(\d+(?:\.\d+)?)/g
  ];
  
  let masked = s;
  
  // Apply solution masking
  solutionPatterns.forEach(pattern => {
    masked = masked.replace(pattern, (match, prefix, number) => {
      return prefix + "___";
    });
  });
  
  return masked;
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
  const resolveText = useResolveText();
  
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">📘 Exercise</div>
        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
          {s.exercise ? maskDigits(resolveText(s.exercise)) : "No exercise provided"}
        </p>
      </div>
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
