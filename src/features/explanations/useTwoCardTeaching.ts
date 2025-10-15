import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "@/hooks/use-toast";

export interface TeachingSections {
  exercise: string;
  concept: string;
  example: string;
  strategy: string;
  pitfall: string;
  check: string;
  practice: string;
}

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { selectedModelId } = useAdmin();

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    console.log('[TwoCardTeaching] Opening explanation for:', { row, profile });
    setOpen(true);
    setError(null);
    setLoading(true);
    
    try {
      // Extract exercise details
      const exercise_content = row?.prompt || row?.question || row?.exercise_content || "";
      const student_answer = row?.userAnswer || row?.student_answer || "";
      const subject = row?.subject || row?.subjectId || "math";
      const response_language = profile?.response_language ?? "English";
      const grade_level = profile?.grade_level ?? "High School";

      // Build the explanation request message
      const explanationMessage = `Please explain this ${subject} exercise to help the student learn.

Exercise: ${exercise_content}
Student's answer: ${student_answer}
Grade level: ${grade_level}

CRITICAL RULES for your explanation:
1. NEVER reveal the final answer to the student's exercise
2. In examples, use DIFFERENT number magnitudes (if original is single digits 1-9, use double digits 10-99; if original is double digits, use single digits)
3. Example numbers should be at least 5 units away from original numbers
4. Examples MUST end with = ___ (never show the result)
5. Strategy should guide toward solution without giving the answer
6. Use "your result" or "___" instead of actual answers

Please provide your response in ${response_language}.`;

      console.log('[TwoCardTeaching] Sending explanation request to AI');

      // Call AI with tool calling for structured output
      const { data, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: explanationMessage,
          modelId: selectedModelId || 'gpt-5',
          requestExplanation: true,
          language: response_language.toLowerCase(),
        }
      });

      if (aiError) {
        console.error('[TwoCardTeaching] AI service error:', aiError);
        throw new Error('Failed to generate explanation');
      }

      console.log('[TwoCardTeaching] AI response received:', data);

      let result: any = null;

      // Try parsing tool calling response first
      if (data?.tool_calls?.[0]?.function?.arguments) {
        console.log('[TwoCardTeaching] Parsing from tool_calls');
        result = JSON.parse(data.tool_calls[0].function.arguments);
      } 
      // Fallback: parse from content (handles plain JSON strings or fenced blocks)
      else if (data?.content) {
        console.log('[TwoCardTeaching] Parsing from content');
        const rawContent = data.content;
        
        try {
          // Try to extract JSON from fenced code block: ```json ... ```
          const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
          let jsonStr = '';
          
          if (fenceMatch) {
            jsonStr = fenceMatch[1].trim();
          } else {
            // Fallback: extract between first "{" and last "}"
            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              jsonStr = rawContent.substring(firstBrace, lastBrace + 1);
            } else {
              // Try parsing the whole content as JSON
              jsonStr = rawContent;
            }
          }
          
          result = JSON.parse(jsonStr);
          console.log('[TwoCardTeaching] Successfully parsed JSON from content');
        } catch (parseError) {
          console.error('[TwoCardTeaching] Failed to parse JSON from content:', parseError);
          console.error('[TwoCardTeaching] Raw content:', rawContent);
          throw new Error('The AI returned an unexpected format. Please try again.');
        }
      } else {
        console.error('[TwoCardTeaching] No tool calls or content in response');
        throw new Error('Invalid response format from AI');
      }

      // Validate and extract sections (allow missing isMath flag)
      if (result.isMath === false) {
        throw new Error('This does not appear to be a math problem');
      }

      const sections = result.sections || {};

      // Set the sections from AI response
      const explanationSections: TeachingSections = {
        exercise: result.exercise || exercise_content,
        concept: sections.concept || 'No concept provided',
        example: sections.example || 'No example provided',
        strategy: sections.strategy || 'No strategy provided',
        pitfall: sections.pitfall || 'No common pitfalls identified',
        check: sections.check || 'No verification method provided',
        practice: sections.practice || 'Practice similar problems'
      };

      console.log('[TwoCardTeaching] Explanation sections generated:', explanationSections);
      setSections(explanationSections);

      // Save explanation to cache for guardian visibility
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('No authenticated user');

        // Create explanation cache entry
        const { data: cacheEntry, error: cacheError } = await supabase
          .from('exercise_explanations_cache')
          .insert([{
            exercise_content: exercise_content,
            exercise_hash: exercise_content.toLowerCase().replace(/\s+/g, ''),
            subject_id: subject.toLowerCase(),
            explanation_data: explanationSections as any,
            quality_score: 0,
            usage_count: 1
          }])
          .select('id')
          .single();

        if (cacheError) {
          console.error('[TwoCardTeaching] Failed to save to cache:', cacheError);
        } else {
          console.log('[TwoCardTeaching] Explanation saved to cache:', cacheEntry.id);
        }
      } catch (err) {
        console.error('[TwoCardTeaching] Error saving explanation:', err);
      }

      setLoading(false);
      
    } catch (err) {
      console.error('[TwoCardTeaching] Error generating explanation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      
      toast({
        title: "Error",
        description: "Failed to generate explanation. Please try again.",
        variant: "destructive"
      });
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}
