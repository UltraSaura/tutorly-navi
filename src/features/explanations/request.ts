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
    const mathExplanationTemplate = `You are a helpful and patient math tutor for students from elementary to high school level.
Teach the underlying concept clearly using simple language and a similar example, but do NOT solve the student's exact problem.

Return ONLY minified JSON exactly like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules:
- 3–5 steps maximum.
- Each step:
  • "title": 2–5 words
  • "body": 1–3 simple sentences, grade-appropriate
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- Do NOT compute or state the final numeric/algebraic answer to the student's exercise.
- If you show an example, use DIFFERENT numbers or a generic symbolic example, and you may solve THAT example fully.
- Prefer this flow:
  1) concept           (icon=lightbulb)
  2) similar example   (icon=magnifier or divide)
  3) strategy/steps    (icon=checklist)
  4) common pitfall    (icon=warning)    [optional]
  5) check yourself    (icon=target but NO final answer; make it a checklist/question)
- No extra text, no markdown, no code fences.

Exercise: {{exercise_content}}
Student answer: {{student_answer}}
Subject: {{subject}}
Language: {{response_language}}
Grade level: {{grade_level}}`;

    // Map exercise data to template variables
    const variables: PromptVariables = {
      exercise_content: exerciseRow.question,
      student_answer: exerciseRow.userAnswer,
      correct_answer: correctAnswer || 'Not provided',
      grade_level: userContext?.grade_level || 'middle school',
      first_name: userContext?.first_name || 'Student',
      country: userContext?.country || 'your country',
      response_language: userContext?.response_language || 'English',
      // Legacy variables for backward compatibility
      student_level: userContext?.grade_level || 'middle school',
      subject: 'Mathematics'
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