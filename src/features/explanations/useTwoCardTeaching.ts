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

      // Build the explanation request message with STRONG emphasis on operation type
      const explanationMessage = `🚨 CRITICAL REQUIREMENT - OPERATION TYPE 🚨

DETECTED OPERATION IN STUDENT'S EXERCISE: ${operationInfo.type}
OPERATION SYMBOL IN STUDENT'S EXERCISE: "${operationInfo.symbol}"

YOU MUST USE THE EXACT SAME OPERATION IN YOUR EXAMPLE.
- If the exercise has "${operationInfo.symbol}", your example MUST have "${operationInfo.symbol}"
- NO EXCEPTIONS. NO SUBSTITUTIONS.
- DO NOT change ${operationInfo.type} to a different operation type.

❌ WRONG EXAMPLES (DO NOT DO THIS):
- Student has: 2 × 3 = ?
- Your example: 4 + 4 = 8  ← WRONG! This is addition, not multiplication!

✅ CORRECT EXAMPLE:
- Student has: 2 × 3 = ?
- Your example: 4 × 5 = 20  ← CORRECT! Same operation type!

---

🚨 CRITICAL REQUIREMENT - METHOD FIELD 🚨

The "method" field is MANDATORY and must contain 2-4 sentences explaining HOW to solve the example step-by-step.

✅ GOOD METHOD EXAMPLE:
"First, identify the two numbers to multiply: 4 and 5. Then, you can think of it as 4 groups of 5, which makes 20. Write the answer: 4 × 5 = 20."

❌ DO NOT return empty method field
❌ DO NOT return "No method provided"
❌ DO NOT skip the method field

---

NOW EXPLAIN THIS ${subject} EXERCISE:

Exercise: ${exercise_content}
Student's answer: ${student_answer}
Grade level: ${grade_level}

RESPONSE FORMAT (JSON):
{
  "isMath": true,
  "exercise": "${exercise_content}",
  "sections": {
    "concept": "Explain the core concept (2-3 sentences)",
    "example": "MUST be: [number] ${operationInfo.symbol} [number] = [result] with complete calculation",
    "method": "MANDATORY: 2-4 sentences explaining step-by-step how to solve the example",
    "currentExercise": "Full solution for student's exact problem: ${exercise_content} with correct result",
    "pitfall": "Common mistakes to avoid with this operation",
    "check": "How to verify the answer",
    "practice": "Practice tips",
    "parentHelpHint": "Guidance for parents"
  }
}

VALIDATION CHECKLIST (CONFIRM BEFORE RESPONDING):
☑ Does my example use "${operationInfo.symbol}"? (operation: ${operationInfo.type})
☑ Is the method field filled with 2-4 sentences?
☑ Does the example show a complete calculation with = and result?
☑ Are the example numbers different from the student's exercise?

Please respond in ${response_language}.`;

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
      const correctAnswer = result.correctAnswer || null;

      // VALIDATION: Check operation type in example
      const studentOp = detectOperationType(exercise_content);
      const exampleOp = detectOperationType(sections.example || '');
      
      if (studentOp.type !== 'unknown' && exampleOp.type !== studentOp.type) {
        console.error(`❌ AI USED WRONG OPERATION!`);
        console.error(`   Expected: ${studentOp.type} (${studentOp.symbol})`);
        console.error(`   Got: ${exampleOp.type} (${exampleOp.symbol})`);
        console.error(`   Student exercise: ${exercise_content}`);
        console.error(`   AI example: ${sections.example}`);
      }

      // VALIDATION: Check method field
      const methodContent = sections.method || sections.strategy || '';
      if (!methodContent || methodContent.trim().length < 20 || methodContent === 'No method provided') {
        console.error(`❌ AI RETURNED INSUFFICIENT METHOD CONTENT!`);
        console.error(`   Method length: ${methodContent.length} characters`);
        console.error(`   Method content: "${methodContent}"`);
      }

      // Set the sections from AI response with improved fallback
      const explanationSections: TeachingSections = {
        exercise: result.exercise || exercise_content,
        concept: sections.concept || 'No concept provided',
        example: sections.example || 'No example provided',
        method: (methodContent && methodContent.trim() && methodContent !== 'No method provided') 
          ? methodContent 
          : `Break down the calculation step by step. Look at each number in ${sections.example || 'the problem'}, perform the operation, and verify your result.`,
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
