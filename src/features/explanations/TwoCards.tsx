import React from "react";
import type { TeachingSections } from "./useTwoCardTeaching";
import { useResolveText } from "@/hooks/useResolveText";
import { useEffect, useState } from 'react'; // NEW
import { supabase } from '@/integrations/supabase/client'; // NEW

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
  const [isGuardian, setIsGuardian] = useState(false); // NEW
  
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

      {/* Student View - Generic Guidance (NO answer reveal) */}
      {!isGuardian && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <Section title="💡 Concept" text={s.concept} />
          <Section title="🔍 Example" text={s.example} />
          <Section title="☑️ Strategy" text={s.strategy} />
          <Section title="⚠️ Pitfall" text={s.pitfall} />
          <Section title="🎯 Check yourself" text={s.check} />
          <Section title="📈 Practice Tip" text={s.practice} />
        </div>
      )}

      {/* Guardian View - Concept + Parent Help + Detailed Solution */}
      {isGuardian && (
        <>
          {/* Top Card: Concept & Parent Guidance */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <Section title="💡 Concept from Two Cards" text={s.concept} />
            <Section title="👨‍👩‍👧 Parent Help Hint" text={s.parentHelpHint} />
            <Section title="⚠️ Pitfall" text={s.pitfall} />
          </div>
          
          {/* Bottom Card: Current Exercise Solution */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📝</span>
              <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200">
                Current Exercise - Step-by-Step Solution
              </h3>
            </div>
            <div
              className={[
                "prose prose-neutral max-w-none",
                "leading-relaxed break-words",
                "whitespace-pre-wrap",
                "text-base text-blue-900 dark:text-blue-100",
              ].join(" ")}
              style={{
                whiteSpace: "pre-wrap",
                letterSpacing: "normal",
                wordSpacing: "normal",
              }}
            >
              {resolveText(s.currentExercise)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
