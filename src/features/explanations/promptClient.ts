import { sendMessageToAI } from '@/services/chatService';
import { PromptTemplate } from '@/types/admin';
import { normalizeExerciseForPrompt } from '@/utils/exerciseNormalization';

// Interface for the variables expected by the prompt client
interface ExplanationVariables {
  exercise_content: string;
  exercise_normalized?: string;
  student_answer?: string;
  subject?: string;
  response_language?: string;
  grade_level?: string;
  mode?: string;
  reveal_final_answer?: string;
}

// Simple variable substitution function for prompt templates
function substitutePromptVariables(template: string, variables: ExplanationVariables): string {
  let result = template;
  
  // Replace all variable placeholders with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  
  // Clean up any remaining placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

/**
 * Requests a two-card teaching explanation using the explanation prompt system
 * @param vars - Variables for the explanation including exercise content, student answer, etc.
 * @param selectedModelId - The model ID to use for AI generation (required)
 * @param activeTemplate - The active prompt template to use (optional)
 * @returns Promise<string> - Raw text response from the AI
 */
export async function requestTwoCardTeaching(
  vars: ExplanationVariables,
  selectedModelId: string,
  activeTemplate?: PromptTemplate | null
): Promise<string> {
  
  console.log('[promptClient] Template Info:', {
    name: activeTemplate?.name || 'No template',
    usage_type: activeTemplate?.usage_type || 'fallback',
    has_content: !!activeTemplate?.prompt_content
  });
  
  // Require an active template - no fallback
  if (!activeTemplate?.prompt_content) {
    throw new Error('No active explanation template found. Please configure a prompt template in the admin panel.');
  }
  
  const promptTemplate = activeTemplate.prompt_content;
  
  console.log("[Explain] vars →", {
    exercise_content: vars.exercise_content,
    student_answer: vars.student_answer,
    subject: vars.subject,
    response_language: vars.response_language,
    grade_level: vars.grade_level,
  });

  // Prepare variables with defaults
  const templateVariables: ExplanationVariables = {
    exercise_content: vars.exercise_content,
    exercise_normalized: vars.exercise_normalized || normalizeExerciseForPrompt(vars.exercise_content),
    student_answer: vars.student_answer || '',
    subject: vars.subject || 'math',
    response_language: vars.response_language || 'English',
    grade_level: vars.grade_level || 'High School',
    mode: vars.mode || 'explain',
    reveal_final_answer: vars.reveal_final_answer || 'false'
  };
  
  // Defensive check - ensure exercise_content is not empty
  if (!vars.exercise_content?.trim()) {
    console.warn('[promptClient] Warning: exercise_content is empty or undefined:', vars.exercise_content);
  }
  
  console.log('[promptClient] Template variables:', templateVariables);
  
  // Substitute variables into the template
  const finalPrompt = substitutePromptVariables(promptTemplate, templateVariables);
  
  // Call the AI service
  const { data, error } = await sendMessageToAI(
    finalPrompt,
    [], // No message history for explanations
    selectedModelId,
    vars.response_language || 'en'
  );
  
  if (error) {
    console.error('Error in explanation prompt client:', error);
    throw new Error(`Failed to get explanation: ${error.message || 'Unknown error'}`);
  }
  
  if (!data?.content) {
    throw new Error('No content received from AI service');
  }
  
  console.log('[promptClient] Raw AI Response:', data.content);
  
  return data.content;
}