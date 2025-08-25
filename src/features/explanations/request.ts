import { Exercise } from '@/types/chat';
import { substitutePromptVariables, PromptVariables } from '../../../supabase/functions/ai-chat/utils/systemPrompts';
import { EXPLAIN_DEBUG, MOCK_JSON } from "./debug";

// Stub AI provider interface
const ai = {
  chat: async (prompt: string): Promise<string> => {
    // TODO: Replace with actual AI provider call
    console.log('AI Chat called with prompt:', prompt);
    
    // Return mock JSON response for now
    return MOCK_JSON;
  }
};

// Default Math Explanation Generator template ID
const MATH_EXPLANATION_TEMPLATE_ID = 'math-explanation-generator';

/**
 * Fetches an AI-generated explanation for an exercise
 * @param exerciseRow - The exercise data containing question, user answer, etc.
 * @param correctAnswer - The correct answer for the exercise (optional)
 * @param userContext - Additional user context like grade level, name, etc. (optional)
 * @param teachingMode - Mode for explanation: "concept" (default) or "solution"
 * @returns Promise<string> - Raw JSON string response from AI
 */
export async function fetchExplanation(
  exerciseRow: Exercise,
  correctAnswer?: string,
  userContext?: {
    grade_level?: string;
    first_name?: string;
    country?: string;
    response_language?: string;
  },
  teachingMode: "concept" | "solution" = "concept"
): Promise<string> {
  if (EXPLAIN_DEBUG.forceMock) {
    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] Using mock data");
    }
    return MOCK_JSON;
  }

  try {
    // Build the prompt template (using the Math Explanation Generator template)
    const mathExplanationTemplate = `You are a patient math tutor. Your job is to TEACH the underlying mathematical concept, NOT to solve the student's exercise.

Guidelines:
- NEVER use the numbers or data from the student's exercise.
- NEVER compute or state the final result of the student's exercise.
- Instead:
  1. Explain the core concept (e.g. Greatest Common Divisor (GCD) or PGCD).
  2. Show ONE worked example using DIFFERENT numbers (or symbols like a/b).
  3. Explain the general method (step-by-step, in text).
  4. Optionally warn about a common mistake.
  5. End with a self-check card that tells the student what to verify.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- 3–5 steps maximum.
- Each step:
  • "title": 2–5 words (short label)
  • "body": 1–3 simple sentences, clear and precise
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- Example MUST use different numbers (e.g. 18/24 instead of the student's fraction) or algebraic symbols (like a/b).
- Do NOT output the student's numbers anywhere.
- No extra text, no markdown, no code fences.

Exercise (for context, DO NOT solve): {{exercise}}
Student answer: {{studentAnswer}}
Subject: {{subject}}
Language: {{language}}
Grade level: {{gradeLevel}}`;

    // Map exercise data to template variables
    const variables: PromptVariables & {
      exercise: string;
      studentAnswer: string;
      language: string;
      gradeLevel: string;
    } = {
      exercise_content: exerciseRow.question,
      student_answer: exerciseRow.userAnswer,
      correct_answer: correctAnswer || 'Not provided',
      grade_level: userContext?.grade_level || 'middle school',
      first_name: userContext?.first_name || 'Student',
      country: userContext?.country || 'your country',
      response_language: userContext?.response_language || 'English',
      // Legacy variables for backward compatibility
      student_level: userContext?.grade_level || 'middle school',
      subject: 'Mathematics',
      // New template variable mappings
      exercise: exerciseRow.question,
      studentAnswer: exerciseRow.userAnswer,
      language: userContext?.response_language || 'English',
      gradeLevel: userContext?.grade_level || 'middle school'
    };

    // Substitute variables into the template
    const finalPrompt = substitutePromptVariables(mathExplanationTemplate, variables);

    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] prompt >>>", finalPrompt);
    }

    // Call AI provider with the built prompt
    const response = await ai.chat(finalPrompt);
    const text = response || "";

    if (EXPLAIN_DEBUG.enableConsole) {
      console.log("[Explain] raw >>>", text);
    }

    return text;

  } catch (error) {
    console.error('Error fetching explanation:', error);
    throw new Error(`Failed to fetch explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}