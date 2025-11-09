import React from "react";
import type { TeachingSections } from "./useTwoCardTeaching";
import { useResolveText } from "@/hooks/useResolveText";
import { useEffect, useState } from 'react'; // NEW
import { supabase } from '@/integrations/supabase/client'; // NEW
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { useUserContext } from '@/hooks/useUserContext';
import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { Badge } from '@/components/ui/badge';

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
  console.log('[TwoCards] Component rendered with sections:', s);
  const resolveText = useResolveText();
  const [isGuardian, setIsGuardian] = useState(false); // NEW
  const { userContext } = useUserContext(); // NEW: Get user context for grade level
  
  // NEW: Check if user is guardian
  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();
      
      setIsGuardian(data?.user_type === 'parent' || data?.user_type === 'guardian');
    }
    checkUserRole();
  }, []);

  // Detect operation type from example or exercise
  const detectOp = (text: string): string => {
    if (text.includes('×') || text.includes('*')) return '×';
    if (text.includes('÷') || text.includes('/')) return '÷';
    if (text.includes('-')) return '-';
    if (text.includes('+')) return '+';
    return '+';
  };
  
  // NEW: Extract math expression from example for InteractiveMathStepper
  let exampleExpression = s.example ? extractExpressionFromText(s.example) : null;
  
  // Fallback: If no expression extracted, synthesize one matching the operation type
  if (!exampleExpression) {
    const opSymbol = detectOp(s.example || s.exercise || '');
    const fallbacks: Record<string, string> = {
      '×': '4 × 5',
      '÷': '20 ÷ 4',
      '-': '50 - 17',
      '+': '23 + 45'
    };
    exampleExpression = fallbacks[opSymbol] || '23 + 45';
  }
  
  // Show interactive stepper for young students
  const shouldShowInteractiveStepper = !isGuardian && userContext?.student_level && 
    isUnder11YearsOld(userContext.student_level) && exampleExpression;
  
  // Ensure method text is never empty
  const methodText = s.method?.trim() || "Step-by-step reasoning for the example.";

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

      {/* Student View - Regular Explanation */}
      {!isGuardian && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <Section title="💡 Concept" text={s.concept} />
          <Section title="☑️ Method" text={methodText} />
          <Section title="🔍 Example" text={s.example} />
          <Section title="⚠️ Pitfall" text={s.pitfall} />
          <Section title="🎯 Check yourself" text={s.check} />
          <Section title="📈 Practice Tip" text={s.practice} />
        </div>
      )}

      {/* Student View - Interactive Math Stepper */}
      {shouldShowInteractiveStepper && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="font-semibold mb-3">🧮 Interactive Practice</div>
          <CompactMathStepper 
            expression={exampleExpression}
            className="text-sm"
          />
        </div>
      )}

      {/* Guardian View - Concept + Parent Help + Detailed Solution */}
      {isGuardian && (
        <>
          {/* Top Card: Concept & Parent Guidance */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <Section title="💡 Concept" text={s.concept} />
            <Section title="👨‍👩‍👧 Parent Help Hint" text={s.parentHelpHint} />
            <Section title="⚠️ Pitfall" text={s.pitfall} />
          </div>
          
          {/* Bottom Card: Current Exercise Solution */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📝</span>
              <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200">
                Current Exercise - Solution
              </h3>
            </div>
            
            {s.currentExercise && s.currentExercise !== 'No solution provided' ? (
              <div className="prose prose-neutral max-w-none leading-relaxed break-words whitespace-pre-wrap text-base text-blue-900 dark:text-blue-100">
                {resolveText(s.currentExercise)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Exercise:</strong> {resolveText(s.exercise)}
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    ✓ Correct Answer
                  </div>
                  <div className="text-lg font-mono text-green-900 dark:text-green-100 mt-1">
                    {resolveText(s.correctAnswer || 'Answer not available')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
