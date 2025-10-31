
// Utility functions for AI chat

// Helper function to detect if a message is likely an exercise or homework problem
export function detectExercise(message: string): boolean {
  // Written number constants
  const ENGLISH_NUMBERS = 'zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand';
  const FRENCH_NUMBERS = 'zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|soixante-dix|quatre-vingts|quatre-vingt-dix|cent|mille';
  
  // Operation word constants
  const ENGLISH_OPERATIONS = 'times|multiplied\\s+by|plus|added\\s+to|minus|subtract|subtracted\\s+from|divided\\s+by|equals?|is|makes|gives';
  const FRENCH_OPERATIONS = 'fois|multiplié\\s+par|plus|ajouté\\s+à|moins|soustrait|soustrait\\s+de|divisé\\s+par|égal|égale|font|est|fait|donne';
  
  const exerciseKeywords = ['solve', 'calculate', 'find', 'homework', 'exercise', 'problem', 'question', 'assignment', 'résoudre', 'calculer', 'trouver', 'devoir', 'exercice', 'problème'];
  const lowerMessage = message.toLowerCase();
  
  // Check for keyword-based detection first
  const hasKeywords = exerciseKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Enhanced math pattern detection (includes expressions with and without equals)
  const mathPatterns = [
    // Digit-based patterns
    /\d+\s*[\+\-\*\/•]\s*\d+\s*=/,                    // Equations with equals
    /\d+\s*[\+\-\*\/•]\s*\d+(?!\s*=)/,                // Expressions without equals (like "2+2")
    /\d+\/\d+/,                                        // Fractions
    /\d+\s*\^\s*\d+/,                                  // Exponents
    /[a-zA-Z]+\s*\^\s*\d+/,                           // Variable exponents (x^2)
    /\d+[²³⁴⁵⁶⁷⁸⁹⁰¹]/,                             // Unicode superscripts
    /sqrt|cos|sin|tan|log|ln|exp/,                     // Mathematical functions
    /√\s*\(?\s*[0-9a-zA-Z]+/,                         // Unicode square root
    
    // Written-out math patterns - English (with spaces)
    new RegExp(`\\b(${ENGLISH_NUMBERS})\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})\\s*(${ENGLISH_OPERATIONS})?\\s*(${ENGLISH_NUMBERS}|\\d+)?\\b`, 'i'),
    new RegExp(`\\b(${ENGLISH_NUMBERS})\\s*[+\\-*/=]\\s*(${ENGLISH_NUMBERS}|\\d+)\\b`, 'i'), // Mixed format: "two + 3"
    new RegExp(`\\b\\d+\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})\\b`, 'i'), // "5 times two"
    
    // Written-out math patterns - English (concatenated without spaces)
    new RegExp(`\\b(${ENGLISH_NUMBERS})(times|plus|minus|dividedby)(${ENGLISH_NUMBERS})\\b`, 'i'), // "fourtimestwo"
    new RegExp(`\\b(${ENGLISH_NUMBERS})(times|plus|minus|dividedby)(${ENGLISH_NUMBERS})\\s*=\\s*(${ENGLISH_NUMBERS}|\\d+)\\b`, 'i'), // "fourtimestwo = five"
    
    // Written-out math patterns - French (with spaces)
    new RegExp(`\\b(${FRENCH_NUMBERS})\\s+(${FRENCH_OPERATIONS})\\s+(${FRENCH_NUMBERS})\\s*(${FRENCH_OPERATIONS})?\\s*(${FRENCH_NUMBERS}|\\d+)?\\b`, 'i'),
    new RegExp(`\\b(${FRENCH_NUMBERS})\\s*[+\\-*/=]\\s*(${FRENCH_NUMBERS}|\\d+)\\b`, 'i'), // Mixed format: "deux + 3"
    new RegExp(`\\b\\d+\\s+(${FRENCH_OPERATIONS})\\s+(${FRENCH_NUMBERS})\\b`, 'i'), // "5 fois deux"
    
    // Written-out math patterns - French (concatenated without spaces)
    new RegExp(`\\b(${FRENCH_NUMBERS})(fois|plus|moins|divisepar)(${FRENCH_NUMBERS})\\b`, 'i'), // "quatrefoiscinq"
    new RegExp(`\\b(${FRENCH_NUMBERS})(fois|plus|moins|divisepar)(${FRENCH_NUMBERS})\\s*=\\s*(${FRENCH_NUMBERS}|\\d+)\\b`, 'i'), // "quatrefoiscinq = vingt"
    
    // Question patterns
    /what\s+is\s+.*(plus|times|minus|divided)/i,       // "what is two plus three"
    /combien\s+font\s+.*(plus|fois|moins|divisé)/i,    // "combien font deux plus trois"
    /how\s+much\s+is\s+.*(plus|times|minus|divided)/i  // "how much is five times two"
  ];
  
  const hasMathPattern = mathPatterns.some(pattern => pattern.test(message));
  
  // Check for written math words as additional indicators
  const mathWords = ['plus', 'minus', 'times', 'divided', 'equals', 'is', 'makes', 'gives', 'fois', 'moins', 'divisé', 'égal', 'égale', 'font', 'est'];
  const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  
  const hasWrittenMath = mathWords.some(word => lowerMessage.includes(word)) && 
                        numberWords.some(num => lowerMessage.includes(num));
  
  return hasKeywords || hasMathPattern || hasWrittenMath;
}

// Helper function to get model configuration based on modelId
export function getModelConfig(modelId: string) {
  const modelMap: Record<string, { provider: string; model: string }> = {
    // Latest OpenAI models
    'gpt-5': { provider: 'OpenAI', model: 'gpt-5-2025-08-07' },
    'gpt-5-mini': { provider: 'OpenAI', model: 'gpt-5-mini-2025-08-07' },
    'gpt-5-nano': { provider: 'OpenAI', model: 'gpt-5-nano-2025-08-07' },
    'gpt-4.1': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' },
    'gpt-4.1-mini': { provider: 'OpenAI', model: 'gpt-4.1-mini-2025-04-14' },
    'o3': { provider: 'OpenAI', model: 'o3-2025-04-16' },
    'o4-mini': { provider: 'OpenAI', model: 'o4-mini-2025-04-16' },
    // Legacy OpenAI models
    'gpt4o': { provider: 'OpenAI', model: 'gpt-4o' },
    'gpt-4o-mini': { provider: 'OpenAI', model: 'gpt-4o-mini' },
    'chat': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' },
    // Other providers
    'gemini-pro': { provider: 'Google', model: 'gemini-pro' },
    'claude-3': { provider: 'Anthropic', model: 'claude-3-opus-20240229' },
    'claude-sonnet-4': { provider: 'Anthropic', model: 'claude-sonnet-4-20250514' },
    'claude-opus-4': { provider: 'Anthropic', model: 'claude-opus-4-20250514' },
    'claude-haiku-3.5': { provider: 'Anthropic', model: 'claude-3-5-haiku-20241022' },
    'mistral-large': { provider: 'Mistral AI', model: 'mistral-large-latest' },
    'deepseek-coder': { provider: 'DeepSeek', model: 'deepseek-coder' },
    'deepseek-chat': { provider: 'DeepSeek', model: 'deepseek-chat' },
    'grok-1': { provider: 'xAI', model: 'grok-1' },
    'grok-2': { provider: 'xAI', model: 'grok-2' },
    // Default to latest GPT-4.1
    'default': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' }
  };
  
  return modelMap[modelId];
}

// Helper function to get API key for a provider
export function getApiKeyForProvider(provider: string): string | null {
  const keys: Record<string, string | undefined> = {
    'OpenAI': Deno.env.get('OPENAI_API_KEY'),
    'Anthropic': Deno.env.get('ANTHROPIC_API_KEY'),
    'Mistral AI': Deno.env.get('MISTRAL_API_KEY'),
    'Google': Deno.env.get('GOOGLE_API_KEY'),
    'DeepSeek': Deno.env.get('DEEPSEEK_API_KEY'),
    'xAI': Deno.env.get('XAI_API_KEY')
  };
  
  return keys[provider] || null;
}

// Helper function to format history messages based on provider
export function formatHistoryForProvider(history: any[], provider: string) {
  // For now, most providers use the same format as OpenAI
  // But this function allows for customization per provider
  switch (provider) {
    case 'Anthropic':
      // Anthropic uses a different format
      return history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    default:
      // Default OpenAI-like format
      return history;
  }
}

// Helper function to format system message based on provider
export function formatSystemMessageForProvider(systemMessage: any, provider: string) {
  // Some providers handle system messages differently
  switch (provider) {
    case 'Anthropic':
      // Anthropic doesn't use system messages in the same way
      return {
        role: 'user',
        content: `${systemMessage.content}\n\nPlease remember these instructions for our conversation.`
      };
    default:
      // Default OpenAI-like format
      return systemMessage;
  }
}
