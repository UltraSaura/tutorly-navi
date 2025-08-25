import { Exercise } from '@/types/chat';
import { substitutePromptVariables, PromptVariables } from '../../../supabase/functions/ai-chat/utils/systemPrompts';

// Stub AI provider interface
const ai = {
  chat: async (prompt: string): Promise<string> => {
    // TODO: Replace with actual AI provider call
    console.log('AI Chat called with prompt:', prompt);
    
    // Return mock JSON response for now
    return JSON.stringify({
      steps: [
        {
          title: "Understanding the Problem",
          body: "Let's break down what we need to find in this exercise.",
          icon: "magnifier"
        },
        {
          title: "Apply the Method", 
          body: "We'll use the appropriate mathematical method to solve this step by step.",
          icon: "checklist"
        },
        {
          title: "Check Your Work",
          body: "Now verify your steps and see if you can reach the correct answer.",
          icon: "checklist"
        }
      ]
    });
  }
};

// Default Math Explanation Generator template ID
const MATH_EXPLANATION_TEMPLATE_ID = 'math-explanation-generator';

/**
 * Fetches an AI-generated explanation for an exercise
 * @param exerciseRow - The exercise data containing question, user answer, etc.
 * @param correctAnswer - The correct answer for the exercise (optional)
 * @param userContext - Additional user context like grade level, name, etc. (optional)
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
  }
): Promise<string> {
  try {
    // Build the prompt template (using the Math Explanation Generator template)
    const mathExplanationTemplate = `You are a friendly math tutor helping a {{grade_level}} student named {{first_name}} from {{country}}.

The student attempted this exercise: "{{exercise_content}}"
Their answer was: "{{student_answer}}"
The correct answer is: "{{correct_answer}}"

Generate a step-by-step explanation in {{response_language}} that helps them understand the solution.

You MUST respond with valid JSON in this exact format:
{"steps":[{"title":"Step Title (max 50 chars)","body":"Detailed explanation (max 200 chars)","icon":"magnifier|checklist|divide|lightbulb|target|warning"}]}

Requirements:
- Provide exactly 3-5 steps
- Each title must be 50 characters or less
- Each body must be 200 characters or less  
- Only use these icons: magnifier, checklist, divide, lightbulb, target, warning
- Be encouraging and age-appropriate for {{grade_level}} level
- Focus on understanding, not just the answer
- DO NOT reveal the final answer - guide students to discover it themselves

Respond ONLY with the JSON, no other text.`;

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

    // Call AI provider with the built prompt
    const response = await ai.chat(finalPrompt);

    return response;

  } catch (error) {
    console.error('Error fetching explanation:', error);
    throw new Error(`Failed to fetch explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}