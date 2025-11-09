import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "@/hooks/use-toast";

/**
 * Detect the operation type from a math exercise
 */
function detectOperationType(exercise: string): { type: string; symbol: string } {
  const cleanEx = exercise.trim();
  
  if (cleanEx.includes('×') || cleanEx.includes('*')) {
    return { type: 'multiplication', symbol: cleanEx.includes('×') ? '×' : '*' };
  }
  if (cleanEx.includes('÷') || cleanEx.includes('/')) {
    return { type: 'division', symbol: cleanEx.includes('÷') ? '÷' : '/' };
  }
  if (cleanEx.includes('+')) {
    return { type: 'addition', symbol: '+' };
  }
  if (cleanEx.includes('-')) {
    return { type: 'subtraction', symbol: '-' };
  }
  
  return { type: 'unknown', symbol: '' };
}

function parseOpAndOperands(text: string): { symbol: string; a: string; b: string } | null {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/(-?\d+(?:[.,]\d+)?)(?:\s*)([×*÷\/+\-])(?:\s*)(-?\d+(?:[.,]\d+)?)/);
  if (m) {
    return { a: m[1], symbol: m[2], b: m[3] };
  }
  return null;
}

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

      // Detect the operation type from the exercise
      const operationInfo = detectOperationType(exercise_content);
      console.log('[TwoCardTeaching] Detected operation:', operationInfo);

      // Build the exercise message (NOT a prompt - just the exercise)
      const exerciseMessage = `${exercise_content}${student_answer ? `\nStudent's answer: ${student_answer}` : ''}`;

      // Build context for variable substitution in the database prompt
      const explanationContext = {
        exercise_content: exercise_content,
        student_answer: student_answer || 'Not provided',
        correct_answer: '', // Don't provide, let AI guide discovery
        first_name: 'Student',
        grade_level: grade_level,
        country: 'your country',
        learning_style: 'balanced',
        subject: subject,
        user_type: 'student',
        response_language: response_language
      };

      console.log('[TwoCardTeaching] Using unified database prompt with context:', explanationContext);

      console.log('[TwoCardTeaching] Sending explanation request to AI using database prompt');

      // Call AI with unified database prompt
      const { data, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: exerciseMessage,
          modelId: selectedModelId || 'gpt-5',
          isUnified: true,
          requestExplanation: true,
          language: response_language.toLowerCase(),
          userContext: explanationContext
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
      const correctAnswer = result.correctAnswer || null;

      // VALIDATION LOGGING: Track what the AI returned
      const studentOp = detectOperationType(exercise_content);
      const exampleOp = detectOperationType(sections.example || '');
      
      if (studentOp.type !== 'unknown' && exampleOp.type !== studentOp.type) {
        console.warn(`⚠️ Operation mismatch - Expected: ${studentOp.type}, Got: ${exampleOp.type}`);
        console.warn('Database prompt may need refinement');
      }

      const exerciseParts = parseOpAndOperands(exercise_content);
      const exampleParts = parseOpAndOperands(sections.example || '');
      
      if (
        exerciseParts && exampleParts &&
        exerciseParts.a === exampleParts.a &&
        exerciseParts.b === exampleParts.b
      ) {
        console.warn('⚠️ Example uses same numbers as exercise - prompt needs refinement');
      }

      // Set the sections from AI response (trust the database prompt)
      const explanationSections: TeachingSections = {
        exercise: result.exercise || exercise_content,
        concept: sections.concept || 'No concept provided',
        example: sections.example || 'No example provided',
        method: sections.method || sections.strategy || 'No method provided',
        currentExercise: sections.currentExercise || 'No solution provided',
        pitfall: sections.pitfall || 'No common pitfalls identified',
        check: sections.check || 'No verification method provided',
        practice: sections.practice || 'Practice similar problems',
        parentHelpHint: sections.parentHelpHint || 'Encourage your child to break down the problem step by step',
        correctAnswer: correctAnswer
      };

      console.log('[TwoCardTeaching] ✓ Explanation sections generated:', explanationSections);
      console.log('[TwoCardTeaching] ✓ Method field length:', explanationSections.method.length);
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
