import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { useAdmin } from "@/context/AdminContext";
import { useLanguage } from "@/context/LanguageContext";

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { getActiveTemplate } = usePromptManagement();
  const { selectedModelId } = useAdmin();
  const { t } = useLanguage();

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      // Accept both Exercise shape and the normalized shape
      const exercise_content =
        row?.prompt || row?.question || row?.exercise_content || "";
      const student_answer = row?.userAnswer || row?.student_answer || "";
      const subject =
        row?.subject || row?.subjectId || "math";
        
      const explanationTemplate = getActiveTemplate('explanation');
      
      console.log("[Explain] template →", { name: explanationTemplate?.name, usage: explanationTemplate?.usage_type, id: explanationTemplate?.id });
      
      if (!explanationTemplate) {
        console.error('[TwoCardTeaching] No active explanation template found!');
        throw new Error('No active explanation template found. Please create one in the admin panel.');
      }
      
      const raw = await requestTwoCardTeaching({
        exercise_content,
        student_answer,
        subject: typeof subject === "string" ? subject : String(subject),
        response_language: profile?.response_language ?? "English",
        grade_level: profile?.grade_level ?? "High School",
      }, selectedModelId, explanationTemplate);
      
      console.log('[TwoCardTeaching] Raw AI Response:', raw);
      
      const parsed = parseTwoCardText(raw);
      console.log('[TwoCardTeaching] Parsed sections:', parsed);
      
      // Only fallback when all three core fields are empty
      if (!parsed.concept && !parsed.example && !parsed.strategy) {
        console.log('[TwoCardTeaching] Using fallback - all core fields empty');
        setSections({
          exercise: t('explanation.fallback.exercise'),
          concept: t('explanation.fallback.concept'),
          example: t('explanation.fallback.example'),
          strategy: t('explanation.fallback.strategy'),
          pitfall: t('explanation.fallback.pitfall'),
          check: t('explanation.fallback.check'),
          practice: t('explanation.fallback.practice'),
        });
      } else {
        console.log('[TwoCardTeaching] Using parsed sections:', parsed);
        setSections(parsed);
      }
    } catch (e:any) {
      console.error('[TwoCardTeaching] Error:', e);
      setError(t('explanation.error'));
      setSections({
        exercise: t('explanation.fallback.exercise'),
        concept: t('explanation.fallback.concept'),
        example: t('explanation.fallback.example'),
        strategy: t('explanation.fallback.strategy'),
        pitfall: t('explanation.fallback.pitfall'),
        check: t('explanation.fallback.check'),
        practice: t('explanation.fallback.practice'),
      });
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}