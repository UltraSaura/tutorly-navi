import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { useAdmin } from "@/context/AdminContext";

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { getActiveTemplate } = usePromptManagement();
  const { selectedModelId } = useAdmin();

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const explanationTemplate = getActiveTemplate('explanation');
      
      console.log('[TwoCardTeaching] Template Info:', {
        name: explanationTemplate?.name || 'No template',
        usage_type: explanationTemplate?.usage_type || 'N/A',
        template_id: explanationTemplate?.id || 'N/A'
      });
      
      const raw = await requestTwoCardTeaching({
        exercise_content: row?.prompt ?? "",
        student_answer: row?.userAnswer ?? "",
        subject: row?.subject ?? "math",
        response_language: profile?.response_language ?? "English",
        grade_level: profile?.grade_level ?? "High School",
      }, selectedModelId, explanationTemplate);
      
      console.log('[TwoCardTeaching] Raw AI Response:', raw);
      
      const parsed = parseTwoCardText(raw);
      
      // Only fallback when all three core fields are empty
      if (!parsed.concept && !parsed.example && !parsed.strategy) {
        console.log('[TwoCardTeaching] Using fallback - all core fields empty');
        setSections({
          exercise: "Your exercise",
          concept: "We'll focus on the exact math idea you need here.",
          example: "Here's a similar example with different numbers.",
          strategy: "1) Understand the goal  2) Apply the rules  3) Check your result.",
          pitfall: "Don't apply an operation to only one part.",
          check: "Explain why your steps are valid.",
        });
      } else {
        console.log('[TwoCardTeaching] Using parsed sections:', parsed);
        setSections(parsed);
      }
    } catch (e:any) {
      console.error('[TwoCardTeaching] Error:', e);
      setError("Couldn't load the teaching explanation. Please try again.");
      setSections({
        exercise: "Your exercise",
        concept: "We'll focus on the exact math idea you need here.",
        example: "Here's a similar example with different numbers.",
        strategy: "1) Understand the goal  2) Apply the rules  3) Check your result.",
        pitfall: "Don't apply an operation to only one part.",
        check: "Explain why your steps are valid.",
      });
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}