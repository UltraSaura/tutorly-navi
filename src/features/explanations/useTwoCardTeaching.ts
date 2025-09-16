import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { useAdmin } from "@/context/AdminContext";
import { useLanguage } from "@/context/LanguageContext";
import { ensureLanguage } from "@/lib/ensureLanguage";

// Cache for storing explanations to avoid repeated AI requests
const explanationCache = new Map<string, TeachingSections>();

// Generate cache key from exercise data
function generateCacheKey(
  exercise_content: string, 
  student_answer: string, 
  subject: string, 
  response_language: string, 
  grade_level: string
): string {
  return `${exercise_content}|${student_answer}|${subject}|${response_language}|${grade_level}`;
}

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
    setError(null);
    
    try {
      // Accept both Exercise shape and the normalized shape
      const exercise_content =
        row?.prompt || row?.question || row?.exercise_content || "";
      const student_answer = row?.userAnswer || row?.student_answer || "";
      const subject =
        row?.subject || row?.subjectId || "math";
      const response_language = profile?.response_language ?? "English";
      const grade_level = profile?.grade_level ?? "High School";
        
      // Generate cache key
      const cacheKey = generateCacheKey(
        exercise_content,
        student_answer,
        typeof subject === "string" ? subject : String(subject),
        response_language,
        grade_level
      );
      
      // Check cache first
      const cachedExplanation = explanationCache.get(cacheKey);
      if (cachedExplanation) {
        console.log('[TwoCardTeaching] Using cached explanation');
        setSections(cachedExplanation);
        return;
      }
      
      // Not in cache, start loading and make AI request
      setLoading(true);
      
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
        response_language,
        grade_level,
      }, selectedModelId, explanationTemplate);
      
      console.log('[TwoCardTeaching] Raw AI Response:', raw);
      
      // Ensure the response is in the correct language
      const rawInCorrectLanguage = await ensureLanguage(
        raw, 
        response_language,
        selectedModelId
      );
      
      console.log('[TwoCardTeaching] Language-corrected Response:', rawInCorrectLanguage);
      
      const parsed = parseTwoCardText(rawInCorrectLanguage);
      console.log("[Explain] parsed →", parsed);
      
      let finalSections: TeachingSections;
      
      // Only fallback when all three core fields are empty
      if (!parsed.concept && !parsed.example && !parsed.strategy) {
        console.log('[TwoCardTeaching] Using fallback - all core fields empty');
        finalSections = {
          exercise: t('explanation.fallback.exercise'),
          concept: t('explanation.fallback.concept'),
          example: t('explanation.fallback.example'),
          strategy: t('explanation.fallback.strategy'),
          pitfall: t('explanation.fallback.pitfall'),
          check: t('explanation.fallback.check'),
          practice: t('explanation.fallback.practice'),
        };
      } else {
        console.log('[TwoCardTeaching] Using parsed sections:', parsed);
        finalSections = parsed;
      }
      
      // Cache the successful result
      explanationCache.set(cacheKey, finalSections);
      console.log('[TwoCardTeaching] Cached explanation for future use');
      
      setSections(finalSections);
    } catch (e:any) {
      console.error('[TwoCardTeaching] Error:', e);
      setError(t('explanation.error'));
      const fallbackSections = {
        exercise: t('explanation.fallback.exercise'),
        concept: t('explanation.fallback.concept'),
        example: t('explanation.fallback.example'),
        strategy: t('explanation.fallback.strategy'),
        pitfall: t('explanation.fallback.pitfall'),
        check: t('explanation.fallback.check'),
        practice: t('explanation.fallback.practice'),
      };
      setSections(fallbackSections);
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}