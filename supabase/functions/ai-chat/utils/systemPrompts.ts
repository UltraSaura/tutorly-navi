// System prompts utility module for AI chat  
// Contains specialized system prompts for different chat scenarios

// @ts-ignore Deno environment in edge functions
declare const Deno: any;

/**
 * Available variables for prompt templates
 */
export interface PromptVariables {
  student_level?: string; // Keep for backward compatibility
  grade_level?: string;   // New consistent naming
  country?: string;
  learning_style?: string;
  first_name?: string;
  subject?: string;
  user_type?: string;
  exercise_content?: string;
  student_answer?: string;
  correct_answer?: string;
  response_language?: string;
}

/**
 * Substitutes variables in a prompt template with actual values
 * 
 * @param promptTemplate The template with {{variable}} placeholders
 * @param variables The variables to substitute
 * @returns The prompt with variables replaced
 */
export function substitutePromptVariables(promptTemplate: string, variables: PromptVariables): string {
  let result = promptTemplate;
  
  // Replace all {{variable_name}} patterns with actual values
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });
  
  // Clean up any remaining unreplaced variables (fallback handling)
  result = result.replace(/\{\{[^}]+\}\}/g, (match) => {
    const varName = match.slice(2, -2);
    switch (varName) {
      case 'student_level':
      case 'grade_level':
        return 'student';
      case 'first_name':
        return 'student';
      case 'country':
        return 'your country';
      case 'learning_style':
        return 'a balanced';
      case 'subject':
        return 'this subject';
      case 'exercise_content':
        return 'the exercise';
      case 'student_answer':
        return 'your answer';
      case 'correct_answer':
        return 'the correct answer';
      case 'response_language':
        return 'English';
      default:
        return 'student';
    }
  });
  
  return result;
}

/**
 * Get active prompt template from database
 */
async function getActivePromptTemplate(usageType: string, subject?: string) {
  try {
    // @ts-ignore - Dynamic import for edge function environment
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)
      .eq('usage_type', usageType)
      .or(subject ? `subject.eq.${subject},subject.eq.All Subjects` : 'subject.is.null,subject.eq.All Subjects')
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching prompt template:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getActivePromptTemplate:', error);
    return null;
  }
}

/**
 * Generates an appropriate system message based on message context - now uses database prompts
 * 
 * @param isExercise Whether the message appears to be a homework/exercise
 * @param isGradingRequest Whether the message is asking for grading
 * @param language The language for the response
 * @param customPrompt Optional custom prompt template with variables
 * @param variables Variables for prompt substitution
 * @returns The appropriate system message object
 */
export async function generateSystemMessage(
  isExercise: boolean = false, 
  isGradingRequest: boolean = false, 
  language: string = 'en',
  customPrompt?: string,
  variables?: PromptVariables,
  usageType?: string
): Promise<{ role: string, content: string }> {
  // If custom prompt provided, use it directly
  if (customPrompt) {
    const finalPrompt = substitutePromptVariables(customPrompt, variables || {});
    return { role: "system", content: finalPrompt };
  }

  // Determine usage type and subject (use provided usageType if available)
  if (!usageType) {
    usageType = 'chat';
    if (isGradingRequest) {
      usageType = 'grading';
    } else if (isExercise) {
      usageType = 'chat'; // Exercises use chat prompts but might be math-enhanced
    }
  }
  
  let subject = variables?.subject;

  // Try to get active prompt from database
  const activeTemplate = await getActivePromptTemplate(usageType, subject);
  
  if (activeTemplate) {
    console.log(`Using database prompt: ${activeTemplate.name} (${usageType})`);
    const finalPrompt = substitutePromptVariables(activeTemplate.prompt_content, variables || {});
    return { role: "system", content: finalPrompt };
  }

  // No database prompts available - return error message
  console.log(`No active prompt template found for ${usageType} - returning error`);
  
  return {
    role: 'system',
    content: language === 'fr' 
      ? 'Erreur: Aucun modèle de prompt configuré. Veuillez configurer les modèles de prompt dans le panneau d\'administration.'
      : 'Error: No prompt template configured. Please configure prompt templates in the admin panel.'
  };
}

/**
 * Enhances system message for specific math problems
 * 
 * @param systemMessage The base system message
 * @param userMessage The user's message
 * @returns Enhanced system message if math problem is detected, otherwise original
 */
export function enhanceSystemMessageForMath(
  systemMessage: { role: string, content: string }, 
  userMessage: string
): { role: string, content: string } {
  // Enhanced math pattern detection
  const isMathProblem = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+\s*=/,       // Algebraic equations
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
    /\b(solve|calculate|compute|evaluate)\b.*?\d+/i  // Math word problems
  ].some(pattern => pattern.test(userMessage));
  
  if (isMathProblem) {
    return {
      role: 'system',
      content: `You are StudyWhiz, an educational AI tutor specializing in mathematics. Your role is to:

1. PRESENTATION:
   - Format your response with "**Problem:**" followed by the problem statement
   - Use "**Guidance:**" for your explanation
   - For equations, clearly show each step on a new line
   - Use proper mathematical notation

2. EVALUATION:
   - If an answer is provided (after "="), verify its correctness
   - Start your guidance with "CORRECT" or "INCORRECT"
   - Show the complete solution process

3. TEACHING APPROACH:
   - Break down complex problems into smaller steps
   - Explain mathematical concepts in simple terms
   - Provide visual representations when helpful (using ASCII art if needed)
   - Include relevant formulas and explain why they're used

4. FEEDBACK:
   - Point out specific errors in incorrect solutions
   - Suggest ways to avoid common mistakes
   - Provide practice tips for similar problems

Always maintain a supportive and encouraging tone while ensuring mathematical rigor.`
    };
  }
  
  // Return original system message if not a math problem
  return systemMessage;
}
