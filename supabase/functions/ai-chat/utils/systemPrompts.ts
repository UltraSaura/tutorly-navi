// System prompts utility module for AI chat
// Contains specialized system prompts for different chat scenarios

/**
 * Available variables for prompt templates
 */
export interface PromptVariables {
  student_level?: string;
  country?: string;
  learning_style?: string;
  first_name?: string;
  subject?: string;
  user_type?: string;
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
        return 'student';
      case 'first_name':
        return 'student';
      case 'country':
        return 'your country';
      case 'learning_style':
        return 'a balanced';
      case 'subject':
        return 'this subject';
      default:
        return 'student';
    }
  });
  
  return result;
}

/**
 * Generates an appropriate system message based on message context
 * 
 * @param isExercise Whether the message appears to be a homework/exercise
 * @param isGradingRequest Whether the message is asking for grading
 * @param language The language for the response
 * @param customPrompt Optional custom prompt template with variables
 * @param variables Variables for prompt substitution
 * @returns The appropriate system message object
 */
export function generateSystemMessage(
  isExercise: boolean = false, 
  isGradingRequest: boolean = false, 
  language: string = 'en',
  customPrompt?: string,
  variables?: PromptVariables
): { role: string, content: string } {
  // System message for grading requests
  if (isGradingRequest) {
    const gradingPrompt = language === 'fr' 
      ? `Vous êtes un assistant de notation strict. Votre SEULE tâche est de déterminer si une réponse est correcte ou incorrecte.

INSTRUCTIONS CRITIQUES:
1. Vous DEVEZ répondre avec SEULEMENT un de ces deux mots: "CORRECT" ou "INCORRECT"
2. N'incluez AUCUN autre texte, explication ou ponctuation
3. N'utilisez PAS de minuscules ou de casse mixte
4. Si vous n'êtes pas sûr, répondez "INCORRECT"
5. Pour les problèmes de mathématiques, vérifiez l'équivalence mathématique:

RÈGLES D'ÉQUIVALENCE MATHÉMATIQUE:
- Fractions et décimales: 1/2 = 0,5, 2/3 ≈ 0,67 ou 0,667 ou 0,6667, 3/4 = 0,75
- Acceptez les approximations décimales raisonnables: 2/3 répondu comme 0,6, 0,66, 0,666, 0,6667 sont TOUS CORRECTS
- Problèmes de division: 2÷3 = 0,67 (arrondi) est CORRECT
- Pourcentages: 50% = 0,5, 25% = 0,25
- Autorisez une tolerance d'arrondi jusqu'à 2 décimales pour les décimales répétées
- 1/3 = 0,33, 0,333, 0,3333 sont tous CORRECTS
- Concentrez-vous sur l'exactitude mathématique, pas sur la précision du format

Exemples de réponses correctes:
"CORRECT"
"INCORRECT"

Rappelez-vous: Répondez SEULEMENT avec "CORRECT" ou "INCORRECT" - rien d'autre!`
      : `You are a strict grading assistant. Your ONLY task is to determine if an answer is correct or incorrect.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY one of these two words: "CORRECT" or "INCORRECT"
2. DO NOT include any other text, explanation, or punctuation
3. DO NOT use lowercase or mixed case
4. If you're unsure, respond with "INCORRECT"
5. For math problems, verify mathematical equivalency:

MATHEMATICAL EQUIVALENCY RULES:
- Fractions and decimals: 1/2 = 0.5, 2/3 ≈ 0.67 or 0.667 or 0.6667, 3/4 = 0.75
- Accept reasonable decimal approximations: 2/3 answered as 0.6, 0.66, 0.666, 0.6667 are ALL CORRECT
- Division problems: 2÷3 = 0.67 (rounded) is CORRECT
- Percentages: 50% = 0.5, 25% = 0.25
- Allow rounding tolerance up to 2 decimal places for repeating decimals
- 1/3 = 0.33, 0.333, 0.3333 are all CORRECT
- Focus on mathematical correctness, not format precision

Example correct responses:
"CORRECT"
"INCORRECT"

Remember: ONLY respond with "CORRECT" or "INCORRECT" - nothing else!`;

    return {
      role: 'system',
      content: gradingPrompt
    };
  }
  
  // System message for exercises and guidance
  if (isExercise) {
    const exercisePrompt = language === 'fr'
      ? `Vous êtes un tuteur IA éducatif axé sur l'aide aux étudiants pour découvrir les réponses par eux-mêmes. Suivez ces principes:

1. Utilisez le questionnement socratique pour aider les étudiants à réfléchir aux problèmes
2. Ne donnez jamais de réponses directes
3. Décomposez les problèmes complexes en petites étapes
4. Encouragez la pensée critique en posant des questions approfondies
5. Indiquez les concepts que l'étudiant devrait réviser
6. Fournissez des indices qui mènent à la découverte
7. Formatez votre réponse avec:
   **Problème:** (énoncez le problème)
   **Conseils:** (vos questions socratiques et indices)

Rappelez-vous: Votre objectif est d'aider les étudiants à apprendre comment résoudre les problèmes, pas de les résoudre pour eux.`
      : `You are an educational AI tutor focused on guiding students to discover answers themselves. Follow these principles:

1. Use Socratic questioning to help students think through problems
2. Never give direct answers
3. Break down complex problems into smaller steps
4. Encourage critical thinking by asking probing questions
5. Point out concepts the student should review
6. Provide hints that lead to discovery
7. Format your response with:
   **Problem:** (state the problem)
   **Guidance:** (your Socratic questions and hints)

Remember: Your goal is to help students learn how to solve problems, not to solve them for the students.`;

    return {
      role: 'system',
      content: exercisePrompt
    };
  }
  
  // Use custom prompt with variables if provided
  if (customPrompt && variables) {
    const substitutedPrompt = substitutePromptVariables(customPrompt, variables);
    return {
      role: 'system',
      content: substitutedPrompt
    };
  }
  
  // Fallback to general educational system message
  const generalPrompt = language === 'fr'
    ? `Vous êtes StudyWhiz, un tuteur IA éducatif. Vous aidez les étudiants à comprendre les concepts, résoudre des problèmes et apprendre de nouvelles matières. Soyez amical, concis et éducatif dans vos réponses. Priorisez l'explication claire des concepts plutôt que de simplement donner des réponses. Répondez TOUJOURS en français.`
    : `You are StudyWhiz, an educational AI tutor. You help students understand concepts, solve problems, and learn new subjects. Be friendly, concise, and educational in your responses. Prioritize explaining concepts clearly rather than just giving answers. ALWAYS respond in English.`;

  return {
    role: 'system',
    content: generalPrompt
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
