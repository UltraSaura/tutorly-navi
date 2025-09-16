import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { useAdmin } from "@/context/AdminContext";
import { useLanguage } from "@/context/LanguageContext";
import { ensureLanguage } from "@/lib/ensureLanguage";
import { ExerciseCanonicalizer } from "@/services/exerciseCanonicalizer";
import { supabase } from "@/integrations/supabase/client";

// In-memory cache for storing explanations within the session
const sessionCache = new Map<string, TeachingSections>();

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { getActiveTemplate } = usePromptManagement();
  const { selectedModelId } = useAdmin();
  const { t } = useLanguage();

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    console.log('[TwoCardTeaching] Opening explanation for:', { row, profile });
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

      // Create canonicalized version and cache key
      const canonical = ExerciseCanonicalizer.canonicalize(exercise_content, subject);
      const cacheKey = ExerciseCanonicalizer.createCacheKey(
        exercise_content,
        typeof subject === "string" ? subject : String(subject),
        response_language,
        grade_level
      );
      
      // Check session cache first
      const sessionCachedExplanation = sessionCache.get(cacheKey);
      if (sessionCachedExplanation) {
        console.log('[TwoCardTeaching] Using session cached explanation');
        setSections(sessionCachedExplanation);
        return;
      }

      // Check database cache
      const { data: cachedExplanation, error: cacheError } = await supabase
        .from('exercise_explanations_cache')
        .select('explanation_data, usage_count')
        .eq('exercise_hash', canonical.hash)
        .maybeSingle();

      if (!cacheError && cachedExplanation) {
        console.log('[TwoCardTeaching] Using database cached explanation');
        
        // Update usage count
        await supabase
          .from('exercise_explanations_cache')
          .update({ 
            usage_count: cachedExplanation.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('exercise_hash', canonical.hash);

        const explanation = cachedExplanation.explanation_data as TeachingSections;
        sessionCache.set(cacheKey, explanation);
        setSections(explanation);
        return;
      }
      
      // Not in cache, start loading and make AI request
      setLoading(true);
      
      let explanationTemplate = getActiveTemplate('explanation');
      
      console.log("[Explain] template →", { name: explanationTemplate?.name, usage: explanationTemplate?.usage_type, id: explanationTemplate?.id });
      
      // Built-in fallback template if no active template is found
      if (!explanationTemplate) {
        console.log('[TwoCardTeaching] No active template found, using built-in fallback');
        explanationTemplate = {
          id: 'fallback',
          name: 'Built-in Fallback',
          subject: 'math',
          description: 'Built-in fallback explanation template',
          usage_type: 'explanation',
          prompt_content: `You are an expert tutor. The student answered "{{student_answer}}" to the question "{{exercise_content}}" in {{subject}}.

Please provide a clear educational explanation with these EXACT sections and emojis:

📘 Exercise
{{exercise_content}}

💡 Concept
Explain the key concept needed to solve this problem.

🔍 Example
Show a similar example with different numbers.

☑️ Strategy
Explain the step-by-step approach to solve this type of problem.

⚠️ Pitfall
Common mistakes students make with this type of problem.

🎯 Check yourself
How to verify the answer is correct.

📈 Practice Tip
Suggestion for improving at this type of problem.

Write all content in {{response_language}}. Keep the section headers in English with emojis exactly as shown above. Return plain text only.`,
          tags: ['fallback', 'explanation'],
          is_active: true,
          priority: 0,
          auto_activate: false,
          created_at: new Date(),
          updated_at: new Date()
        };
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
      
      // Cache the successful result in session cache
      sessionCache.set(cacheKey, finalSections);
      
      // Save to database cache
      try {
        await supabase.from('exercise_explanations_cache').insert({
          exercise_hash: canonical.hash,
          exercise_content: canonical.normalizedContent,
          subject_id: typeof subject === "string" ? subject : String(subject),
          explanation_data: finalSections,
          quality_score: 0,
          usage_count: 1
        });
        console.log('[TwoCardTeaching] Saved explanation to database cache');
      } catch (dbError) {
        console.warn('[TwoCardTeaching] Failed to save to database cache:', dbError);
        // Don't fail the whole operation if caching fails
      }
      
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