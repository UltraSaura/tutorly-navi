import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "@/hooks/use-toast";

export interface TeachingSections {
  exercise: string;
  concept: string;
  example: string;
  method: string;  // Renamed from strategy
  currentExercise: string;  // Full step-by-step solution with correct answer
  pitfall: string;
  check: string;
  practice: string;
  parentHelpHint: string;   // Guidance for parents
  correctAnswer?: string;   // For backwards compatibility
}

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { selectedModelId } = useAdmin();

  // Debug wrapper for setSections
  const debugSetSections = (newSections: TeachingSections | null) => {
    console.log('[useTwoCardTeaching] setSections called with:', newSections);
    console.log('[useTwoCardTeaching] Current sections state before update:', sections);
    console.log('[useTwoCardTeaching] New sections type:', typeof newSections);
    console.log('[useTwoCardTeaching] New sections keys:', newSections ? Object.keys(newSections) : 'null');
    setSections(newSections);
    // Check state after update
    setTimeout(() => {
      console.log('[useTwoCardTeaching] Sections state after update:', sections);
      console.log('[useTwoCardTeaching] Sections state type after update:', typeof sections);
    }, 100);
  };

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

IMPORTANT: Your response MUST include the correct answer in a separate field for guardian/parent review.

RESPONSE FORMAT:
{
  "isMath": true,
  "exercise": "${exercise_content}",
  "sections": {
    "concept": "Explain the core concept without revealing the answer",
    "example": "Show a complete worked example with different numbers in format: '23 + 45 = 68' (must include the equals sign and answer for interactive stepper)",
    "method": "Explain the exact steps of the example, guiding step-by-step through calculation",
    "currentExercise": "Full solution for student's exact problem with correct result",
    "pitfall": "Common mistakes to avoid",
    "check": "Explain HOW to verify without revealing the correct result",
    "practice": "Practice tips",
    "parentHelpHint": "Advice for parents to help at home"
  }
}

RULES:
1. Compute the correct answer and store it in the "currentExercise" field with full solution
2. In the teaching sections (concept, example, method), use different numbers or guide without revealing the student's answer
3. Examples should use numbers at least 5 units away from the original AND use the SAME operation type as the student's exercise
4. If student exercise is division (÷ or /), show a division example.
5. If student exercise is multiplication (× or *), show a multiplication example.
6. If student exercise is addition (+), show an addition example.
7. If student exercise is subtraction (-), show a subtraction example.
8. Method should explain the steps of the example, guiding through the calculation process
9. The currentExercise field should contain the full solution with the correct answer
10. IMPORTANT: The "example" field must be in format "number operator number = result" (e.g., "23 + 45 = 68") for interactive math stepper compatibility
11. CRITICAL: The example MUST use the EXACT SAME operation type as the student's exercise. If student has multiplication, example must be multiplication. If student has addition, example must be addition. This is mandatory for educational consistency.

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
      const correctAnswer = result.correctAnswer || null; // NEW

      // Set the sections from AI response
      const explanationSections: TeachingSections = {
        exercise: result.exercise || exercise_content,
        concept: sections.concept || 'No concept provided',
        example: sections.example || 'No example provided',
        method: sections.method || sections.strategy || 'No method provided',  // Support both new and old field names
        currentExercise: sections.currentExercise || 'No solution provided',
        pitfall: sections.pitfall || 'No common pitfalls identified',
        check: sections.check || 'No verification method provided',
        practice: sections.practice || 'Practice similar problems',
        parentHelpHint: sections.parentHelpHint || 'Encourage your child to break down the problem step by step',
        correctAnswer: correctAnswer // For backwards compatibility
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
            correct_answer: correctAnswer, // NEW
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

  return { open, setOpen, loading, sections, error, openFor, setSections: debugSetSections };
}
