import React from "react";
import type { TeachingSections } from "./twoCardParser";
import { useResolveText } from "@/hooks/useResolveText";

function maskDigits(s: string) {
  // Aggressive masking: hide ALL final answers and results
  if (!s) return s;
  
  // Patterns that indicate solution contexts (mask these numbers)
  const solutionPatterns = [
    // English result indicators
    /(\b(?:answer|solution|result|equals?|total)\s*:?\s*)(\d+(?:\.\d+)?)/gi,
    /(\b(?:so|therefore|thus|finally)\s+.*?)(\d+(?:\.\d+)?)/gi,
    /(\b(?:the answer is|we get|this gives us|you get|your result)\s+)(\d+(?:\.\d+)?)/gi,
    
    // French result indicators
    /(\b(?:réponse|résultat|solution|total|égal)\s*:?\s*)(\d+(?:\.\d+)?)/gi,
    /(\b(?:donc|ainsi|finalement)\s+.*?)(\d+(?:\.\d+)?)/gi,
    /(\b(?:la réponse est|on obtient|cela donne)\s+)(\d+(?:\.\d+)?)/gi,
    
    // Mathematical expressions with results
    // Repeated addition: "3 + 3 + 3 + 3 + 3 = 15"
    /(\d+(?:\s*\+\s*\d+){2,}\s*=\s*)(\d+(?:\.\d+)?)/g,
    // Multi-step equations: "3 × 2 + 5 = 6 + 5 = 11"
    /(\d+(?:\s*[\*×\/÷\+\-]\s*\d+)+\s*=\s*\d+(?:\s*[\*×\/÷\+\-]\s*\d+)*\s*=\s*)(\d+(?:\.\d+)?)/g,
    // Complex operations: "2*3*4 = 24"
    /(\d+(?:\s*[\*×\/÷\+\-]\s*\d+)+\s*=\s*)(\d+(?:\.\d+)?)/g,
    // Simple operations: "5 + 3 = 8"
    /(\d+\s*[\*×\/÷\+\-]\s*\d+\s*=\s*)(\d+(?:\.\d+)?)/g,
    // Just equals sign followed by number at end of line
    /(\s*=\s*)(\d+(?:\.\d+)?)(?=\s*$|\s*\.|\s*,)/gm
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
  // Apply masking to ALL sections to prevent answer leakage
  const maskedText = maskDigits(text);
  const content = resolveText(maskedText);
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
