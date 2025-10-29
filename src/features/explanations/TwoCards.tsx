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

  // NEW: Extract math expression from example for InteractiveMathStepper
  let exampleExpression = s.example ? extractExpressionFromText(s.example) : null;
  
  // Fallback: If no expression extracted, create a simple addition example
  if (!exampleExpression && s.example && s.example.includes('+')) {
    exampleExpression = '23 + 45'; // Simple fallback example
  }
  
  // Additional fallback: Always provide an example for young students
  if (!exampleExpression) {
    exampleExpression = '123 + 456'; // Default example
  }
  
  // Debug logging for Interactive Math Stepper
  console.log('[TwoCards] Debug Interactive Stepper:', {
    isGuardian,
    userContext: userContext?.student_level,
    userContextFull: userContext,
    isUnder11: userContext?.student_level ? isUnder11YearsOld(userContext.student_level) : false,
    exampleText: s.example,
    extractedExpression: exampleExpression,
    hasUserContext: !!userContext,
    hasStudentLevel: !!userContext?.student_level,
    shouldShow: !isGuardian && userContext?.student_level && isUnder11YearsOld(userContext.student_level) && exampleExpression
  });
  
  // More permissive condition - show for any student (not guardian) with an example
  // TEMPORARY: Always show for testing
  const shouldShowInteractiveStepper = true; // TEMPORARY: Always show for debugging

  return (
    <div className="space-y-3">
      {/* TEST: Simple debug section */}
      <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700 p-4">
        <div className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">
          🔧 DEBUG: TwoCards Component is Working!
        </div>
        <div className="text-xs text-red-600 dark:text-red-400">
          Component rendered at: {new Date().toLocaleTimeString()}
        </div>
      </div>

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

      {/* Student View - Part 1: Regular Explanation */}
      {!isGuardian && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📚 Part 1: Regular Explanation
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Debug: User Level = "{userContext?.student_level || 'Unknown'}", Is Guardian = {isGuardian.toString()}
            </div>
          </div>
          
          <Section title="💡 Concept" text={s.concept} />
          <Section title="🔍 Example" text={s.example} />
          <Section title="☑️ Method" text={s.method} />
          <Section title="⚠️ Pitfall" text={s.pitfall} />
          <Section title="🎯 Check yourself" text={s.check} />
          <Section title="📈 Practice Tip" text={s.practice} />
        </div>
      )}

      {/* Student View - Part 2: Interactive Math Stepper */}
      {!isGuardian && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700 p-4 shadow-lg">
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md">
            <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
              🧮 Part 2: Interactive Math Practice
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mb-2">
              Debug: Expression = "{exampleExpression}", Should Show = {shouldShowInteractiveStepper.toString()}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              This section is always visible for students (not guardians) for testing purposes.
            </div>
          </div>
          
          {exampleExpression ? (
            <CompactMathStepper 
              expression={exampleExpression}
              className="text-sm"
            />
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ No math expression found for Interactive Stepper
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Example text: "{s.example?.substring(0, 100)}..."
              </div>
            </div>
          )}
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
