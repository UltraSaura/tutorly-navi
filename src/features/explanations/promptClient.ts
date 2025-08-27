import { sendMessageToAI } from '@/services/chatService';
import { PromptTemplate } from '@/types/admin';

// Interface for the variables expected by the prompt client
interface ExplanationVariables {
  exercise_content: string;
  student_answer?: string;
  subject?: string;
  response_language?: string;
  grade_level?: string;
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
 * @param activeTemplate - The active prompt template to use (optional)
 * @param selectedModelId - The model ID to use for AI generation (default: 'gpt-4.1')
 * @returns Promise<string> - Raw text response from the AI
 */
export async function requestTwoCardTeaching(
  vars: ExplanationVariables,
  activeTemplate?: PromptTemplate | null,
  selectedModelId: string = 'gpt-4.1'
): Promise<string> {
  
  // Use active explanation template or fallback
  const fallbackTemplate = `You are a helpful math tutor. Please provide a step-by-step explanation for this exercise:

Exercise: {{exercise_content}}
${vars.student_answer ? 'Student Answer: {{student_answer}}' : ''}
Subject: {{subject}}
Grade Level: {{grade_level}}

Please provide your explanation in {{response_language}}.`;
  
  const promptTemplate = activeTemplate?.prompt_content || fallbackTemplate;
  
  // Prepare variables with defaults
  const templateVariables: ExplanationVariables = {
    exercise_content: vars.exercise_content,
    student_answer: vars.student_answer || '',
    subject: vars.subject || 'math',
    response_language: vars.response_language || 'English',
    grade_level: vars.grade_level || 'High School'
  };
  
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
  
  return data.content;
}