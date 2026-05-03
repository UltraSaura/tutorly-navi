import { Exercise } from '@/types/chat';
import { substitutePromptVariables, PromptVariables } from '../../../supabase/functions/ai-chat/utils/systemPrompts';
import { EXPLAIN_DEBUG, MOCK_JSON } from "./debug";
import { sendMessageToAI } from '@/services/chatService';
import { PromptTemplate } from '@/types/admin';

// Default Math Explanation Generator template ID
const MATH_EXPLANATION_TEMPLATE_ID = 'math-explanation-generator';

/**
 * Fetches an AI-generated explanation for an exercise
 * @param exerciseRow - The exercise data containing question, user answer, etc.
 * @param selectedModelId - Model ID to use for AI generation (required)
 * @param userContext - Additional user context like grade level, name, etc. (optional)
 * @param teachingMode - Mode for explanation: "concept" (default) or "solution"
 * @param activeTemplate - Admin-managed prompt template to use (optional)
 * @returns Promise<string> - Raw JSON string response from AI
 */
export async function fetchExplanation(
  exerciseRow: Exercise,
  selectedModelId: string,
  userContext?: {
    gradeLevel?: string;
    language?: string;
    first_name?: string;
    country?: string;
    learning_style?: string;
  },
  teachingMode: "concept" | "solution" = "concept",
  activeTemplate?: PromptTemplate | null
): Promise<string> {
  if (EXPLAIN_DEBUG.forceMock) {
    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] Using mock data");
    }
    return MOCK_JSON;
  }

  try {
    console.log('[explanationRequest] Using model:', selectedModelId);

    // Use admin template if available, otherwise fallback
    const fallbackTemplate = `You are a patient math tutor. Your job is to TEACH the underlying mathematical concept, NOT to solve the student's exercise.

Guidelines:
- NEVER use the numbers or data from the student's exercise.
- NEVER compute or state the final result of the student's exercise.
- Always start with the universal concept explanation. The learning style changes the support method and practice format, not the academic goal.
- Do not say "Because you are a visual learner" or label the child.
- Instead:
  1. Explain the core concept (e.g. Greatest Common Divisor (GCD) or PGCD).
  2. Add one learning-style support step based on {{learning_style}}.
  3. Show ONE worked example using DIFFERENT numbers but the SAME operation type (e.g. if student has division, show division; if addition, show addition).
  4. Explain the general method (step-by-step, in text).
  5. Warn about a common mistake.
  6. End with a self-check card that tells the student what to verify.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- Use these 6 steps in this order:
  1. Core concept step: kind "concept", icon "lightbulb".
  2. Learning-style support step: kind "strategy"; icon "magnifier" for visual, "lightbulb" or "checklist" for auditory, "checklist" for kinesthetic or mixed.
  3. Worked example step: kind "example", icon "magnifier".
  4. Method/strategy step: kind "strategy", icon "checklist".
  5. Common pitfall step: kind "pitfall", icon "warning".
  6. Quick check step: kind "check", icon "target".
- Each step:
  • "title": 2–5 words (short label)
  • "body": 1–3 simple sentences, clear and precise
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- If {{learning_style}} is visual: title the support step something like "See it". Use diagrams, arrays, number lines, tables, visual grouping, labels, shape descriptions, or spatial language. Use words like look, draw, mark, group, compare, line up, circle, point to. For arithmetic, prefer arrays, number lines, place-value blocks, grouped objects, or tables. For geometry, describe a simple diagram when useful. Keep it visual and concrete.
- If {{learning_style}} is auditory: title the support step something like "Say it". Use spoken reasoning, repeatable phrases, verbal cues, or a memory sentence. Use words like say, listen, repeat, remember, tell yourself. Include one sentence the child can say out loud.
- If {{learning_style}} is kinesthetic: title the support step something like "Try it". Give hands-on actions: draw, move, tap, sort, count, fold, point, build, or act it out. Use short action steps. Connect the action back to the math concept.
- If {{learning_style}} is mixed: title the support step "Try it three ways" or "Learn it your way". Include one visual hint, one verbal cue, and one action idea.
- Example MUST use different numbers but the SAME operation type as the student's exercise.
- If student exercise is division (÷ or /), show a division example.
- If student exercise is multiplication (× or *), show a multiplication example.
- If student exercise is addition (+), show an addition example.
- If student exercise is subtraction (-), show a subtraction example.
- Do NOT output the student's numbers anywhere.
- No extra text, no markdown, no code fences.

Exercise (for context, DO NOT solve): {{exercise}}
Student answer: {{studentAnswer}}
Subject: {{subject}}
Language: {{language}}
Grade level: {{gradeLevel}}
Learning style: {{learning_style}}`;

    const promptTemplate = activeTemplate?.prompt_content || fallbackTemplate;

    // Map exercise data to template variables using the exact structure specified
    const variables: PromptVariables & {
      exercise: string;
      studentAnswer: string;
      language: string;
      gradeLevel: string;
    } = {
      exercise_content: exerciseRow.question ?? "",
      student_answer: exerciseRow.userAnswer ?? "",
      subject: "math",
      response_language: userContext?.language ?? "English",
      grade_level: userContext?.gradeLevel ?? "High School",
      first_name: userContext?.first_name || 'Student',
      country: userContext?.country || 'your country',
      learning_style: userContext?.learning_style || 'mixed',
      // Legacy variables for backward compatibility
      student_level: userContext?.gradeLevel ?? "High School",
      // New template variable mappings
      exercise: exerciseRow.question ?? "",
      studentAnswer: exerciseRow.userAnswer ?? "",
      language: userContext?.language ?? "English",
      gradeLevel: userContext?.gradeLevel ?? "High School"
    };

    // Substitute variables into the template
    const finalPrompt = substitutePromptVariables(promptTemplate, variables);

    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] prompt >>>", finalPrompt);
    }

    // Call AI provider with the built prompt using the chat service
    const { data, error } = await sendMessageToAI(
      finalPrompt,
      [], // No message history for explanations
      selectedModelId,
      userContext?.language || 'en'
    );

    if (error) {
      throw new Error(`AI service error: ${error.message}`);
    }

    const text = data?.content || "";

    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] raw >>>", text);
    }

    return text;

  } catch (error) {
    console.error('Error fetching explanation:', error);
    throw new Error(`Failed to fetch explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
