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

      // Parse tool calling response
      if (data?.tool_calls?.[0]?.function?.arguments) {
        const result = JSON.parse(data.tool_calls[0].function.arguments);
        
        if (!result.isMath) {
          throw new Error('This does not appear to be a math problem');
        }

        // Set the sections from AI response
        const explanationSections: TeachingSections = {
          exercise: result.exercise || exercise_content,
          concept: result.sections.concept || 'No concept provided',
          example: result.sections.example || 'No example provided',
          strategy: result.sections.strategy || 'No strategy provided',
          pitfall: result.sections.pitfall || 'No common pitfalls identified',
          check: result.sections.check || 'No verification method provided',
          practice: result.sections.practice || 'Practice similar problems'
        };

        console.log('[TwoCardTeaching] Explanation sections generated:', explanationSections);
        setSections(explanationSections);
        
      } else {
        console.error('[TwoCardTeaching] No tool calls in response');
        throw new Error('Invalid response format from AI');
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
