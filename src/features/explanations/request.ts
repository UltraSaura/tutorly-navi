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
- Use this child-friendly flow:
  1. Quick idea / core concept.
  2. Learn it your way: learning-style support AND one guided example using DIFFERENT numbers but the SAME operation/concept.
  3. Auto-vérification / self-check: the student's own check, not the final answer.
  4. Method / how to solve it: reusable steps.
  5. Common mistake / watch out.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- Use exactly these 5 steps in this order:
  1. Quick idea / Core concept: kind "concept", icon "lightbulb".
  2. Learn it your way: kind "strategy"; icon "magnifier" for visual, "lightbulb" or "checklist" for auditory, "checklist" for kinesthetic or mixed. This step MUST include learning-style support AND one guided example with different numbers but the same operation/concept.
  3. Auto-vérification / Self-check: kind "check", icon "target". This is fallback self-check text now and will later become runtime mini-practice.
  4. Method / How to solve it: kind "strategy", icon "checklist".
  5. Common mistake / Watch out: kind "pitfall", icon "warning".
- Each step:
  • "title": 2–5 words (short label)
  • "body": 1–3 simple sentences, clear and precise
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- In the "Learn it your way" step:
  - If {{learning_style}} is visual: use a title like "See it" or "Learn it your way". Use diagrams, arrays, number lines, tables, visual grouping, labels, shape descriptions, or spatial language. Use words like look, draw, mark, group, compare, line up, circle, point to.
  - If {{learning_style}} is auditory: use a title like "Say it" or "Learn it your way". Use spoken reasoning, repeatable phrases, verbal cues, or a memory sentence. Include one sentence the child can say out loud.
  - If {{learning_style}} is kinesthetic: use a title like "Try it" or "Learn it your way". Give hands-on actions: draw, move, tap, sort, count, fold, point, build, or act it out.
  - If {{learning_style}} is mixed: title it "Learn it your way" or "Try it three ways". Include one visual hint, one verbal cue, and one action idea.
  - Include ONE guided example inside this same step. The example MUST use different numbers but the SAME operation/concept as the student's exercise.
- If student exercise is division (÷ or /), show a division example.
- If student exercise is multiplication (× or *), show a multiplication example.
- If student exercise is addition (+), show an addition example.
- If student exercise is subtraction (-), show a subtraction example.
- The self-check step should tell the student what to verify or try next without revealing the original answer.
- The method step should give reusable steps, not another full worked example.
- The common mistake step should warn about one likely trap.
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
