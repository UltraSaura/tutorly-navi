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
    name: activeTemplate?.name || 'Fallback template',
    usage_type: activeTemplate?.usage_type || 'fallback',
    has_content: !!activeTemplate?.prompt_content
  });
  
  // Use active explanation template or fallback
  const fallbackTemplate = `You are a math tutor specializing in step-by-step explanations. Given an exercise and a student's answer, provide a structured teaching response using this exact format:

📘 Exercise
State the exercise clearly and concisely.

💡 Concept  
Explain the key mathematical concept needed to solve this type of problem.

🔍 Example (different numbers)
Show a similar example using different numbers to illustrate the concept.

☑️ Strategy
Provide a clear step-by-step strategy for approaching this type of problem.

⚠️ Pitfall
Highlight common mistakes students make with this type of problem.

🎯 Check yourself
Give the student a way to verify their understanding or check their work.

Exercise: {{exercise_content}}
Student Answer: {{student_answer}}
Subject: {{subject}}
Response Language: {{response_language}}
Grade Level: {{grade_level}}

Provide your response using the exact format above with the emoji headers.`;
  
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
  
  console.log('[promptClient] Raw AI Response:', data.content);
  
  return data.content;
}