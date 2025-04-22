// Utility functions for AI chat

// Helper function to detect if a message is likely an exercise or homework problem
export function detectExercise(message: string): boolean {
  const exerciseKeywords = ['solve', 'calculate', 'find', 'homework', 'exercise', 'problem', 'question', 'assignment'];
  const lowerMessage = message.toLowerCase();
  
  // Add detection for mathematical patterns
  const mathPattern = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(message);
  
  return exerciseKeywords.some(keyword => lowerMessage.includes(keyword)) || mathPattern;
}

// Helper function to get model configuration based on modelId
export function getModelConfig(modelId: string) {
  const modelMap: Record<string, { provider: string; model: string }> = {
    'gpt4o': { provider: 'OpenAI', model: 'gpt-4o' },
    'gemini-pro': { provider: 'Google', model: 'gemini-pro' },
    'claude-3': { provider: 'Anthropic', model: 'claude-3-opus-20240229' },
    'mistral-large': { provider: 'Mistral AI', model: 'mistral-large-latest' },
    'deepseek-coder': { provider: 'DeepSeek', model: 'deepseek-coder' },
    'deepseek-chat': { provider: 'DeepSeek', model: 'deepseek-chat' },
    'grok-1': { provider: 'xAI', model: 'grok-1' },
    'grok-2': { provider: 'xAI', model: 'grok-2' },
    'chat': { provider: 'OpenAI', model: 'gpt-3.5-turbo' },
    // Default to GPT-3.5 Turbo
    'default': { provider: 'OpenAI', model: 'gpt-3.5-turbo' }
  };
  
  return modelMap[modelId] || modelMap.default;
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

// Enhanced math pattern detection
export function isMathProblem(message: string): boolean {
  const mathPatterns = [
    /\d+\s*[\+\-\*\/]\s*\d+/,                    // Basic arithmetic
    /[0-9x]+\s*[\+\-\*\/]\s*[0-9x]+\s*=/,       // Algebraic equations
    /\d+\/\d+/,                                  // Fractions
    /\d+\s*%/,                                   // Percentages
    /sqrt|cos|sin|tan|log|exp/,                  // Mathematical functions
    /\([0-9x\+\-\*\/]+\)/,                      // Parentheses expressions
    /\b(solve|calculate|compute|evaluate)\b.*?\d+/i  // Math word problems
  ];
  
  return mathPatterns.some(pattern => pattern.test(message));
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
